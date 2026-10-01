/** BoardBot's selected interpretation for the scoped original D&D game. */
export const RULESET_VERSION = 'boardbot-dnd-2026-09-30-v2'

export interface D20Result {
  readonly base: number
  readonly modifiers: readonly number[]
  readonly adjustedTotal: number
  readonly effectiveResult: number
}

/** Keep the arithmetic for replay while using only 1–20 for rule lookups. */
export function resolveD20(base: number, modifiers: readonly number[]): D20Result {
  if (!Number.isSafeInteger(base) || base < 1 || base > 20) {
    throw new RangeError('A d20 base roll must be an integer from 1 to 20.')
  }

  let adjustedTotal = base
  for (const modifier of modifiers) {
    if (!Number.isSafeInteger(modifier)) {
      throw new RangeError('Each d20 modifier must be a safe integer.')
    }
    adjustedTotal += modifier
    if (!Number.isSafeInteger(adjustedTotal)) {
      throw new RangeError('The adjusted d20 total must be a safe integer.')
    }
  }

  return {
    base,
    modifiers: [...modifiers],
    adjustedTotal,
    effectiveResult: Math.max(1, Math.min(20, adjustedTotal)),
  }
}

/** Options are computed by the rules engine for the current event and revision. */
export interface ResponseOption {
  readonly id: string
  readonly ownerSeatId: string
}

export interface ResponseWindow {
  readonly eventId: string
  readonly orderedSeatIds: readonly string[]
  readonly activeSeatId: string
  readonly revision: number
  readonly passedSeatIds: readonly string[]
  readonly closed: boolean
}

export interface ResponseWindowSetup {
  readonly eventId: string
  readonly orderedSeatIds: readonly string[]
  readonly activeSeatId: string
}

export interface OfferedResponse {
  readonly ownerSeatId: string
  readonly options: readonly ResponseOption[]
}

export interface ResponseCommand {
  readonly eventId: string
  readonly revision: number
  readonly seatId: string
  /** Authenticated seat represented by the submitting controller. */
  readonly actorSeatId: string
}

export interface SelectResponseCommand extends ResponseCommand {
  readonly optionId: string
}

function priorityOrder(window: ResponseWindow): readonly string[] {
  const activeIndex = window.orderedSeatIds.indexOf(window.activeSeatId)
  return [...window.orderedSeatIds.slice(activeIndex), ...window.orderedSeatIds.slice(0, activeIndex)]
}

export function getOfferedResponse(
  window: ResponseWindow,
  legalOptions: readonly ResponseOption[],
): OfferedResponse | null {
  if (window.closed) return null
  for (const ownerSeatId of priorityOrder(window)) {
    if (window.passedSeatIds.includes(ownerSeatId)) continue
    const options = legalOptions.filter((option) => option.ownerSeatId === ownerSeatId)
    if (options.length > 0) return { ownerSeatId, options }
  }
  return null
}

function closeIfNoOffer(window: ResponseWindow, legalOptions: readonly ResponseOption[]): ResponseWindow {
  return getOfferedResponse(window, legalOptions) === null ? { ...window, closed: true } : window
}

export function createResponseWindow(
  setup: ResponseWindowSetup,
  legalOptions: readonly ResponseOption[],
): ResponseWindow {
  const { eventId, activeSeatId, orderedSeatIds } = setup
  if (!eventId || !activeSeatId || orderedSeatIds.length === 0 ||
    new Set(orderedSeatIds).size !== orderedSeatIds.length ||
    orderedSeatIds.some((id) => !id) || !orderedSeatIds.includes(activeSeatId)) {
    throw new RangeError('A response window requires an event and distinct seats including the active seat.')
  }
  return closeIfNoOffer({
    eventId,
    activeSeatId,
    orderedSeatIds: [...orderedSeatIds],
    revision: 0,
    passedSeatIds: [],
    closed: false,
  }, legalOptions)
}

function isCurrent(window: ResponseWindow, command: ResponseCommand): boolean {
  return !window.closed && command.eventId === window.eventId &&
    command.revision === window.revision && command.actorSeatId === command.seatId
}

/** Recheck after an external change; the new revision invalidates earlier offers. */
export function refreshResponseWindow(
  window: ResponseWindow,
  expectedRevision: number,
  legalOptions: readonly ResponseOption[],
): ResponseWindow {
  if (window.closed || window.revision !== expectedRevision) return window
  return closeIfNoOffer({ ...window, revision: window.revision + 1 }, legalOptions)
}

/** Passing is only valid for the seat currently offered a relevant response. */
export function passResponse(
  window: ResponseWindow,
  command: ResponseCommand,
  legalOptions: readonly ResponseOption[],
): ResponseWindow {
  if (!isCurrent(window, command) || getOfferedResponse(window, legalOptions)?.ownerSeatId !== command.seatId) {
    return window
  }
  return closeIfNoOffer({
    ...window,
    revision: window.revision + 1,
    passedSeatIds: [...window.passedSeatIds, command.seatId],
  }, legalOptions)
}

/**
 * Validate the reply before calculating the effect's refreshed eligibility. The callback
 * must be pure. Commit the effect only when this returns a changed window; an invalid
 * or repeated command never invokes the callback.
 */
export function selectResponse(
  window: ResponseWindow,
  command: SelectResponseCommand,
  legalOptions: readonly ResponseOption[],
  getRefreshedLegalOptions: () => readonly ResponseOption[],
): ResponseWindow {
  if (!isCurrent(window, command)) return window
  const offered = getOfferedResponse(window, legalOptions)
  if (offered?.ownerSeatId !== command.seatId ||
    !offered.options.some((option) => option.id === command.optionId)) return window

  return closeIfNoOffer({
    ...window,
    revision: window.revision + 1,
    passedSeatIds: [],
  }, getRefreshedLegalOptions())
}

/** Called when the owning event finishes, even if optional responses remain. */
export function closeResponseWindow(
  window: ResponseWindow,
  eventId: string,
  expectedRevision: number,
): ResponseWindow {
  if (window.closed || window.eventId !== eventId || window.revision !== expectedRevision) return window
  return { ...window, revision: window.revision + 1, closed: true }
}
