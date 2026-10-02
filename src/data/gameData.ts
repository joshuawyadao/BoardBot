/** Private, JSON-safe component data. The public repository contains no game text. */
export const GAME_DATA_SCHEMA_VERSION = 2 as const;

/** Printed Monster-card events with executable solo-game resolutions. */
export const isSupportedMonsterEventId = (printedId: number): boolean =>
  Number.isSafeInteger(printedId) && printedId >= 300 && printedId <= 321;
export const isCitizenMonsterEventId = (printedId: number): boolean =>
  (printedId >= 308 && printedId <= 311) || (printedId >= 316 && printedId <= 321);

export interface GameData {
  schemaVersion: typeof GAME_DATA_SCHEMA_VERSION;
  contentKind: "owner-verified" | "synthetic";
  gameId: string;
  edition: string;
  interpretationVersion: string;
  provenance: { recordVersion: number; recordSha256: string; verification: string; componentPointers: Record<string, string>; componentSourceUrls: Record<string, string[]> };
  effectStatus: "reference-prose-only";
  capabilities: { setupVerified: boolean; playableRulesEngine: false };
  setup?: {
    beholderLocation: string;
    displacerLocation: string;
    beholderDamageMarkers: number;
    beholderReferenceReady: boolean;
    provenance: {
      sourceUrl: string;
      photoSha256: string;
      sourceKind: "photograph-of-printed-component" | "synthetic";
    };
  };
  board: {
    locations: { id: string; name: string; kind: "numbered" | "unnumbered" | "circle"; number?: number; region?: string; printedDragonExclusion?: boolean }[];
    edges: { from: string; to: string; kind: "ordinary" | "passage" | "teleport" }[];
    terrorTrack: (number | string)[];
    soloLabelAt: number;
    hospital: string;
    monsterStarts: { number: number; location: string }[];
    lairLocations: string[];
  };
  heroes: { id: string; name: string; actions: number; start: string; specialAction: string; outcomes: { min: number; max: number; effect: string }[] }[];
  items: { id: string; name: string; color: string; strength: number; quantity: number; locations: string[] }[];
  citizens: { id: string; name: string; quantity: number; safeDestination: string }[];
  monsterCards: { id: string; printedId: number; name: string; quantity: number; itemsDrawn: number; activationSymbols: string[]; movement: number; attackDice: number; event: string; citizenStartingLocation?: string }[];
  perks: { id: string; name: string; quantity: number; effect: string }[];
  lairTokens: { faces: { id: string; printedId: number; name: string; quantity: number; effect?: string }[]; sharedBack: { requirement: string; itemSymbols: string[] } };
  dice: { monsterDice: { quantity: number; facesPerDie: number; faceCounts: Record<string, number> }; d20: { quantity: number; faces: number[] } };
  monsters: {
    beholder: { frenzyOrder: number; activationSymbols: string[]; objective: string; power: { name: string; resolution: string }; advance: { name: string; location: string; cost: string; roll: string; outcomes: { min: number; max: number; effect: string }[] }; eyestalks: { min: number; max: number; name: string }[]; rays: { front: { min: number; max: number; name: string; effect: string }[]; back: { min: number; max: number; name: string; effect: string }[] }; defeat: { name: string; prerequisite: string; location: string; color: string; threshold: string }; damageMarkers: number };
    displacerBeast: { frenzyOrder: number; activationSymbols: string[]; power: { name: string; effect: string }; advance: { name: string; location: string; printedRequirement: string; minimumItems: number; grid: number[][][] }; defeat: { name: string; location: string; cost: string; roll: string; coveredResult: string; uncoveredResult: string; specialResults: Record<string, string> } };
  };
}

type JsonObject = Record<string, unknown>;
const object = (value: unknown, path: string): JsonObject => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} must be an object`);
  return value as JsonObject;
};
const array = (value: unknown, path: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value;
};
const string = (value: unknown, path: string): string => {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${path} must be a nonempty string`);
  return value;
};
const integer = (value: unknown, path: string, min = 0): number => {
  if (!Number.isSafeInteger(value) || (value as number) < min) throw new Error(`${path} must be a safe integer >= ${min}`);
  return value as number;
};
const field = (value: unknown, key: string, path: string): unknown => object(value, path)[key];
const arr = <T>(value: unknown, path: string, read: (entry: unknown, path: string) => T): T[] => array(value, path).map((entry, i) => read(entry, `${path}[${i}]`));
const strings = (value: unknown, path: string): string[] => arr(value, path, string);
const range = (value: unknown, path: string) => {
  const pair = arr(value, path, (v, p) => integer(v, p, 1));
  if (pair.length !== 2 || pair[0] > pair[1] || pair[1] > 20) throw new Error(`${path} must be a d20 range`);
  return { min: pair[0], max: pair[1] };
};
const idOf = (name: string): string => name.normalize("NFKD").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const unique = (values: string[], path: string) => {
  if (new Set(values).size !== values.length) throw new Error(`${path} contains duplicates`);
};
const ITEM_COLORS = new Set(["red", "yellow", "blue"]);
const ACTIVATION_SYMBOLS = new Set([
  "orange chest", "green flask", "purple wand", "turquoise open book", "black flame",
  "red shield", "black pointed hat", "crossed black symbol", "blue skull", "red/orange sword",
]);
const activationSymbols = (value: unknown, path: string) => {
  const symbols = strings(value, path);
  for (const symbol of symbols) if (!ACTIVATION_SYMBOLS.has(symbol)) throw new Error(`${path} has unknown symbol ${symbol}`);
  return symbols;
};
const outcomeCoverage = (values: { min: number; max: number }[], path: string, expectedStart = 1) => {
  const covered = new Set<number>();
  for (const [i, value] of values.entries()) {
    integer(value.min, `${path}[${i}].min`, 1);
    integer(value.max, `${path}[${i}].max`, 1);
    if (value.min > value.max || value.max > 20) throw new Error(`${path}[${i}] has invalid range`);
    for (let n = value.min; n <= value.max; n++) {
      if (covered.has(n)) throw new Error(`${path} overlaps at ${n}`);
      covered.add(n);
    }
  }
  if (covered.size !== 21 - expectedStart || [...covered].some(n => n < expectedStart)) throw new Error(`${path} does not cover ${expectedStart}–20`);
};

/** Reject malformed, inconsistent, or unsupported data before any session can use it. */
export function validateGameData(value: unknown): GameData {
  const data = object(value, "gameData") as unknown as GameData;
  if (data.schemaVersion !== GAME_DATA_SCHEMA_VERSION) throw new Error("Unsupported game-data schema version");
  if (data.contentKind !== "owner-verified" && data.contentKind !== "synthetic") throw new Error("Invalid content kind");
  string(data.gameId, "gameId"); string(data.edition, "edition");
  string(data.interpretationVersion, "interpretationVersion");
  if (data.effectStatus !== "reference-prose-only") throw new Error("Unsupported effect status");
  if (typeof data.capabilities?.setupVerified !== "boolean" || data.capabilities?.playableRulesEngine !== false) throw new Error("Unsupported capability claim");
  if (data.capabilities.setupVerified !== (data.setup !== undefined)) throw new Error("Setup presence must match setupVerified capability");
  integer(field(data.provenance, "recordVersion", "provenance"), "recordVersion", 0);
  string(data.provenance.recordSha256, "recordSha256");
  string(data.provenance.verification, "verification");
  const pointers = object(data.provenance.componentPointers, "componentPointers");
  for (const [key, pointer] of Object.entries(pointers)) { string(key, "component pointer key"); if (!/^\/[a-zA-Z0-9_/-]+$/.test(string(pointer, `componentPointers.${key}`))) throw new Error(`Invalid component pointer ${key}`); }
  const sourceUrls = object(data.provenance.componentSourceUrls, "componentSourceUrls");
  for (const [key, urls] of Object.entries(sourceUrls)) {
    if (!(key in pointers)) throw new Error(`Source URL has no component pointer: ${key}`);
    for (const url of strings(urls, `componentSourceUrls.${key}`)) {
      if (!/^https?:\/\//.test(url)) throw new Error(`Invalid source URL for ${key}`);
    }
  }
  const board = object(data.board, "board") as unknown as GameData["board"];
  const locationIds = arr(board.locations, "locations", (v, p) => {
    const x = object(v, p);
    const id = string(x.id, `${p}.id`), name = string(x.name, `${p}.name`);
    if (!["numbered", "unnumbered", "circle"].includes(string(x.kind, `${p}.kind`))) throw new Error(`${p}.kind invalid`);
    if (x.kind === "numbered") integer(x.number, `${p}.number`, 1);
    if (x.kind === "circle") string(x.region, `${p}.region`);
    if (x.printedDragonExclusion !== undefined && typeof x.printedDragonExclusion !== "boolean") throw new Error(`${p}.printedDragonExclusion invalid`);
    return { id, name, kind: x.kind, number: x.number };
  });
  unique(locationIds.map(x => x.id), "location IDs");
  unique(locationIds.map(x => x.name), "location names");
  const numbered = locationIds.filter(x => x.kind === "numbered");
  unique(numbered.map(x => String(x.number)), "location numbers");
  if (data.contentKind === "owner-verified" && numbered.some(x => (x.number as number) > 20)) throw new Error("Numbered board locations must be 1–20");
  if (data.contentKind === "owner-verified" && (numbered.length !== 20 || locationIds.filter(x => x.kind === "unnumbered").length !== 5 || locationIds.filter(x => x.kind === "circle").length !== 4)) throw new Error("Incorrect verified board location count");
  const known = new Set(locationIds.map(x => x.id));
  const ref = (value: unknown, path: string) => { const id = string(value, path); if (!known.has(id)) throw new Error(`${path} refers to missing location ${id}`); return id; };
  if (data.setup) {
    const setup = object(data.setup, "setup");
    ref(setup.beholderLocation, "setup.beholderLocation");
    ref(setup.displacerLocation, "setup.displacerLocation");
    integer(setup.beholderDamageMarkers, "setup.beholderDamageMarkers", 1);
    if (setup.beholderReferenceReady !== true) throw new Error("Beholder reference setup must be verified");
    const provenance = object(setup.provenance, "setup.provenance");
    const sourceKind = string(provenance.sourceKind, "setup.provenance.sourceKind");
    if (sourceKind !== "photograph-of-printed-component" && sourceKind !== "synthetic") throw new Error("Invalid setup source kind");
    if (!/^https:\/\//.test(string(provenance.sourceUrl, "setup.provenance.sourceUrl"))) throw new Error("Invalid setup source URL");
    if (!/^[a-f0-9]{64}$/.test(string(provenance.photoSha256, "setup.provenance.photoSha256"))) throw new Error("Invalid setup photo hash");
    if (data.contentKind === "owner-verified" && sourceKind !== "photograph-of-printed-component") throw new Error("Owner setup requires printed photo evidence");
  }
  const edges = arr(board.edges, "edges", (v, p) => {
    const x = object(v, p); const from = ref(x.from, `${p}.from`), to = ref(x.to, `${p}.to`);
    if (from === to) throw new Error(`${p} is a self edge`);
    if (!["ordinary", "passage", "teleport"].includes(string(x.kind, `${p}.kind`))) throw new Error(`${p}.kind invalid`);
    return { from, to, kind: x.kind };
  });
  unique(edges.map(x => `${[x.from, x.to].sort().join("|")}|${x.kind}`), "board edges");
  const kinds = new Map(locationIds.map(location => [location.id, location.kind]));
  for (const edge of edges) {
    if (edge.kind === "teleport" && (kinds.get(edge.from) !== "circle" || kinds.get(edge.to) !== "circle")) {
      throw new Error("Teleport edges must join two circles");
    }
  }
  if (data.contentKind === "owner-verified" && (edges.filter(x => x.kind === "ordinary").length !== 28 || edges.filter(x => x.kind === "passage").length !== 2 || edges.filter(x => x.kind === "teleport").length !== 6)) throw new Error("Incorrect verified board edge count");
  const track = arr(board.terrorTrack, "terrorTrack", (v, p) => typeof v === "string" ? string(v, p) : integer(v, p));
  if (data.contentKind === "owner-verified" && track.length !== 8) throw new Error("Incorrect verified terror track length");
  integer(board.soloLabelAt, "soloLabelAt"); ref(board.hospital, "hospital");
  const starts = arr(board.monsterStarts, "monsterStarts", (v, p) => { const x = object(v, p); integer(x.number, `${p}.number`, 1); ref(x.location, `${p}.location`); return x; });
  unique(starts.map(x => String(x.number)), "monster start numbers");
  if (data.contentKind === "owner-verified" && starts.some(start => (start.number as number) > 6)) throw new Error("Monster start numbers must be 1–6");
  const lairLocations = arr(board.lairLocations, "lairLocations", ref);
  unique(lairLocations, "lair locations");
  if (data.contentKind === "owner-verified" && (starts.length !== 6 || lairLocations.length !== 4)) throw new Error("Incorrect verified board markers");
  if (data.setup) {
    const beholderStart = starts.find(start => start.number === 4);
    const displacerStart = starts.find(start => start.number === 1);
    if (data.setup.beholderLocation !== beholderStart?.location || data.setup.displacerLocation !== displacerStart?.location) {
      throw new Error("Setup locations conflict with selected board start markers");
    }
  }
  const heroes = arr(data.heroes, "heroes", (value, path) => {
    const hero = object(value, path);
    string(hero.id, `${path}.id`);
    string(hero.name, `${path}.name`);
    integer(hero.actions, `${path}.actions`, 1);
    ref(hero.start, `${path}.start`);
    string(hero.specialAction, `${path}.specialAction`);
    const outcomes = arr(hero.outcomes, `${path}.outcomes`, (entry, entryPath) => {
      const outcome = object(entry, entryPath);
      return {
        min: integer(outcome.min, `${entryPath}.min`, 1),
        max: integer(outcome.max, `${entryPath}.max`, 1),
        effect: string(outcome.effect, `${entryPath}.effect`),
      };
    });
    outcomeCoverage(outcomes, `${path}.outcomes`);
    return hero;
  });
  unique(heroes.map(hero => hero.id as string), "hero IDs");
  const items = arr(data.items, "items", (value, path) => {
    const item = object(value, path);
    string(item.id, `${path}.id`);
    string(item.name, `${path}.name`);
    const color = string(item.color, `${path}.color`);
    if (!ITEM_COLORS.has(color)) throw new Error(`${path}.color unknown`);
    integer(item.strength, `${path}.strength`, 1);
    const quantity = integer(item.quantity, `${path}.quantity`, 1);
    if (arr(item.locations, `${path}.locations`, ref).length !== quantity) {
      throw new Error(`${path}.locations must list each physical token destination`);
    }
    return item;
  });
  unique(items.map(item => item.id as string), "item IDs");
  if (data.contentKind === "owner-verified" && items.some(item => (item.strength as number) > 6)) {
    throw new Error("Item strength exceeds verified range");
  }
  const citizens = arr(data.citizens, "citizens", (value, path) => {
    const citizen = object(value, path);
    string(citizen.id, `${path}.id`);
    string(citizen.name, `${path}.name`);
    integer(citizen.quantity, `${path}.quantity`, 1);
    ref(citizen.safeDestination, `${path}.safeDestination`);
    return citizen;
  });
  unique(citizens.map(citizen => citizen.id as string), "citizen IDs");
  const cards = arr(data.monsterCards, "monsterCards", (value, path) => {
    const card = object(value, path);
    string(card.id, `${path}.id`);
    integer(card.printedId, `${path}.printedId`, 1);
    if (data.contentKind === "owner-verified" && !isSupportedMonsterEventId(card.printedId as number)) {
      throw new Error(`${path}.printedId has no supported Monster-card event`);
    }
    string(card.name, `${path}.name`);
    integer(card.quantity, `${path}.quantity`, 1);
    integer(card.itemsDrawn, `${path}.itemsDrawn`);
    integer(card.movement, `${path}.movement`);
    integer(card.attackDice, `${path}.attackDice`);
    activationSymbols(card.activationSymbols, `${path}.activationSymbols`);
    string(card.event, `${path}.event`);
    if (card.citizenStartingLocation !== undefined) {
      ref(card.citizenStartingLocation, `${path}.citizenStartingLocation`);
    }
    if (data.contentKind === "owner-verified" && isCitizenMonsterEventId(card.printedId as number) &&
      card.citizenStartingLocation === undefined) {
      throw new Error(`${path}.citizenStartingLocation is required for this Monster-card event`);
    }
    return card;
  });
  unique(cards.map(card => card.id as string), "monster card IDs");
  unique(cards.map(card => String(card.printedId)), "printed card IDs");
  const perks = arr(data.perks, "perks", (value, path) => {
    const perk = object(value, path);
    string(perk.id, `${path}.id`);
    string(perk.name, `${path}.name`);
    integer(perk.quantity, `${path}.quantity`, 1);
    string(perk.effect, `${path}.effect`);
    return perk;
  });
  unique(perks.map(perk => perk.id as string), "perk IDs");
  const lair = object(data.lairTokens, "lairTokens");
  const faces = arr(lair.faces, "lairTokens.faces", (value, path) => {
    const face = object(value, path);
    string(face.id, `${path}.id`);
    integer(face.printedId, `${path}.printedId`, 1);
    string(face.name, `${path}.name`);
    integer(face.quantity, `${path}.quantity`, 1);
    if (face.effect !== undefined) string(face.effect, `${path}.effect`);
    return face;
  });
  unique(faces.map(face => face.id as string), "lair token IDs");
  unique(faces.map(face => String(face.printedId)), "lair printed IDs");
  const sharedBack = object(lair.sharedBack, "lairTokens.sharedBack");
  string(sharedBack.requirement, "lairTokens.sharedBack.requirement");
  strings(sharedBack.itemSymbols, "lairTokens.sharedBack.itemSymbols");
  const dice = object(data.dice, "dice"); const monsterDice = object(dice.monsterDice, "monsterDice");
  integer(monsterDice.quantity, "monsterDice.quantity", 1); const faceTotal = integer(monsterDice.facesPerDie, "monsterDice.facesPerDie", 1);
  const counts = object(monsterDice.faceCounts, "faceCounts");
  if (Object.values(counts).reduce<number>((sum, v) => sum + integer(v, "face count"), 0) !== faceTotal) throw new Error("Monster die face counts inconsistent");
  const d20 = object(dice.d20, "d20"); integer(d20.quantity, "d20.quantity", 1);
  if (cards.some(card => (card.attackDice as number) > (monsterDice.quantity as number))) throw new Error("Attack dice exceed available dice");
  if (data.contentKind === "owner-verified" && (
    Object.keys(counts).sort().join("|") !== "blank|hit_starburst|power_exclamation" ||
    counts.blank !== 2 || counts.hit_starburst !== 3 || counts.power_exclamation !== 1
  )) throw new Error("Verified monster die distribution mismatch");
  const d20Faces = arr(d20.faces, "d20.faces", (v, p) => integer(v, p, 1)); unique(d20Faces.map(String), "d20 faces");
  if (d20Faces.length !== 20 || d20Faces.some(v => v > 20)) throw new Error("d20 must contain 1–20");
  const monsters = object(data.monsters, "monsters");
  const beholder = object(monsters.beholder, "beholder");
  integer(beholder.frenzyOrder, "beholder.frenzyOrder", 1);
  activationSymbols(beholder.activationSymbols, "beholder.activationSymbols");
  string(beholder.objective, "beholder.objective");
  const bp = object(beholder.power, "beholder.power");
  string(bp.name, "beholder.power.name");
  string(bp.resolution, "beholder.power.resolution");
  const ba = object(beholder.advance, "beholder.advance");
  for (const key of ["name", "location", "cost", "roll"]) string(ba[key], `beholder.advance.${key}`);
  const readValidatedRange = (value: unknown, path: string, effect: boolean) => {
    const entry = object(value, path);
    const result = {
      min: integer(entry.min, `${path}.min`, 1),
      max: integer(entry.max, `${path}.max`, 1),
    };
    if (effect) string(entry.effect, `${path}.effect`);
    return result;
  };
  const advanceOutcomes = arr(ba.outcomes, "beholder.advance.outcomes", (value, path) =>
    readValidatedRange(value, path, true));
  outcomeCoverage(advanceOutcomes, "beholder.advance.outcomes");
  const eye = arr(beholder.eyestalks, "eyestalks", (value, path) => {
    const stalk = object(value, path);
    string(stalk.name, `${path}.name`);
    return readValidatedRange(stalk, path, false);
  });
  outcomeCoverage(eye, "eyestalks", 2);
  const rays = object(beholder.rays, "rays");
  const allRays = ["front", "back"].flatMap(side => arr(rays[side], `rays.${side}`, (value, path) => {
    const ray = object(value, path);
    string(ray.name, `${path}.name`);
    return readValidatedRange(ray, path, true);
  }));
  outcomeCoverage(allRays, "rays");
  const bd = object(beholder.defeat, "beholder.defeat");
  for (const key of ["name", "prerequisite", "location", "color", "threshold"]) {
    string(bd[key], `beholder.defeat.${key}`);
  }
  integer(beholder.damageMarkers, "beholder.damageMarkers", 1);
  if (data.setup && data.setup.beholderDamageMarkers !== beholder.damageMarkers) throw new Error("Setup damage marker count conflicts with Beholder mat");
  const displacer = object(monsters.displacerBeast, "displacerBeast");
  integer(displacer.frenzyOrder, "displacer.frenzyOrder", 1);
  activationSymbols(displacer.activationSymbols, "displacer.activationSymbols");
  const dp = object(displacer.power, "displacer.power");
  string(dp.name, "displacer.power.name");
  string(dp.effect, "displacer.power.effect");
  const da = object(displacer.advance, "displacer.advance");
  for (const key of ["name", "location", "printedRequirement"]) string(da[key], `displacer.advance.${key}`);
  integer(da.minimumItems, "displacer.advance.minimumItems", 1);
  const grid = arr(da.grid, "displacer.advance.grid", (row, path) =>
    arr(row, path, (cell, cellPath) => arr(cell, cellPath, (value, numberPath) =>
      integer(value, numberPath, 1))));
  const gridValues = grid.flat(2);
  unique(gridValues.map(String), "displacer grid numbers");
  if (data.contentKind === "owner-verified" && (
    grid.length !== 3 || grid.some(row => row.length !== 3) ||
    gridValues.length !== 18 || gridValues.some(value => value < 2 || value > 19)
  )) throw new Error("Displacer grid must contain verified 2–19 layout");
  const dd = object(displacer.defeat, "displacer.defeat");
  for (const key of ["name", "location", "cost", "roll", "coveredResult", "uncoveredResult"]) {
    string(dd[key], `displacer.defeat.${key}`);
  }
  const special = object(dd.specialResults, "specialResults");
  Object.entries(special).forEach(([key, value]) => string(value, `specialResults.${key}`));
  if (data.contentKind === "owner-verified" && (
    heroes.length !== 5 || heroes.some(hero => hero.actions !== 4 || (hero.outcomes as unknown[]).length !== 5) ||
    items.length !== 30 || items.some(item => item.quantity !== 2) || items.reduce((n, x) => n + (x.quantity as number), 0) !== 60 ||
    [...ITEM_COLORS].some(color => items.filter(item => item.color === color).reduce((n, item) => n + (item.quantity as number), 0) !== 20) ||
    citizens.length !== 10 || citizens.some(citizen => citizen.quantity !== 1) ||
    cards.length !== 22 || cards.reduce((n, x) => n + (x.quantity as number), 0) !== 30 ||
    perks.length !== 10 || perks.reduce((n, x) => n + (x.quantity as number), 0) !== 20 ||
    faces.reduce((n, x) => n + (x.quantity as number), 0) !== 4 ||
    beholder.damageMarkers !== 10 || eye.length !== 10 || allRays.length !== 11 ||
    (ba.outcomes as unknown[]).length !== 4 || monsterDice.quantity !== 3 || d20.quantity !== 1
  )) throw new Error("Verified component counts inconsistent");
  return data;
}

/** Convert only the immutable owner record version supported by this schema. */
export function normalizeVerifiedRecord(recordValue: unknown, recordSha256: string, interpretationVersion: string): GameData {
  const record = object(recordValue, "record");
  if (record.record_version !== 6) throw new Error("Unsupported verification record version");
  if (!/^[a-f0-9]{64}$/.test(recordSha256)) throw new Error("Invalid source hash");
  const verified = object(record.physical_verification, "physical_verification");
  const sameSubset = (actual: unknown, expected: unknown, path: string): void => {
    const fields = object(expected, path), source = object(actual, path);
    for (const [key, expectedValue] of Object.entries(fields)) {
      const sourceValue = source[key];
      if (JSON.stringify(sourceValue) !== JSON.stringify(expectedValue)) throw new Error(`${path}.${key} conflicts with physical confirmation`);
    }
  };
  const checkConfirmedEntries = (reference: unknown, physical: unknown, path: string) => {
    const actual = array(reference, path), confirmation = array(physical, `${path}.confirmed`);
    if (actual.length !== confirmation.length) throw new Error(`${path} confirmation count mismatch`);
    for (let i = 0; i < actual.length; i++) sameSubset(actual[i], confirmation[i], `${path}[${i}]`);
  };
  const getUrls = (source: unknown): string[] => {
    const found = new Set<string>();
    const scan = (value: unknown) => {
      if (typeof value === "string" && /^https?:\/\//.test(value)) found.add(value);
      else if (Array.isArray(value)) value.forEach(scan);
      else if (value && typeof value === "object") {
        for (const [key, nested] of Object.entries(value)) {
          if (!key.startsWith("excluded_") && key !== "excluded_image_source") scan(nested);
        }
      }
    };
    scan(source);
    return [...found].sort();
  };
  const componentSourceUrls: Record<string, string[]> = {};
  for (const [name, key] of Object.entries({
    board: "reference_board", heroes: "reference_hero_abilities", items: "reference_items_source",
    citizens: "reference_citizens", monsterCards: "reference_monster_deck", perks: "reference_perks",
    lairTokens: "physical_verification", dice: "reference_dice", beholder: "reference_beholder_mat",
    beholderRays: "reference_beholder_rays", displacerBeast: "reference_displacer_beast_mat",
  })) componentSourceUrls[name] = getUrls(record[key]);
  const board = object(record.reference_board, "reference_board"); const features = object(board.special_features, "special_features"); const transcription = object(board.connection_transcription, "connection_transcription");
  const numbered = arr(board.numbered_locations, "numbered_locations", (v, p) => { const x = object(v, p); return { number: integer(x.number, `${p}.number`, 1), name: string(x.name, `${p}.name`) }; });
  const unnumbered = strings(features.unnumbered_named_locations, "unnumbered_named_locations");
  const regions = strings(features.teleportation_circle_regions, "teleportation_circle_regions");
  const names = [...numbered.map(x => x.name), ...unnumbered, ...regions.map(x => `Teleportation Circle (${x})`)]; unique(names, "source location names");
  const ids = new Map(names.map((name, i) => [name, i < numbered.length ? `location-${numbered[i].number}` : `location-${idOf(name)}`]));
  const lookup = (name: unknown, path: string) => { const key = string(name, path), id = ids.get(key); if (!id) throw new Error(`${path}: unknown location ${key}`); return id; };
  const pairEdges = (value: unknown, path: string, kind: "ordinary" | "passage") => arr(value, path, (v, p) => { const pair = strings(v, p); if (pair.length !== 2) throw new Error(`${p} must have two endpoints`); return { from: lookup(pair[0], p), to: lookup(pair[1], p), kind }; });
  const ordinary = pairEdges(transcription.clear_drawn_connections, "clear_drawn_connections", "ordinary");
  if (ordinary.length !== 28) throw new Error("Source must provide 28 clear ordinary connections");
  const passages = pairEdges(features.printed_passage_pairs, "printed_passage_pairs", "passage");
  const circles = regions.map(x => lookup(`Teleportation Circle (${x})`, "circle"));
  const teleports = circles.flatMap((from, i) => circles.slice(i + 1).map(to => ({ from, to, kind: "teleport" as const })));
  const printedDragonExclusion = new Set(strings(features.crossed_monster_symbols, "crossed_monster_symbols"));
  const sourceHeroes = object(record.reference_hero_abilities, "reference_hero_abilities");
  const heroBasics = arr(field(record.reference_hero_basics, "entries", "reference_hero_basics"), "hero basics", (v, p) => object(v, p));
  const heroes = heroBasics.map((basic, index) => {
    const name = string(basic.name, `hero[${index}].name`);
    const ability = object(sourceHeroes[name], `ability.${name}`);
    const actions = integer(basic.actions, "hero actions", 1);
    if (integer(ability.actions, "ability actions", 1) !== actions) throw new Error(`${name} action mismatch`);
    const outcomes = arr(ability.outcomes, "hero outcomes", (value, path) => {
      const result = object(value, path);
      return {
        min: integer(result.roll_min, `${path}.roll_min`, 1),
        max: integer(result.roll_max, `${path}.roll_max`, 1),
        effect: string(result.effect, `${path}.effect`),
      };
    });
    return {
      id: `hero-${idOf(name)}`, name, actions,
      start: lookup(basic.starting_location, "hero start"),
      specialAction: string(ability.special_action, "special_action"), outcomes,
    };
  });
  const items = arr(record.reference_items, "reference_items", (value, path) => {
    const item = object(value, path);
    const name = string(item.name, `${path}.name`);
    const color = string(item.color, `${path}.color`);
    const strength = integer(item.strength, `${path}.strength`, 1);
    const locations = arr(item.locations, `${path}.locations`, lookup);
    const id = `item-${idOf(name)}-${idOf(color)}-${strength}-${locations.map(idOf).join("-")}`;
    return { id, name, color, strength, quantity: integer(item.quantity, `${path}.quantity`, 1), locations };
  });
  checkConfirmedEntries(record.reference_items, field(verified.items, "confirmed_entries", "verified.items"), "items");
  const citizens = arr(record.reference_citizens, "reference_citizens", (value, path) => {
    const citizen = object(value, path);
    const name = string(citizen.name, `${path}.name`);
    return {
      id: `citizen-${idOf(name)}`, name,
      quantity: integer(citizen.quantity, `${path}.quantity`, 1),
      safeDestination: lookup(citizen.safe_destination, `${path}.safe_destination`),
    };
  });
  checkConfirmedEntries(record.reference_citizens, field(verified.citizens, "confirmed_entries", "verified.citizens"), "citizens");
  const deck = object(record.reference_monster_deck, "reference_monster_deck");
  const cardSources = object(deck.cards, "cards");
  const sourceCounts = object(deck.source_card_id_counts, "source_card_id_counts");
  const cards = Object.entries(cardSources)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([key, value]) => {
      const card = object(value, `card.${key}`);
      const printedId = integer(card.card_id, "card_id", 1);
      const quantity = integer(card.quantity, "quantity", 1);
      if (String(printedId) !== key || sourceCounts[key] !== quantity) {
        throw new Error(`Card ${key} count mismatch`);
      }
      return {
        id: `monster-card-${key}`, printedId,
        name: string(card.name, "card name"), quantity,
        itemsDrawn: integer(card.items_drawn, "items_drawn"),
        activationSymbols: activationSymbols(card.strike_symbols_visual, "strike_symbols_visual"),
        movement: integer(card.movement, "movement"),
        attackDice: integer(card.attack_dice, "attack_dice"),
        event: typeof card.event === "string" ? string(card.event, "event") : string(card.body_kind, "body_kind"),
        ...(card.citizen_starting_location === undefined ? {} : {
          citizenStartingLocation: lookup(card.citizen_starting_location, "citizen_starting_location"),
        }),
      };
    });
  if (cards.length !== deck.expected_unique_faces || cards.reduce((n,x) => n+x.quantity,0) !== deck.expected_total_cards) throw new Error("Monster deck count mismatch");
  const confirmedCards = arr(field(verified.monster_cards, "confirmed_cards", "verified.monster_cards"), "confirmed cards", (v,p)=>object(v,p));
  if (confirmedCards.length !== cards.length) throw new Error("Monster card confirmation count mismatch");
  for (const confirmation of confirmedCards) {
    const printedId = integer(confirmation.card_id, "confirmed card ID", 1);
    sameSubset(cardSources[String(printedId)], confirmation.confirmed_values, `card ${printedId}`);
  }
  const perkSource = object(record.reference_perks, "reference_perks");
  const perks = arr(perkSource.entries, "perks", (value, path) => {
    const perk = object(value, path);
    const name = string(perk.name, `${path}.name`);
    return {
      id: `perk-${idOf(name)}`, name,
      quantity: integer(perk.quantity, `${path}.quantity`, 1),
      effect: string(perk.printed_effect, `${path}.printed_effect`),
    };
  });
  checkConfirmedEntries(perkSource.entries, field(verified.perks, "confirmed_entries", "verified.perks"), "perks");
  if (perks.length !== perkSource.unique_faces ||
      perks.reduce((total, perk) => total + perk.quantity, 0) !== perkSource.expected_total) {
    throw new Error("Perk count mismatch");
  }
  const lairSource = object(field(verified, "lair_tokens", "physical_verification"), "lair_tokens");
  const lairInventory = object(lairSource.inventory_and_common_back, "lair inventory");
  const lairInstructions = arr(field(lairSource.instructions, "confirmed_entries", "lair instructions"),
    "lair instructions", (value, path) => object(value, path));
  const lairFaces = arr(lairInventory.confirmed_faces, "lair faces", (value, path) => {
    const face = object(value, path);
    const printedId = integer(face.card_id, `${path}.card_id`, 1);
    const name = string(face.name, `${path}.name`);
    const quantity = integer(face.quantity, `${path}.quantity`, 1);
    const instruction = lairInstructions.find(entry => entry.card_id === printedId);
    if (instruction && instruction.quantity !== quantity) throw new Error(`Lair ${printedId} quantity mismatch`);
    return {
      id: `lair-${printedId}`, printedId, name, quantity,
      ...(instruction ? { effect: string(instruction.printed_effect, `lair ${printedId} effect`) } : {}),
    };
  });
  if (lairFaces.reduce((total, face) => total + face.quantity, 0) !== lairInventory.confirmed_total) {
    throw new Error("Lair token count mismatch");
  }
  const lairBack = object(lairInventory.confirmed_common_back, "lair common back");
  const dice = object(record.reference_dice, "reference_dice");
  const md = object(dice.monster_dice, "monster_dice");
  const d20 = object(dice.d20, "d20");
  const counts = object(md.face_counts_per_die, "face_counts_per_die");
  const faceCounts: Record<string, number> = {};
  for (const [key, value] of Object.entries(counts)) faceCounts[key] = integer(value, `face_counts.${key}`);
  const bm = object(record.reference_beholder_mat, "beholder_mat");
  const rays = object(record.reference_beholder_rays, "beholder_rays");
  const db = object(record.reference_displacer_beast_mat, "displacer_beast_mat");
  const readRays = (value: unknown, path: string) => arr(value, path, (entry, entryPath) => {
    const ray = object(entry, entryPath);
    return {
      ...range(ray.range, `${entryPath}.range`),
      name: string(ray.name, `${entryPath}.name`),
      effect: string(ray.effect, `${entryPath}.effect`),
    };
  });
  const bAdvance = object(bm.advance, "beholder.advance");
  const bDefeat = object(bm.defeat, "beholder.defeat");
  const bPower = object(bm.power, "beholder.power");
  const bRequirement = object(bDefeat.printed_requirement, "beholder.requirement");
  const dAdvance = object(db.advance, "displacer.advance");
  const dDefeat = object(db.defeat, "displacer.defeat");
  const dPower = object(db.power, "displacer.power");
  const terrorTrack = object(features.terror_track, "terror_track");
  const locationByNumber = (value: unknown, path: string) => {
    const number = integer(value, path, 1);
    return lookup(numbered.find(location => location.number === number)?.name, path);
  };
  const boardData: GameData["board"] = {
    locations: [
      ...numbered.map(location => ({
        id: lookup(location.name, "numbered"), name: location.name,
        kind: "numbered" as const, number: location.number,
      })),
      ...unnumbered.map(name => ({
        id: lookup(name, "unnumbered"), name, kind: "unnumbered" as const,
        printedDragonExclusion: printedDragonExclusion.has(name),
      })),
      ...regions.map(region => {
        const name = `Teleportation Circle (${region})`;
        return { id: lookup(name, "circle"), name, kind: "circle" as const, region };
      }),
    ],
    edges: [...ordinary, ...passages, ...teleports],
    terrorTrack: array(terrorTrack.printed_values, "printed_values") as (number | string)[],
    soloLabelAt: integer(terrorTrack.solo_play_label_at, "solo_play_label_at"),
    hospital: locationByNumber(features.hospital_symbol_location, "hospital"),
    monsterStarts: arr(features.monster_start_symbols, "monster_start_symbols", (value, path) => {
      const start = object(value, path);
      return {
        number: integer(start.start_number, `${path}.start_number`, 1),
        location: locationByNumber(start.location_number, `${path}.location_number`),
      };
    }),
    lairLocations: arr(features.lair_token_location_numbers, "lair_token_location_numbers", locationByNumber),
  };
  const readEffectRange = (value: unknown, path: string) => {
    const entry = object(value, path);
    return { ...range(entry.range, `${path}.range`), effect: string(entry.effect, `${path}.effect`) };
  };
  const beholderData: GameData["monsters"]["beholder"] = {
    frenzyOrder: integer(bm.frenzy_order, "beholder.frenzy_order", 1),
    activationSymbols: activationSymbols(bm.left_strip_symbols_visual, "beholder symbols"),
    objective: string(bm.objective, "beholder objective"),
    power: {
      name: string(bPower.name, "beholder power name"),
      resolution: string(bPower.resolution, "beholder power resolution"),
    },
    advance: {
      name: string(bAdvance.name, "beholder advance name"),
      location: string(bAdvance.location, "beholder advance location"),
      cost: string(bAdvance.cost, "beholder cost"),
      roll: string(bAdvance.roll, "beholder roll"),
      outcomes: arr(bAdvance.outcomes, "beholder advance outcomes", readEffectRange),
    },
    eyestalks: arr(bm.eyestalks, "eyestalks", (value, path) => {
      const entry = object(value, path);
      return { ...range(entry.range, `${path}.range`), name: string(entry.name, `${path}.name`) };
    }),
    rays: { front: readRays(rays.front, "front rays"), back: readRays(rays.back, "back rays") },
    defeat: {
      name: string(bDefeat.name, "beholder defeat name"),
      prerequisite: string(bDefeat.prerequisite, "beholder prerequisite"),
      location: string(bDefeat.location, "beholder defeat location"),
      color: string(bRequirement.color, "beholder color"),
      threshold: string(bRequirement.threshold, "beholder threshold"),
    },
    damageMarkers: integer(field(bm.damage_markers, "quantity", "damage_markers"), "damage marker quantity", 1),
  };
  const displacerData: GameData["monsters"]["displacerBeast"] = {
    frenzyOrder: integer(db.frenzy_order, "displacer.frenzy_order", 1),
    activationSymbols: activationSymbols(db.left_strip_symbols_visual, "displacer symbols"),
    power: {
      name: string(dPower.name, "displacer power name"),
      effect: string(dPower.effect, "displacer power effect"),
    },
    advance: {
      name: string(dAdvance.name, "displacer advance name"),
      location: string(dAdvance.location, "displacer advance location"),
      printedRequirement: string(dAdvance.printed_requirement, "displacer requirement"),
      minimumItems: integer(dAdvance.minimum_placed_items_to_attempt_strike, "minimum_items", 1),
      grid: arr(dAdvance.grid_top_to_bottom_left_to_right, "displacer grid", (row, path) =>
        arr(row, path, (cell, cellPath) => arr(cell, cellPath, (value, numberPath) =>
          integer(value, numberPath, 1))),
      ),
    },
    defeat: {
      name: string(dDefeat.name, "displacer defeat name"),
      location: string(dDefeat.location, "displacer defeat location"),
      cost: string(dDefeat.cost_printed, "displacer cost"),
      roll: string(dDefeat.roll, "displacer roll"),
      coveredResult: string(dDefeat.covered_result, "covered result"),
      uncoveredResult: string(dDefeat.uncovered_result, "uncovered result"),
      specialResults: Object.fromEntries(Object.entries(object(dDefeat.special_results, "special results"))
        .map(([key, value]) => [key, string(value, `special result ${key}`)])),
    },
  };
  const data: GameData = {
    schemaVersion: GAME_DATA_SCHEMA_VERSION,
    contentKind: "owner-verified",
    gameId: "horrified-dnd",
    edition: "original-base",
    interpretationVersion: string(interpretationVersion, "interpretationVersion"),
    effectStatus: "reference-prose-only",
    capabilities: { setupVerified: false, playableRulesEngine: false },
    provenance: {
      recordVersion: 6,
      recordSha256,
      verification: "Owner-confirmed physical components; mechanics and prose effects are not executable",
      componentPointers: {
        board: "/reference_board", heroes: "/reference_hero_abilities", items: "/reference_items",
        citizens: "/reference_citizens", monsterCards: "/reference_monster_deck/cards",
        perks: "/reference_perks/entries", lairTokens: "/physical_verification/lair_tokens",
        dice: "/reference_dice", beholder: "/reference_beholder_mat",
        beholderRays: "/reference_beholder_rays", displacerBeast: "/reference_displacer_beast_mat",
      },
      componentSourceUrls,
    },
    board: boardData,
    heroes, items, citizens, monsterCards: cards, perks,
    lairTokens: {
      faces: lairFaces,
      sharedBack: {
        requirement: string(lairBack.requirement, "lair requirement"),
        itemSymbols: strings(lairBack.item_symbols, "lair item symbols"),
      },
    },
    dice: {
      monsterDice: {
        quantity: integer(md.quantity, "monster dice quantity", 1),
        facesPerDie: integer(md.faces_per_die, "faces_per_die", 1),
        faceCounts,
      },
      d20: {
        quantity: integer(d20.quantity, "d20 quantity", 1),
        faces: arr(d20.faces, "d20 faces", (value, path) => integer(value, path, 1)),
      },
    },
    monsters: { beholder: beholderData, displacerBeast: displacerData },
  };
  return validateGameData(data);
}

/** Attach independently photographed printed setup without mutating the immutable v6 record. */
export function attachVerifiedSetup(
  base: GameData,
  supplementValue: unknown,
  actualPhotoSha256: string,
): GameData {
  validateGameData(base);
  if (base.contentKind !== "owner-verified" || base.capabilities.setupVerified || base.setup) {
    throw new Error("Setup supplement requires unconfigured owner-verified data");
  }
  const supplement = object(supplementValue, "setup supplement");
  if (supplement.supplementVersion !== 1) throw new Error("Unsupported setup supplement version");
  if (supplement.baseRecordVersion !== base.provenance.recordVersion ||
      supplement.baseRecordSha256 !== base.provenance.recordSha256) {
    throw new Error("Setup supplement does not match the verified base record");
  }
  if (supplement.ownerConfirmation !== false) throw new Error("Setup source must not claim owner confirmation");
  if (supplement.sourceKind !== "photograph-of-printed-component") throw new Error("Unsupported setup source kind");
  if (supplement.sourceFile !== "online-monster-setup.jpg") throw new Error("Unexpected setup photo file");
  const sourceUrl = string(supplement.sourceUrl, "setup.sourceUrl");
  if (!/^https:\/\//.test(sourceUrl)) throw new Error("Invalid setup source URL");
  const expectedPhotoSha256 = string(supplement.sourceSha256, "setup.sourceSha256");
  if (!/^[a-f0-9]{64}$/.test(expectedPhotoSha256) || expectedPhotoSha256 !== actualPhotoSha256) {
    throw new Error("Setup photo hash mismatch");
  }
  const observed = object(supplement.observedSetup, "observedSetup");
  const beholder = object(observed.beholder, "observedSetup.beholder");
  const displacer = object(observed.displacerBeast, "observedSetup.displacerBeast");
  const beholderMarker = integer(beholder.boardStartMarker, "beholder start marker", 1);
  const displacerMarker = integer(displacer.boardStartMarker, "displacer start marker", 1);
  if (beholderMarker !== 4 || displacerMarker !== 1) throw new Error("Unexpected selected monster start markers");
  const beholderDamageMarkers = integer(beholder.damageMarkersInSupply, "beholder damage markers", 1);
  if (beholderDamageMarkers !== base.monsters.beholder.damageMarkers ||
      beholder.damageMarkerSymbol !== "X" || beholder.eyeRayReferenceBesideMat !== true) {
    throw new Error("Beholder setup does not match the verified mat and reference card");
  }
  const crossReference = object(supplement.boardCrossReference, "boardCrossReference");
  const resolveStart = (marker: number, reference: unknown, path: string) => {
    const locationId = base.board.monsterStarts.find(start => start.number === marker)?.location;
    const boardLocation = base.board.locations.find(location => location.id === locationId);
    const printedReference = object(reference, path);
    if (!boardLocation || printedReference.locationId !== locationId || printedReference.name !== boardLocation.name) {
      throw new Error(`${path} conflicts with board start marker ${marker}`);
    }
    return locationId;
  };
  const beholderLocation = resolveStart(beholderMarker, crossReference.beholder, "boardCrossReference.beholder");
  const displacerLocation = resolveStart(displacerMarker, crossReference.displacerBeast, "boardCrossReference.displacerBeast");
  return validateGameData({
    ...base,
    capabilities: { ...base.capabilities, setupVerified: true },
    setup: {
      beholderLocation,
      displacerLocation,
      beholderDamageMarkers,
      beholderReferenceReady: true,
      provenance: {
        sourceUrl,
        photoSha256: actualPhotoSha256,
        sourceKind: "photograph-of-printed-component",
      },
    },
  });
}
