import { describe, expect, it } from 'vitest'
import {
  RULESET_VERSION,
  closeResponseWindow,
  createResponseWindow,
  getOfferedResponse,
  passResponse,
  refreshResponseWindow,
  resolveD20,
  selectResponse,
  type ResponseOption,
} from './decisionPolicies'

const setup = { eventId: 'attack-7', orderedSeatIds: ['a', 'b', 'c'], activeSeatId: 'b' } as const
const options: readonly ResponseOption[] = [
  { id: 'block-a', ownerSeatId: 'a' },
  { id: 'dodge-b', ownerSeatId: 'b' },
  { id: 'shield-c', ownerSeatId: 'c' },
]

describe('d20 interpretation', () => {
  it('preserves overflow arithmetic while capping only its rule result', () => {
    expect(RULESET_VERSION).toBe('boardbot-dnd-2026-10-02-v4')
    expect(resolveD20(19, [2])).toEqual({
      base: 19, modifiers: [2], adjustedTotal: 21, effectiveResult: 20,
    })
    expect(resolveD20(1, [-4])).toMatchObject({ adjustedTotal: -3, effectiveResult: 1 })
    for (const base of [18, 19, 20]) {
      expect(resolveD20(base, [2]).effectiveResult).toBe(20)
    }
  })

  it('copies the modifier record and rejects invalid or unsafe arithmetic', () => {
    const modifiers = [2]
    const result = resolveD20(18, modifiers)
    modifiers[0] = -5
    expect(result.modifiers).toEqual([2])
    for (const base of [0, 21, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => resolveD20(base, [])).toThrow(RangeError)
    }
    for (const modifier of [0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER]) {
      expect(() => resolveD20(20, [modifier])).toThrow(RangeError)
    }
  })
})

describe('optional response window', () => {
  it('closes immediately with no eligible seat and skips irrelevant owners', () => {
    const closed = createResponseWindow(setup, [])
    expect(closed.closed).toBe(true)
    expect(getOfferedResponse(closed, options)).toBeNull()

    const window = createResponseWindow(setup, [{ id: 'block-a', ownerSeatId: 'a' }])
    expect(getOfferedResponse(window, [{ id: 'ignored', ownerSeatId: 'stranger' }, { id: 'block-a', ownerSeatId: 'a' }]))
      .toMatchObject({ ownerSeatId: 'a' })
  })

  it('offers active first, skips passed seats, and closes after the last pass', () => {
    const start = createResponseWindow(setup, options)
    expect(getOfferedResponse(start, options)?.ownerSeatId).toBe('b')
    const bPassed = passResponse(start, { eventId: setup.eventId, seatId: 'b', actorSeatId: 'b', revision: 0 }, options)
    expect(getOfferedResponse(bPassed, options)?.ownerSeatId).toBe('c')
    const cPassed = passResponse(bPassed, { eventId: setup.eventId, seatId: 'c', actorSeatId: 'c', revision: 1 }, options)
    expect(getOfferedResponse(cPassed, options)?.ownerSeatId).toBe('a')
    const done = passResponse(cPassed, { eventId: setup.eventId, seatId: 'a', actorSeatId: 'a', revision: 2 }, options)
    expect(done).toMatchObject({ closed: true, revision: 3, passedSeatIds: ['b', 'c', 'a'] })
    expect(passResponse(done, { eventId: setup.eventId, seatId: 'a', actorSeatId: 'a', revision: 3 }, options)).toBe(done)
  })

  it('restarts priority after a response and uses the refreshed legal set', () => {
    const start = createResponseWindow(setup, options)
    const afterBPass = passResponse(start, { eventId: setup.eventId, seatId: 'b', actorSeatId: 'b', revision: 0 }, options)
    const afterCResponse = selectResponse(
      afterBPass,
      { eventId: setup.eventId, seatId: 'c', actorSeatId: 'c', revision: 1, optionId: 'shield-c' },
      options,
      () => [{ id: 'new-b', ownerSeatId: 'b' }, { id: 'block-a', ownerSeatId: 'a' }],
    )
    expect(afterCResponse).toMatchObject({ revision: 2, passedSeatIds: [], closed: false })
    expect(getOfferedResponse(afterCResponse, [{ id: 'new-b', ownerSeatId: 'b' }])?.ownerSeatId).toBe('b')

    const noRemainingResponse = selectResponse(
      afterCResponse,
      { eventId: setup.eventId, seatId: 'b', actorSeatId: 'b', revision: 2, optionId: 'new-b' },
      [{ id: 'new-b', ownerSeatId: 'b' }],
      () => [],
    )
    expect(noRemainingResponse.closed).toBe(true)
  })

  it('rejects stale, unrelated, irrelevant, and wrong-owner commands by identity', () => {
    const start = createResponseWindow(setup, options)
    const wrongCommands = [
      { eventId: 'other', seatId: 'b', actorSeatId: 'b', revision: 0 },
      { eventId: setup.eventId, seatId: 'b', actorSeatId: 'b', revision: 99 },
      { eventId: setup.eventId, seatId: 'a', actorSeatId: 'a', revision: 0 },
      { eventId: setup.eventId, seatId: 'stranger', actorSeatId: 'stranger', revision: 0 },
      { eventId: setup.eventId, seatId: 'b', actorSeatId: 'a', revision: 0 },
    ]
    for (const command of wrongCommands) expect(passResponse(start, command, options)).toBe(start)
    let refreshCalls = 0
    const getRefreshedLegalOptions = () => { refreshCalls += 1; return options }
    for (const command of [
      { eventId: setup.eventId, seatId: 'b', actorSeatId: 'b', revision: 0, optionId: 'block-a' },
      { eventId: setup.eventId, seatId: 'a', actorSeatId: 'a', revision: 0, optionId: 'block-a' },
      { eventId: setup.eventId, seatId: 'b', actorSeatId: 'b', revision: 0, optionId: 'unknown' },
      { eventId: setup.eventId, seatId: 'b', actorSeatId: 'b', revision: 1, optionId: 'dodge-b' },
      { eventId: setup.eventId, seatId: 'b', actorSeatId: 'a', revision: 0, optionId: 'dodge-b' },
    ]) expect(selectResponse(start, command, options, getRefreshedLegalOptions)).toBe(start)
    expect(refreshCalls).toBe(0)

    const selected = selectResponse(start,
      { eventId: setup.eventId, seatId: 'b', actorSeatId: 'b', revision: 0, optionId: 'dodge-b' }, options, getRefreshedLegalOptions)
    expect(selected.revision).toBe(1)
    expect(refreshCalls).toBe(1)
    expect(selectResponse(selected,
      { eventId: setup.eventId, seatId: 'b', actorSeatId: 'b', revision: 0, optionId: 'dodge-b' }, options, getRefreshedLegalOptions)).toBe(selected)
    expect(refreshCalls).toBe(1)
    expect(refreshResponseWindow(selected, 0, [])).toBe(selected)
    expect(refreshResponseWindow(selected, 1, [])).toMatchObject({ closed: true, revision: 2 })
    expect(closeResponseWindow(selected, 'other', 1)).toBe(selected)
    const closed = closeResponseWindow(selected, setup.eventId, 1)
    expect(closed).toMatchObject({ closed: true, revision: 2 })
    expect(closeResponseWindow(closed, setup.eventId, 2)).toBe(closed)
  })

  it('invalidates an offered reply when external eligibility changes', () => {
    const start = createResponseWindow(setup, options)
    const changedOptions = [{ id: 'block-a', ownerSeatId: 'a' }]
    const refreshed = refreshResponseWindow(start, 0, changedOptions)
    expect(refreshed.revision).toBe(1)
    expect(getOfferedResponse(refreshed, changedOptions)?.ownerSeatId).toBe('a')
    expect(selectResponse(refreshed,
      { eventId: setup.eventId, seatId: 'b', actorSeatId: 'b', revision: 0, optionId: 'dodge-b' },
      options, () => changedOptions)).toBe(refreshed)
    expect(passResponse(refreshed,
      { eventId: setup.eventId, seatId: 'a', actorSeatId: 'a', revision: 0 }, changedOptions)).toBe(refreshed)
  })
})
