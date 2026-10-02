import { describe, expect, it } from 'vitest'
import {
  PRNG_VERSION,
  adjacentLocations,
  awaySteps,
  createRandomState,
  nextInt,
  shortestRouteSteps,
  shuffle,
  type BoardGraph,
  type RandomState,
} from './gamePrimitives'

const routes: BoardGraph = {
  locations: ['start', 'a', 'b', 'c', 'target', 'island'].map((id) => ({ id })),
  edges: [
    { from: 'start', to: 'a', kind: 'ordinary' },
    { from: 'start', to: 'b', kind: 'ordinary' },
    { from: 'start', to: 'c', kind: 'ordinary' },
    { from: 'a', to: 'target', kind: 'ordinary' },
    { from: 'b', to: 'target', kind: 'ordinary' },
    { from: 'c', to: 'target', kind: 'ordinary' },
  ],
}

const special: BoardGraph = {
  locations: ['home', 'circle-a', 'circle-b', 'end', 'passage-end'].map((id) => ({ id })),
  edges: [
    { from: 'home', to: 'circle-a', kind: 'ordinary' },
    { from: 'circle-a', to: 'circle-b', kind: 'teleport' },
    { from: 'circle-b', to: 'end', kind: 'ordinary' },
    { from: 'home', to: 'passage-end', kind: 'passage' },
  ],
}

describe('deterministic random primitives', () => {
  it('replays a sequence from serialized state and preserves the input to shuffle', () => {
    const initial = createRandomState(12345)
    expect(initial).toEqual({ version: PRNG_VERSION, value: 12345 })
    const first = nextInt(initial, 20)
    const restored = JSON.parse(JSON.stringify(first.state)) as RandomState
    const second = nextInt(first.state, 20)
    expect(nextInt(restored, 20)).toEqual(second)
    expect(nextInt(initial, 20)).toEqual(first)

    const input = ['a', 'b', 'c', 'd', 'e']
    const shuffled = shuffle(input, initial)
    expect(input).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(shuffle(input, JSON.parse(JSON.stringify(initial)) as RandomState)).toEqual(shuffled)
    expect([...shuffled.items].sort()).toEqual(input)
    expect(shuffled.state).not.toEqual(initial)
  })

  it('keeps fixed replay vectors and does not force alternating die parity', () => {
    let state = createRandomState(0)
    const d20: number[] = []
    for (let i = 0; i < 6; i++) {
      const draw = nextInt(state, 20)
      d20.push(draw.value + 1)
      state = draw.state
    }
    expect(d20).toEqual([15, 20, 17, 20, 4, 6])
    expect(state).toEqual({ version: PRNG_VERSION, value: 3041712726 })
    expect(d20.some((value, i) => i > 0 && value % 2 === d20[i - 1] % 2)).toBe(true)
  })

  it('rejects invalid seeds, states, and draw bounds', () => {
    for (const seed of [-1, 1.5, Number.NaN, 0x1_0000_0000]) {
      expect(() => createRandomState(seed)).toThrow(RangeError)
    }
    for (const bound of [0, -1, 1.5, Number.NaN, 0x1_0000_0001]) {
      expect(() => nextInt(createRandomState(0), bound)).toThrow(RangeError)
    }
    expect(() => nextInt({ version: 'wrong' as typeof PRNG_VERSION, value: 0 }, 3)).toThrow(RangeError)
    expect(() => nextInt({ version: PRNG_VERSION, value: -1 }, 3)).toThrow(RangeError)
  })

  it('returns a bounded index for the full uint32 range and a singleton', () => {
    expect(nextInt(createRandomState(0), 0x1_0000_0000).value).toBe(2462723854)
    expect(nextInt(createRandomState(0), 1).value).toBe(0)
    // The first draw, 2462723854, is outside the unbiased range for this bound.
    expect(nextInt(createRandomState(0), 0x8000_0001)).toEqual({
      value: 1020716019,
      state: { version: PRNG_VERSION, value: 1013904242 },
    })
    expect(() => shuffle([], { version: PRNG_VERSION, value: -1 })).toThrow(RangeError)
  })
})

describe('board graph movement', () => {
  it('uses undirected edges and returns every equal shortest first step', () => {
    expect(adjacentLocations(routes, 'a', 'hero')).toEqual(['start', 'target'])
    expect(shortestRouteSteps(routes, 'start', 'target', 'monster')).toEqual(['a', 'b', 'c'])
    expect(shortestRouteSteps(routes, 'target', 'start', 'monster')).toEqual(['a', 'b', 'c'])
    expect(shortestRouteSteps(routes, 'start', 'start', 'hero')).toEqual([])
    expect(shortestRouteSteps(routes, 'start', 'island', 'hero')).toEqual([])
  })

  it('uses passages and teleport circles for heroes and scoped monsters, not guides', () => {
    expect(adjacentLocations(special, 'home', 'hero')).toEqual(['circle-a', 'passage-end'])
    expect(adjacentLocations(special, 'home', 'monster')).toEqual(['circle-a', 'passage-end'])
    expect(adjacentLocations(special, 'home', 'guide')).toEqual(['circle-a'])
    expect(shortestRouteSteps(special, 'home', 'end', 'hero')).toEqual(['circle-a'])
    expect(shortestRouteSteps(special, 'home', 'end', 'guide')).toEqual([])
    expect(shortestRouteSteps(special, 'home', 'passage-end', 'guide')).toEqual([])
  })

  it('moves away only along strictly increasing legal distances and stops at a dead end', () => {
    const path: BoardGraph = {
      locations: ['source', 'middle', 'end'].map((id) => ({ id })),
      edges: [
        { from: 'source', to: 'middle', kind: 'ordinary' },
        { from: 'middle', to: 'end', kind: 'ordinary' },
      ],
    }
    expect(awaySteps(path, 'source', 'source', 'monster')).toEqual(['middle'])
    expect(awaySteps(path, 'middle', 'source', 'monster')).toEqual(['end'])
    expect(awaySteps(path, 'end', 'source', 'monster')).toEqual([])
    expect(awaySteps(routes, 'island', 'start', 'monster')).toEqual([])
  })

  it('rejects every unknown endpoint', () => {
    expect(() => adjacentLocations(routes, 'missing', 'hero')).toThrow(RangeError)
    expect(() => shortestRouteSteps(routes, 'missing', 'target', 'monster')).toThrow(RangeError)
    expect(() => shortestRouteSteps(routes, 'start', 'missing', 'monster')).toThrow(RangeError)
    expect(() => awaySteps(routes, 'missing', 'start', 'monster')).toThrow(RangeError)
    expect(() => awaySteps(routes, 'start', 'missing', 'monster')).toThrow(RangeError)
  })
})
