import { describe, expect, it } from "vitest";
import { normalizeVerifiedRecord, validateGameData, type GameData } from "./gameData";
import { validateLocalGameData } from "./localGameData";

const synthetic = (): GameData => ({
  schemaVersion: 2,
  contentKind: "synthetic",
  gameId: "invented-test-game",
  edition: "test",
  interpretationVersion: "synthetic-v1",
  provenance: { recordVersion: 0, recordSha256: "synthetic", verification: "invented fixture", componentPointers: { board: "/board" }, componentSourceUrls: { board: [] } },
  effectStatus: "reference-prose-only",
  capabilities: { setupVerified: false, playableRulesEngine: false },
  board: {
    locations: [{ id: "location-1", name: "First", kind: "numbered", number: 1 }, { id: "location-2", name: "Second", kind: "numbered", number: 2 }],
    edges: [{ from: "location-1", to: "location-2", kind: "ordinary" }],
    terrorTrack: [0, 1, "end"], soloLabelAt: 1, hospital: "location-2",
    monsterStarts: [{ number: 1, location: "location-1" }], lairLocations: ["location-2"],
  },
  heroes: [{ id: "hero-a", name: "Hero A", actions: 4, start: "location-1", specialAction: "Roll.", outcomes: [{ min: 1, max: 20, effect: "Move." }] }],
  items: [{ id: "item-a", name: "Item A", color: "blue", strength: 2, quantity: 2, locations: ["location-1", "location-2"] }],
  citizens: [{ id: "citizen-a", name: "Citizen A", quantity: 1, safeDestination: "location-2" }],
  monsterCards: [{ id: "card-a", printedId: 1, name: "Event A", quantity: 1, itemsDrawn: 2, activationSymbols: ["black flame"], movement: 1, attackDice: 1, event: "Place a citizen." }],
  perks: [{ id: "perk-a", name: "Perk A", quantity: 1, effect: "Draw." }],
  lairTokens: { faces: [{ id: "lair-a", printedId: 1, name: "Lair A", quantity: 1 }], sharedBack: { requirement: "3+", itemSymbols: ["blue circle"] } },
  dice: { monsterDice: { quantity: 1, facesPerDie: 6, faceCounts: { hit: 3, power: 1, blank: 2 } }, d20: { quantity: 1, faces: Array.from({ length: 20 }, (_, i) => i + 1) } },
  monsters: {
    beholder: {
      frenzyOrder: 1, activationSymbols: ["black flame"], objective: "Goal.", power: { name: "Power", resolution: "Effect." },
      advance: { name: "Advance", location: "monster's location", cost: "item", roll: "d20", outcomes: [{ min: 1, max: 20, effect: "Result." }] },
      eyestalks: [{ min: 2, max: 20, name: "Eye" }], rays: { front: [{ min: 1, max: 10, name: "Ray A", effect: "Effect A" }], back: [{ min: 11, max: 20, name: "Ray B", effect: "Effect B" }] },
      defeat: { name: "Defeat", prerequisite: "Goal met", location: "monster's location", color: "blue", threshold: "6+" }, damageMarkers: 1,
    },
    displacerBeast: {
      frenzyOrder: 2, activationSymbols: ["blue skull"], power: { name: "Power", effect: "Effect." },
      advance: { name: "Advance", location: "monster's location", printedRequirement: "Place item", minimumItems: 1, grid: [[[1], [2]], [[3], [4]]] },
      defeat: { name: "Defeat", location: "monster's location", cost: "item", roll: "d20", coveredResult: "Yes", uncoveredResult: "No", specialResults: { "20": "Win" } },
    },
  },
});

describe("private game-data format", () => {
  it("accepts a complete synthetic reference without granting gameplay capability", () => {
    const value = validateGameData(synthetic());
    expect(value.capabilities.playableRulesEngine).toBe(false);
    expect(value.board.edges[0].kind).toBe("ordinary");
  });

  it("keeps arbitrary printed IDs in reference-only synthetic data but rejects unsupported local events", () => {
    const data = synthetic();
    expect(validateGameData(data)).toBe(data);
    expect(() => validateLocalGameData(data)).toThrow(/no supported resolution/);
    for (const printedId of [299, 322]) {
      data.monsterCards[0].printedId = printedId;
      expect(() => validateLocalGameData(data)).toThrow(/no supported resolution/);
    }
  });

  it("accepts both boundaries and an interior event in the executable local catalog", () => {
    const data = synthetic();
    for (const printedId of [300, 313, 321]) {
      data.monsterCards[0].printedId = printedId;
      if (printedId === 321) data.monsterCards[0].citizenStartingLocation = "location-1";
      expect(validateLocalGameData(data)).toBe(data);
    }
  });

  it("requires a real starting location for executable citizen events", () => {
    const data = synthetic();
    for (const printedId of [308, 311, 316, 321]) {
      data.monsterCards[0].printedId = printedId;
      delete data.monsterCards[0].citizenStartingLocation;
      expect(() => validateLocalGameData(data)).toThrow(/without a starting location/);
      data.monsterCards[0].citizenStartingLocation = "location-1";
      expect(validateLocalGameData(data)).toBe(data);
    }
    data.monsterCards[0].citizenStartingLocation = "missing";
    expect(() => validateLocalGameData(data)).toThrow(/missing location/);
  });

  it("rejects unsupported record versions before reading component fields", () => {
    expect(() => normalizeVerifiedRecord({ record_version: 7 }, "a".repeat(64), "v2")).toThrow(/Unsupported verification record version/);
  });

  it("rejects duplicate undirected edges and absent locations", () => {
    const value = synthetic();
    value.board.edges.push({ from: "location-2", to: "location-1", kind: "ordinary" });
    expect(() => validateGameData(value)).toThrow(/duplicates/);
    value.board.edges.pop();
    value.heroes[0].start = "missing";
    expect(() => validateGameData(value)).toThrow(/missing location/);
  });

  it("rejects a token count without every destination and overlapping roll ranges", () => {
    const value = synthetic();
    value.items[0].locations.pop();
    expect(() => validateGameData(value)).toThrow(/physical token destination/);
    value.items[0].locations.push("location-2");
    value.heroes[0].outcomes.push({ min: 20, max: 20, effect: "Again" });
    expect(() => validateGameData(value)).toThrow(/overlaps/);
  });

  it("rejects incomplete ray coverage and malformed grid numbers", () => {
    const value = synthetic();
    value.monsters.beholder.rays.back[0].min = 12;
    expect(() => validateGameData(value)).toThrow(/does not cover/);
    value.monsters.beholder.rays.back[0].min = 11;
    value.monsters.displacerBeast.advance.grid[0][0][0] = 0;
    expect(() => validateGameData(value)).toThrow(/integer/);
  });

  it("rejects false compatibility claims and malformed dice distributions", () => {
    const value = synthetic();
    (value.capabilities as { playableRulesEngine: boolean }).playableRulesEngine = true;
    expect(() => validateGameData(value)).toThrow(/Unsupported capability claim/);
    (value.capabilities as { playableRulesEngine: boolean }).playableRulesEngine = false;
    value.dice.monsterDice.faceCounts.blank = 3;
    expect(() => validateGameData(value)).toThrow(/face counts inconsistent/);
  });
});
