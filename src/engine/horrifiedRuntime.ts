import type { GameData } from '../data/gameData';
import type { D20Result, ResponseWindow } from './decisionPolicies';
import type { HorrifiedState, MonsterId } from './horrifiedState';

/** Serializable continuation; kinds are dispatched by the engine, never executable input. */
export interface Task {
  kind: string;
  entity?: string;
  target?: string;
  to?: string;
  source?: string;
  monster?: MonsterId;
  count?: number;
  amount?: number;
  result?: number;
  modifier?: number;
  item?: string;
  cell?: string;
  card?: string;
  pool?: string[];
  selected?: string[];
  after?: Task[];
  reason?: string;
  mode?: 'move' | 'place';
  attackId?: number;
  damageId?: number;
  symbol?: string;
  index?: number;
  dice?: number;
  movement?: number;
  optional?: boolean;
}
export interface ChoiceOption { id: string; label: string }
export interface PendingChoice {
  id: string; title: string; options: ChoiceOption[]; min: number; max: number; resume: Task;
}
export interface PendingRoll {
  result: D20Result; reason: string; continuation: Task; reward: boolean; window: ResponseWindow;
}
export interface AttackState {
  id: number; monster: MonsterId; target: string; hits: number; powers: number; cancelled: boolean;
  faces: ('hit' | 'power' | 'blank')[];
}
export interface FighterGame extends HorrifiedState {
  taskSerial: number;
  queue: Task[];
  pending: PendingChoice | null;
  roll: PendingRoll | null;
  attack: AttackState | null;
  damageOutcomes: Record<number, 'survived' | 'defeated' | 'skipped'>;
  currentCard: string | null;
  noMoveThisTurn: boolean;
  commandIds: string[];
  commands: GameCommand[];
  rolls: { reason: string; result: D20Result; turn: number }[];
}
export type HeroAction =
  | { kind: 'move'; destination: string; escorts: string[] }
  | { kind: 'guide'; citizen: string; destination: string }
  | { kind: 'pick-up'; items: string[] }
  | { kind: 'advance'; monster: MonsterId; item: string; cell?: string }
  | { kind: 'defeat'; monster: MonsterId; items: string[] }
  | { kind: 'reveal'; items: string[] }
  | { kind: 'special' }
  | { kind: 'perk'; perk: string }
  | { kind: 'end-phase' }
  | { kind: 'choose'; choiceId: string; selected: string[] };
export interface GameCommand {
  id: string; revision: number; actorSeatId: string; action: HeroAction;
}
export interface EngineContext {
  data: GameData;
  state: FighterGame;
  prepend(...tasks: Task[]): void;
  ask(title: string, options: ChoiceOption[], min: number, max: number, resume: Task): void;
  log(message: string, kind?: 'action' | 'phase' | 'effect' | 'roll' | 'end'): void;
  name(entity: string): string;
  location(entity: string): string | null;
  /** Immediate placement/movement; caller handles escort choices through relocate tasks. */
  place(entity: string, destination: string, escorts?: string[]): void;
  rollD20(reason: string, continuation: Task, modifier?: number): void;
  changeTerror(amount: number): void;
  discardItems(ids: string[]): void;
  drawPerk(): void;
}
