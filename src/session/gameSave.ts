import { MAX_SAVE_LENGTH, validateLocalGameData } from '../data/localGameData.ts';
export { MAX_SAVE_LENGTH, validateLocalGameData } from '../data/localGameData.ts';
import type { GameData } from '../data/gameData';
import { createFighterGame, dispatchGame } from '../engine/horrifiedGame';
import type { FighterGame, GameCommand } from '../engine/horrifiedRuntime';

export const SAVE_VERSION = 1;
export const ENGINE_VERSION = 'solo-1';
const MAX_COMMANDS = 5000;
export interface SavedGame { data: GameData; game: FighterGame }

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value).filter(([, entry]) => entry !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The save contains an invalid object.');
  return value as Record<string, unknown>;
}

/** Private, local data travels with the save; no executable continuation is trusted on load. */
export function encodeGameSave(data: GameData, game: FighterGame): string {
  if (game.commands.length > MAX_COMMANDS) throw new Error('This game exceeds the supported save history size. Export a backup before continuing.');
  const payload = JSON.stringify({ format: 'boardbot-local-game', saveVersion: SAVE_VERSION, engineVersion: ENGINE_VERSION, data, state: game });
  if (new TextEncoder().encode(payload).byteLength > MAX_SAVE_LENGTH) throw new Error('This game exceeds the supported save size.');
  return payload;
}

/** Rebuild through the real command boundary, then compare every field including hidden state. */
export async function decodeGameSave(payload: string): Promise<SavedGame> {
  if (typeof payload !== 'string' || new TextEncoder().encode(payload).byteLength > MAX_SAVE_LENGTH) throw new Error('The save is too large or is not text.');
  try {
    const envelope = record(JSON.parse(payload));
    if (envelope.format !== 'boardbot-local-game' || envelope.saveVersion !== SAVE_VERSION || envelope.engineVersion !== ENGINE_VERSION) {
      throw new Error('This save uses an unsupported format or engine version.');
    }
    const saved = record(envelope.state), hero = record(saved.hero);
    if (typeof saved.seed !== 'number' || typeof hero.definitionId !== 'string' || !Array.isArray(saved.commands) || saved.commands.length > MAX_COMMANDS) {
      throw new Error('The save has invalid setup or command history.');
    }
    const data = validateLocalGameData(envelope.data);
    let game = await createFighterGame(data, saved.seed, hero.definitionId);
    for (const input of saved.commands) {
      const command = record(input);
      if (typeof command.id !== 'string' || !Number.isSafeInteger(command.revision) || typeof command.actorSeatId !== 'string') {
        throw new Error('The save has an invalid command.');
      }
      record(command.action);
      const result = dispatchGame(data, game, command as unknown as GameCommand);
      if (result.error) throw new Error(`The saved history is invalid: ${result.error}`);
      game = result.state;
    }
    if (canonical(game) !== canonical(saved)) throw new Error('The saved state does not match its committed history or game data.');
    return { data, game };
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError) {
      throw new Error('The save is malformed or incompatible. Your current game has not been replaced.');
    }
    throw error;
  }
}
