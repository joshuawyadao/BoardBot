/** Serializable, deterministic random state. Keep the algorithm version in saves. */
export const PRNG_VERSION = 'weyl-fmix32-v1' as const
const UINT32_RANGE = 0x1_0000_0000

export interface RandomState {
  readonly version: typeof PRNG_VERSION
  readonly value: number
}

function requireRandomState(state: RandomState): void {
  if (state.version !== PRNG_VERSION) throw new RangeError('Unsupported random-state version.')
  if (!Number.isInteger(state.value) || state.value < 0 || state.value >= UINT32_RANGE) {
    throw new RangeError('Random state must contain a uint32 integer.')
  }
}

export function createRandomState(seed: number): RandomState {
  if (!Number.isInteger(seed) || seed < 0 || seed >= UINT32_RANGE) {
    throw new RangeError('Random seed must be a uint32 integer.')
  }
  return { version: PRNG_VERSION, value: seed }
}

function nextUint32(state: RandomState): { readonly value: number; readonly state: RandomState } {
  requireRandomState(state)
  // Weyl sequence advances the saved counter; MurmurHash3's fmix32-style
  // xor/multiply finalizer permutes the output so die rolls do not expose
  // the counter's alternating low bits. Both odd multiplies are bijective
  // over uint32 values. Keep these constants fixed for replay compatibility.
  const counter = (state.value + 0x9e3779b9) >>> 0
  let value = counter
  value ^= value >>> 16
  value = Math.imul(value, 0x85ebca6b)
  value ^= value >>> 13
  value = Math.imul(value, 0xc2b2ae35)
  value ^= value >>> 16
  return { value: value >>> 0, state: { version: PRNG_VERSION, value: counter } }
}

/** Rejection sampling avoids modulo bias, including for non-power-of-two bounds. */
export function nextInt(
  state: RandomState,
  exclusiveUpperBound: number,
): { readonly value: number; readonly state: RandomState } {
  if (!Number.isInteger(exclusiveUpperBound) || exclusiveUpperBound < 1 || exclusiveUpperBound > UINT32_RANGE) {
    throw new RangeError('Random bound must be an integer from 1 through 2^32.')
  }
  const limit = Math.floor(UINT32_RANGE / exclusiveUpperBound) * exclusiveUpperBound
  let current = state
  while (true) {
    const draw = nextUint32(current)
    current = draw.state
    if (draw.value < limit) return { value: draw.value % exclusiveUpperBound, state: current }
  }
}

/** Fisher–Yates; copies the input and returns the state after all draws. */
export function shuffle<T>(
  input: readonly T[],
  state: RandomState,
): { readonly items: readonly T[]; readonly state: RandomState } {
  requireRandomState(state)
  const items = [...input]
  let current = state
  for (let i = items.length - 1; i > 0; i--) {
    const draw = nextInt(current, i + 1)
    current = draw.state
    ;[items[i], items[draw.value]] = [items[draw.value], items[i]]
  }
  return { items, state: current }
}

/** Structural subset of GameData.board, usable with validated synthetic graphs. */
export interface BoardGraph {
  readonly locations: readonly { readonly id: string }[]
  readonly edges: readonly {
    readonly from: string
    readonly to: string
    readonly kind: 'ordinary' | 'passage' | 'teleport'
  }[]
}

export type Traversal = 'hero' | 'monster' | 'guide'

function knownLocations(graph: BoardGraph): Set<string> {
  return new Set(graph.locations.map((location) => location.id))
}

function requireLocation(known: Set<string>, id: string): void {
  if (!known.has(id)) throw new RangeError(`Unknown board location: ${id}`)
}

/** Board edges are undirected. Guide movement excludes passages and circles. */
export function adjacentLocations(graph: BoardGraph, from: string, traversal: Traversal): string[] {
  const known = knownLocations(graph)
  requireLocation(known, from)
  const neighbors = new Set<string>()
  for (const edge of graph.edges) {
    if (traversal === 'guide' && edge.kind !== 'ordinary') continue
    if (edge.from === from && known.has(edge.to)) neighbors.add(edge.to)
    if (edge.to === from && known.has(edge.from)) neighbors.add(edge.from)
  }
  return [...neighbors]
}

function distancesFrom(graph: BoardGraph, origin: string, traversal: Traversal): Map<string, number> {
  const distances = new Map<string, number>([[origin, 0]])
  const queue = [origin]
  for (let head = 0; head < queue.length; head++) {
    const location = queue[head]
    const nextDistance = distances.get(location)! + 1
    for (const adjacent of adjacentLocations(graph, location, traversal)) {
      if (distances.has(adjacent)) continue
      distances.set(adjacent, nextDistance)
      queue.push(adjacent)
    }
  }
  return distances
}

/** Every first step on a shortest legal route; the caller chooses among ties. */
export function shortestRouteSteps(
  graph: BoardGraph,
  from: string,
  target: string,
  traversal: Traversal,
): string[] {
  const known = knownLocations(graph)
  requireLocation(known, from)
  requireLocation(known, target)
  if (from === target) return []
  const distanceToTarget = distancesFrom(graph, target, traversal)
  const distance = distanceToTarget.get(from)
  if (distance === undefined) return []
  return adjacentLocations(graph, from, traversal).filter(
    (step) => distanceToTarget.get(step) === distance - 1,
  )
}

/** Only steps that strictly increase shortest legal distance from the source. */
export function awaySteps(
  graph: BoardGraph,
  from: string,
  source: string,
  traversal: Traversal,
): string[] {
  const known = knownLocations(graph)
  requireLocation(known, from)
  requireLocation(known, source)
  const distances = distancesFrom(graph, source, traversal)
  const currentDistance = distances.get(from)
  if (currentDistance === undefined) return []
  return adjacentLocations(graph, from, traversal).filter(
    (step) => (distances.get(step) ?? -1) > currentDistance,
  )
}
