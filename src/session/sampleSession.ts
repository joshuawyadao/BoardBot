import { createGame, finishResolution, submitAction } from '../engine/sampleGame'
import type { Action, GameState } from '../engine/sampleGame'

export interface SessionEntry {
  readonly id: string
  readonly turn: number
  readonly kind: 'start' | 'action'
  readonly message: string
}

export interface SampleSession {
  readonly game: GameState
  readonly entries: readonly SessionEntry[]
  readonly turnNumber: number
}

export type SessionCommand =
  | { readonly type: 'confirm'; readonly action: Action; readonly revision: number }
  | { readonly type: 'finish'; readonly id: number }
  | { readonly type: 'restart' }

const startMessage = 'Practice explorer is at Camp.'

export function createSession(): SampleSession {
  return {
    game: createGame(),
    entries: [{ id: 'entry-1', turn: 1, kind: 'start', message: startMessage }],
    turnNumber: 1,
  }
}

function appendEntry(
  session: SampleSession,
  entry: Omit<SessionEntry, 'id'>,
): readonly SessionEntry[] {
  return [...session.entries, { ...entry, id: `entry-${session.entries.length + 1}` }]
}

export function reduceSession(session: SampleSession, command: SessionCommand): SampleSession {
  switch (command.type) {
    case 'confirm': {
      const game = submitAction(session.game, command.action, command.revision)
      if (game === session.game) return session
      return {
        ...session,
        game,
        entries: appendEntry(session, {
          turn: session.turnNumber,
          kind: 'action',
          message: game.history[game.history.length - 1],
        }),
      }
    }
    case 'finish': {
      const game = finishResolution(session.game, command.id)
      return game === session.game ? session : { ...session, game }
    }
    case 'restart': {
      if (session.game.phase !== 'complete') return session
      const turnNumber = session.turnNumber + 1
      return {
        game: { ...createGame(), revision: session.game.revision + 1 },
        entries: appendEntry(session, { turn: turnNumber, kind: 'start', message: startMessage }),
        turnNumber,
      }
    }
  }
}
