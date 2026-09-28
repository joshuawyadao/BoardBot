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

export type Action =
  | { readonly type: 'move'; readonly destination: LocationId }
  | { readonly type: 'wait' }

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
  if (state.phase === 'complete' || state.actionsRemaining === 0) return 'The sample turn is complete.'

  if (action.type === 'wait') return null
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

/** Invalid and repeated commands return the original state without spending an action. */
export function submitAction(state: GameState, action: Action, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision || getActionReason(state, action) !== null) return state

  const nextRevision = state.revision + 1
  const destination = action.type === 'move' ? action.destination : state.location
  const event =
    action.type === 'move'
      ? `Moved from ${state.location} to ${action.destination}.`
      : `Waited at ${state.location}.`

  return {
    ...state,
    phase: 'resolving',
    actionsRemaining: state.actionsRemaining - 1,
    location: destination,
    revision: nextRevision,
    pending: { id: nextRevision, action },
    history: [...state.history, event],
  }
}

/** The matching resolution alone unlocks the next action. */
export function finishResolution(state: GameState, id: number): GameState {
  if (state.phase !== 'resolving' || state.pending?.id !== id) return state
  return {
    ...state,
    phase: state.actionsRemaining === 0 ? 'complete' : 'ready',
    pending: null,
    revision: state.revision + 1,
  }
}
