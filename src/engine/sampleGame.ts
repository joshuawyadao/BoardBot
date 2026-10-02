/** A small, invented game used to exercise the action flow. No licensed game rules. */
export type LocationId = 'camp' | 'crossroads' | 'lookout' | 'ruins'

export const locations: readonly {
  readonly id: LocationId
  readonly name: string
  readonly x: number
  readonly y: number
}[] = [
  { id: 'camp', name: 'Camp', x: 18, y: 58 },
  { id: 'crossroads', name: 'Crossroads', x: 47, y: 53 },
  { id: 'lookout', name: 'Lookout', x: 77, y: 25 },
  { id: 'ruins', name: 'Ruins', x: 79, y: 77 },
]

export const connections: readonly (readonly [LocationId, LocationId])[] = [
  ['camp', 'crossroads'],
  ['crossroads', 'lookout'],
  ['crossroads', 'ruins'],
  ['lookout', 'ruins'],
]

export type Action = { readonly type: 'move'; readonly destination: LocationId }

export interface GameState {
  readonly phase: 'ready' | 'resolving' | 'complete'
  readonly actionsRemaining: number
  readonly actionAllowance: number
  readonly location: LocationId
  readonly revision: number
  readonly pending: { readonly id: number; readonly action: Action } | null
  readonly history: readonly string[]
}

export function createGame(): GameState {
  return {
    phase: 'ready',
    actionsRemaining: 3,
    actionAllowance: 3,
    location: 'camp',
    revision: 0,
    pending: null,
    history: [],
  }
}

export function getActionReason(state: GameState, action: Action): string | null {
  if (state.phase === 'resolving') return 'Finish the current action first.'
  if (state.phase === 'complete') return 'The sample Hero Phase has ended.'
  if (state.actionsRemaining === 0) return 'No actions remain. End the Hero Phase when ready.'

  if (action.type !== 'move') return 'Unknown action.'

  if (!locations.some(({ id }) => id === action.destination)) return 'Unknown destination.'
  if (action.destination === state.location) return 'You are already there.'
  const adjacent = connections.some(
    ([from, to]) =>
      (from === state.location && to === action.destination) ||
      (to === state.location && from === action.destination),
  )
  return adjacent ? null : 'Choose a connected location.'
}

export function getEndPhaseReason(state: GameState): string | null {
  if (state.phase === 'resolving') return 'Finish the current action first.'
  if (state.phase === 'complete') return 'The sample Hero Phase has already ended.'
  return null
}

/** End the synthetic Hero Phase explicitly, with or without actions remaining. */
export function endHeroPhase(state: GameState, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision || getEndPhaseReason(state) !== null) return state
  return {
    ...state,
    phase: 'complete',
    actionsRemaining: 0,
    revision: state.revision + 1,
    history: [...state.history, 'Ended the sample Hero Phase.'],
  }
}

/** Invalid and repeated commands return the original state without spending an action. */
export function submitAction(state: GameState, action: Action, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision || getActionReason(state, action) !== null) return state

  const nextRevision = state.revision + 1
  return {
    ...state,
    phase: 'resolving',
    actionsRemaining: state.actionsRemaining - 1,
    location: action.destination,
    revision: nextRevision,
    pending: { id: nextRevision, action },
    history: [...state.history, `Moved from ${state.location} to ${action.destination}.`],
  }
}

/** The matching resolution alone unlocks the next action. */
export function finishResolution(state: GameState, id: number): GameState {
  if (state.phase !== 'resolving' || state.pending?.id !== id) return state
  return {
    ...state,
    phase: 'ready',
    pending: null,
    revision: state.revision + 1,
  }
}
