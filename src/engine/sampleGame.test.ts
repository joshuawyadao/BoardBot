import { describe, expect, it } from 'vitest'
import {
  createGame,
  finishResolution,
  getActionReason,
  submitAction,
  type Action,
} from './sampleGame'

describe('sample action engine', () => {
  it('rejects unconnected moves without changing the state', () => {
    const start = createGame()
    const action: Action = { type: 'move', destination: 'ruins' }

    expect(getActionReason(start, action)).toBe('Choose a connected location.')
    expect(submitAction(start, action, start.revision)).toBe(start)
    expect(start.actionsRemaining).toBe(3)
  })

  it('commits a legal action once and ignores stale, duplicate, and mismatched commands', () => {
    const start = createGame()
    const action: Action = { type: 'move', destination: 'crossroads' }
    const resolving = submitAction(start, action, start.revision)

    expect(resolving).not.toBe(start)
    expect(resolving).toMatchObject({
      phase: 'resolving',
      actionsRemaining: 2,
      location: 'crossroads',
      revision: 1,
      pending: { id: 1, action },
    })
    expect(resolving.history).toEqual(['Moved from camp to crossroads.'])
    expect(start).toMatchObject({ actionsRemaining: 3, location: 'camp', revision: 0, history: [] })
    expect(submitAction(resolving, action, start.revision)).toBe(resolving)
    expect(submitAction(resolving, { type: 'wait' }, resolving.revision)).toBe(resolving)
    expect(finishResolution(resolving, 999)).toBe(resolving)

    const ready = finishResolution(resolving, resolving.pending!.id)
    expect(ready).toMatchObject({ phase: 'ready', actionsRemaining: 2, pending: null, revision: 2 })
    expect(finishResolution(ready, resolving.pending!.id)).toBe(ready)
    expect(submitAction(ready, { type: 'wait' }, 1)).toBe(ready)
  })

  it('finishes the sample turn after three confirmed actions', () => {
    let state = createGame()
    for (const action of [
      { type: 'wait' },
      { type: 'move', destination: 'crossroads' },
      { type: 'move', destination: 'lookout' },
    ] as const) {
      state = submitAction(state, action, state.revision)
      expect(state.phase).toBe('resolving')
      state = finishResolution(state, state.pending!.id)
    }

    expect(state).toMatchObject({
      phase: 'complete',
      actionsRemaining: 0,
      actionAllowance: 3,
      location: 'lookout',
      history: ['Waited at camp.', 'Moved from camp to crossroads.', 'Moved from crossroads to lookout.'],
    })
    expect(submitAction(state, { type: 'wait' }, state.revision)).toBe(state)
  })
})
