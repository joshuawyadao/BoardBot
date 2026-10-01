import { describe, expect, it } from 'vitest'
import {
  createGame,
  endHeroPhase,
  finishResolution,
  getActionReason,
  getEndPhaseReason,
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
    expect(submitAction(resolving, { type: 'move', destination: 'lookout' }, resolving.revision)).toBe(resolving)
    expect(finishResolution(resolving, 999)).toBe(resolving)

    const ready = finishResolution(resolving, resolving.pending!.id)
    expect(ready).toMatchObject({ phase: 'ready', actionsRemaining: 2, pending: null, revision: 2 })
    expect(finishResolution(ready, resolving.pending!.id)).toBe(ready)
    expect(submitAction(ready, { type: 'move', destination: 'lookout' }, 1)).toBe(ready)
  })

  it('rejects a malformed Wait command at runtime', () => {
    const start = createGame()
    const wait = { type: 'wait' } as unknown as Action
    expect(getActionReason(start, wait)).toBe('Unknown action.')
    expect(submitAction(start, wait, start.revision)).toBe(start)
    expect(start.history).toEqual([])
  })

  it('keeps the Hero Phase ready at zero actions until explicitly ended', () => {
    let state = createGame()
    for (const action of [
      { type: 'move', destination: 'crossroads' },
      { type: 'move', destination: 'lookout' },
      { type: 'move', destination: 'ruins' },
    ] as const) {
      state = submitAction(state, action, state.revision)
      expect(state.phase).toBe('resolving')
      state = finishResolution(state, state.pending!.id)
    }

    expect(state).toMatchObject({
      phase: 'ready',
      actionsRemaining: 0,
      actionAllowance: 3,
      location: 'ruins',
      history: ['Moved from camp to crossroads.', 'Moved from crossroads to lookout.', 'Moved from lookout to ruins.'],
    })
    expect(getActionReason(state, { type: 'move', destination: 'lookout' })).toBe('No actions remain. End the Hero Phase when ready.')
    expect(submitAction(state, { type: 'move', destination: 'lookout' }, state.revision)).toBe(state)
    expect(getEndPhaseReason(state)).toBeNull()

    const complete = endHeroPhase(state, state.revision)
    expect(complete).toMatchObject({
      phase: 'complete',
      actionsRemaining: 0,
      revision: state.revision + 1,
    })
    expect(complete.history.at(-1)).toBe('Ended the sample Hero Phase.')
    expect(endHeroPhase(complete, complete.revision)).toBe(complete)
    expect(submitAction(complete, { type: 'move', destination: 'lookout' }, complete.revision)).toBe(complete)
  })

  it('allows ending early but rejects stale or resolving end commands', () => {
    const start = createGame()
    expect(endHeroPhase(start, -1)).toBe(start)

    const resolving = submitAction(start, { type: 'move', destination: 'crossroads' }, start.revision)
    expect(getEndPhaseReason(resolving)).toBe('Finish the current action first.')
    expect(endHeroPhase(resolving, resolving.revision)).toBe(resolving)

    const ready = finishResolution(resolving, resolving.pending!.id)
    expect(endHeroPhase(ready, start.revision)).toBe(ready)
    const complete = endHeroPhase(ready, ready.revision)
    expect(complete).toMatchObject({ phase: 'complete', actionsRemaining: 0 })
    expect(complete.history).toEqual(['Moved from camp to crossroads.', 'Ended the sample Hero Phase.'])
    expect(getEndPhaseReason(complete)).toBe('The sample Hero Phase has already ended.')
    expect(endHeroPhase(complete, ready.revision)).toBe(complete)
  })
})
