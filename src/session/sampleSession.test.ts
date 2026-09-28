import { describe, expect, it } from 'vitest'
import { createSession, reduceSession } from './sampleSession'
import type { SampleSession } from './sampleSession'
import type { Action } from '../engine/sampleGame'

function completeAction(session: SampleSession, action: Action): SampleSession {
  const resolving = reduceSession(session, {
    type: 'confirm', action, revision: session.game.revision,
  })
  expect(resolving.game.phase).toBe('resolving')
  return reduceSession(resolving, { type: 'finish', id: resolving.game.pending!.id })
}

describe('sample session log', () => {
  it('retains ordered entries across completed sample turns while game history resets', () => {
    let session = createSession()
    expect(session.entries).toEqual([
      { id: 'entry-1', turn: 1, kind: 'start', message: 'Practice explorer is at Camp.' },
    ])

    session = completeAction(session, { type: 'move', destination: 'crossroads' })
    session = completeAction(session, { type: 'wait' })
    session = completeAction(session, { type: 'move', destination: 'lookout' })
    expect(session.game.phase).toBe('complete')
    expect(session.entries.map(({ id }) => id)).toEqual(['entry-1', 'entry-2', 'entry-3', 'entry-4'])

    session = reduceSession(session, { type: 'restart' })
    expect(session.turnNumber).toBe(2)
    expect(session.game.history).toEqual([])
    expect(session.entries.map(({ turn, kind, message }) => ({ turn, kind, message }))).toEqual([
      { turn: 1, kind: 'start', message: 'Practice explorer is at Camp.' },
      { turn: 1, kind: 'action', message: 'Moved from camp to crossroads.' },
      { turn: 1, kind: 'action', message: 'Waited at crossroads.' },
      { turn: 1, kind: 'action', message: 'Moved from crossroads to lookout.' },
      { turn: 2, kind: 'start', message: 'Practice explorer is at Camp.' },
    ])

    session = completeAction(session, { type: 'wait' })
    expect(session.entries.map(({ id }) => id)).toEqual([
      'entry-1', 'entry-2', 'entry-3', 'entry-4', 'entry-5', 'entry-6',
    ])
    expect(session.entries.at(-1)).toMatchObject({ turn: 2, kind: 'action', message: 'Waited at camp.' })
  })

  it('does not log or spend actions for invalid, stale, duplicate, or premature commands', () => {
    const initial = createSession()
    expect(reduceSession(initial, { type: 'restart' })).toBe(initial)
    expect(reduceSession(initial, {
      type: 'confirm', action: { type: 'move', destination: 'ruins' }, revision: 0,
    })).toBe(initial)

    const resolving = reduceSession(initial, {
      type: 'confirm', action: { type: 'wait' }, revision: 0,
    })
    expect(resolving.game.actionsRemaining).toBe(2)
    expect(resolving.entries).toHaveLength(2)
    expect(reduceSession(resolving, { type: 'confirm', action: { type: 'wait' }, revision: 0 })).toBe(resolving)
    expect(reduceSession(resolving, { type: 'confirm', action: { type: 'wait' }, revision: 1 })).toBe(resolving)
    expect(reduceSession(resolving, { type: 'finish', id: 999 })).toBe(resolving)
    expect(reduceSession(resolving, { type: 'restart' })).toBe(resolving)

    const ready = reduceSession(resolving, { type: 'finish', id: resolving.game.pending!.id })
    expect(ready.entries).toBe(resolving.entries)
    expect(reduceSession(ready, { type: 'finish', id: resolving.game.pending!.id })).toBe(ready)
    expect(reduceSession(ready, { type: 'confirm', action: { type: 'wait' }, revision: 0 })).toBe(ready)
    expect(ready.game.actionsRemaining).toBe(2)
    expect(ready.entries).toHaveLength(2)
  })

  it('keeps revisions distinct so commands from a prior turn cannot affect a later turn', () => {
    let session = createSession()
    const oldRevision = session.game.revision
    session = completeAction(session, { type: 'wait' })
    const oldResolutionId = session.game.revision - 1
    session = completeAction(session, { type: 'wait' })
    session = completeAction(session, { type: 'wait' })
    const previousTurnRevision = session.game.revision

    session = reduceSession(session, { type: 'restart' })
    expect(session.game.revision).toBeGreaterThan(previousTurnRevision)
    expect(reduceSession(session, {
      type: 'confirm', action: { type: 'wait' }, revision: oldRevision,
    })).toBe(session)

    const resolving = reduceSession(session, {
      type: 'confirm', action: { type: 'wait' }, revision: session.game.revision,
    })
    expect(resolving.game.phase).toBe('resolving')
    expect(resolving.game.actionsRemaining).toBe(2)
    expect(reduceSession(resolving, { type: 'finish', id: oldResolutionId })).toBe(resolving)
    const ready = reduceSession(resolving, { type: 'finish', id: resolving.game.pending!.id })
    expect(ready.game.phase).toBe('ready')
    expect(ready.entries.at(-1)).toMatchObject({ turn: 2, kind: 'action' })
  })
})
