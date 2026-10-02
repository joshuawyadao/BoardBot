import { describe, expect, it } from "vitest";
import { attachVerifiedSetup, normalizeVerifiedRecord, validateGameData, type GameData } from "./gameData";

function generatedRecord() {
  const locations = Array.from({ length: 20 }, (_, index) => ({ number: index + 1, name: `Place ${index + 1}` }));
  const names = locations.map(location => location.name);
  const ordinary = [
    ...Array.from({ length: 19 }, (_, index) => [names[index], names[index + 1]]),
    ...Array.from({ length: 9 }, (_, index) => [names[index], names[index + 2]]),
  ];
  const items = Array.from({ length: 30 }, (_, index) => ({
    color: ["red", "yellow", "blue"][index % 3],
    name: `Synthetic item ${index + 1}`,
    strength: (index % 4) + 1,
    quantity: 2,
    locations: [names[index % 20], names[(index + 1) % 20]],
  }));
  const citizens = Array.from({ length: 10 }, (_, index) => ({
    name: `Synthetic citizen ${index + 1}`, quantity: 1, safe_destination: names[index],
  }));
  const heroNames = ["Hero A", "Hero B", "Hero C", "Hero D", "Hero E"];
  const heroBasics = heroNames.map((name, index) => ({ name, actions: 4, starting_location: names[index] }));
  const heroAbilities = Object.fromEntries(heroNames.map(name => [name, {
    name, actions: 4, special_action: "Take a test action.",
    outcomes: Array.from({ length: 5 }, (_, index) => ({ roll_min: index * 4 + 1, roll_max: index * 4 + 4, effect: "A synthetic result." })),
  }]));
  const cards = Object.fromEntries(Array.from({ length: 22 }, (_, index) => {
    const cardId = 300 + index;
    return [String(cardId), {
      card_id: cardId, name: `Synthetic event ${index + 1}`,
      quantity: index < 8 ? 2 : 1, items_drawn: 1,
      strike_symbols_visual: ["black flame", "blue skull"], movement: 1,
      attack_dice: 1, event: "An invented event.",
      ...(index === 0 || (cardId >= 308 && cardId <= 311) || cardId >= 316
        ? { citizen_starting_location: names[9] } : {}),
    }];
  }));
  const sourceCounts = Object.fromEntries(Object.entries(cards).map(([id, value]) => [id, value.quantity]));
  const perks = Array.from({ length: 10 }, (_, index) => ({
    name: `Synthetic perk ${index + 1}`, quantity: 2, printed_effect: "An invented effect.",
  }));
  const lairFaces = [
    { card_id: 1, name: "Synthetic lair A", quantity: 1 },
    { card_id: 2, name: "Synthetic lair B", quantity: 1 },
    { card_id: 3, name: "Synthetic logo", quantity: 2 },
  ];
  const lairInstructions = lairFaces.slice(0, 2).map(face => ({ ...face, printed_effect: "An invented lair effect." }));
  const rays = (ranges: number[][]) => ranges.map(range => ({ range, name: "Synthetic ray", effect: "An invented ray effect." }));
  const record = {
    record_version: 6,
    reference_board: {
      source: "https://example.com/synthetic-board",
      excluded_image_source: { url: "https://example.com/rejected-stone-texture", reason: "wrong image" },
      local_reference: "/private/never-publish/board.jpg",
      numbered_locations: locations,
      special_features: {
        terror_track: { printed_values: [0, 1, 2, 3, 4, 5, 6, "end"], solo_play_label_at: 2 },
        hospital_symbol_location: 8,
        monster_start_symbols: Array.from({ length: 6 }, (_, index) => ({ start_number: index + 1, location_number: index + 1 })),
        lair_token_location_numbers: [1, 2, 3, 4],
        teleportation_circle_regions: ["North", "South", "East", "West"],
        unnumbered_named_locations: ["Unnumbered A", "Unnumbered B", "Unnumbered C", "Unnumbered D", "Unnumbered E"],
        printed_passage_pairs: [["Unnumbered A", "Unnumbered B"], ["Unnumbered C", "Unnumbered D"]],
        crossed_monster_symbols: ["Unnumbered A", "Unnumbered B"],
      },
      connection_transcription: { clear_drawn_connections: ordinary },
    },
    reference_hero_basics: { entries: heroBasics },
    reference_hero_abilities: heroAbilities,
    reference_items: items,
    reference_items_source: "https://example.com/synthetic-items",
    reference_citizens: citizens,
    reference_monster_deck: {
      source: "https://example.com/synthetic-deck", expected_total_cards: 30,
      expected_unique_faces: 22, source_card_id_counts: sourceCounts, cards,
    },
    reference_perks: { expected_total: 20, unique_faces: 10, entries: perks },
    reference_dice: {
      monster_dice: { quantity: 3, faces_per_die: 6, face_counts_per_die: { hit_starburst: 3, power_exclamation: 1, blank: 2 } },
      d20: { quantity: 1, faces: Array.from({ length: 20 }, (_, index) => index + 1) },
    },
    reference_beholder_mat: {
      frenzy_order: 1, left_strip_symbols_visual: ["black flame"], objective: "Invented objective.",
      power: { name: "Synthetic power", resolution: "Invented resolution." },
      advance: { name: "Synthetic advance", location: "monster's current location", cost: "invented cost", roll: "d20", outcomes: rays([[1, 1], [2, 15], [16, 19], [20, 20]]) },
      eyestalks: Array.from({ length: 10 }, (_, index) => ({ range: [index * 2 + 2, Math.min(index * 2 + 3, 20)], name: "Synthetic eyestalk" })),
      defeat: { name: "Synthetic defeat", prerequisite: "Invented prerequisite", location: "monster's current location", printed_requirement: { color: "blue", threshold: "6+" } },
      damage_markers: { quantity: 10 },
    },
    reference_beholder_rays: {
      front: rays([[1, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11]]),
      back: rays([[12, 13], [14, 15], [16, 17], [18, 19], [20, 20]]),
      front_source: "https://example.com/rays",
    },
    reference_displacer_beast_mat: {
      frenzy_order: 2, left_strip_symbols_visual: ["blue skull"],
      power: { name: "Synthetic power", effect: "Invented effect." },
      advance: {
        name: "Synthetic advance", location: "monster's current location",
        printed_requirement: "Invented requirement", minimum_placed_items_to_attempt_strike: 2,
        grid_top_to_bottom_left_to_right: Array.from({ length: 3 }, (_, row) =>
          Array.from({ length: 3 }, (_, column) => [2 + row * 6 + column * 2, 3 + row * 6 + column * 2])),
      },
      defeat: { name: "Synthetic defeat", location: "monster's current location", cost_printed: "Invented cost", roll: "d20", covered_result: "Covered", uncovered_result: "Uncovered", special_results: { "20": "Special" } },
    },
    physical_verification: {
      items: { confirmed_entries: structuredClone(items) }, citizens: { confirmed_entries: structuredClone(citizens) },
      perks: { confirmed_entries: structuredClone(perks) },
      monster_cards: { confirmed_cards: Object.values(cards).map(card => ({ card_id: card.card_id, confirmed_values: card })) },
      lair_tokens: {
        inventory_and_common_back: { confirmed_total: 4, confirmed_faces: lairFaces, confirmed_common_back: { requirement: "3+", item_symbols: ["red hexagon"] } },
        instructions: { confirmed_entries: lairInstructions },
      },
    },
  };
  return record;
}

const PHOTO_HASH = "b".repeat(64);
const setupSupplement = (base: GameData) => {
  const locationFor = (marker: number) => {
    const id = base.board.monsterStarts.find(start => start.number === marker)!.location;
    return { locationId: id, name: base.board.locations.find(location => location.id === id)!.name };
  };
  return {
    supplementVersion: 1,
    sourceKind: "photograph-of-printed-component",
    sourceUrl: "https://example.com/synthetic-printed-mat.jpg",
    sourceFile: "online-monster-setup.jpg",
    sourceSha256: PHOTO_HASH,
    ownerConfirmation: false,
    baseRecordVersion: 6,
    baseRecordSha256: base.provenance.recordSha256,
    observedSetup: {
      beholder: { boardStartMarker: 4, damageMarkersInSupply: 10, damageMarkerSymbol: "X", eyeRayReferenceBesideMat: true },
      displacerBeast: { boardStartMarker: 1 },
    },
    boardCrossReference: { beholder: locationFor(4), displacerBeast: locationFor(1) },
  };
};

describe("v6 normalization", () => {
  it("preserves verified multiplicities, location occurrences, and relative mat text", () => {
    const normalized = normalizeVerifiedRecord(generatedRecord(), "a".repeat(64), "synthetic-policy-v2");
    expect(normalized.board.edges.filter(edge => edge.kind === "ordinary")).toHaveLength(28);
    expect(normalized.board.edges.filter(edge => edge.kind === "passage")).toHaveLength(2);
    expect(normalized.board.edges.filter(edge => edge.kind === "teleport")).toHaveLength(6);
    expect(normalized.board.edges.some(edge => edge.from === "location-1" && edge.to === "location-20")).toBe(false);
    expect(normalized.board.locations.find(location => location.name === "Unnumbered A")?.printedDragonExclusion).toBe(true);
    expect(normalized.items[0].locations).toEqual(["location-1", "location-2"]);
    expect(normalized.monsterCards.reduce((total, card) => total + card.quantity, 0)).toBe(30);
    expect(normalized.monsterCards[0].citizenStartingLocation).toBe("location-10");
    expect(normalized.perks.reduce((total, perk) => total + perk.quantity, 0)).toBe(20);
    expect(normalized.monsters.beholder.advance.location).toBe("monster's current location");
    expect(normalized.monsters.displacerBeast.advance.grid.flat(2)).toHaveLength(18);
    expect(normalized.provenance.componentSourceUrls.board).toContain("https://example.com/synthetic-board");
    expect(normalized.provenance.componentSourceUrls.board).not.toContain("https://example.com/rejected-stone-texture");
    expect(JSON.stringify(normalized)).not.toContain("/private/never-publish");
    expect(normalized.capabilities.setupVerified).toBe(false);
  });

  it("rejects conflict with physical confirmation", () => {
    const record = generatedRecord();
    record.physical_verification.items.confirmed_entries[0].quantity = 1;
    expect(() => normalizeVerifiedRecord(record, "a".repeat(64), "synthetic-policy-v2")).toThrow(/conflicts with physical confirmation/);
  });

  it("rejects out-of-range verified fields and invalid teleport endpoints", () => {
    const baseline = normalizeVerifiedRecord(generatedRecord(), "a".repeat(64), "synthetic-policy-v2");
    const cases: { change: (data: GameData) => void; error: RegExp }[] = [
      { change: data => { data.board.locations[0].number = 21; }, error: /1–20/ },
      { change: data => { data.board.monsterStarts[0].number = 7; }, error: /1–6/ },
      { change: data => { data.items[0].strength = 7; }, error: /strength exceeds/ },
      { change: data => { data.monsterCards[0].attackDice = 4; }, error: /Attack dice exceed/ },
      { change: data => { data.monsterCards[0].printedId = 299; }, error: /no supported Monster-card event/ },
      { change: data => { data.monsterCards[0].printedId = 322; }, error: /no supported Monster-card event/ },
      { change: data => { delete data.monsterCards[8].citizenStartingLocation; }, error: /citizenStartingLocation is required/ },
      { change: data => { data.dice.monsterDice.faceCounts.hit_starburst = 2; data.dice.monsterDice.faceCounts.blank = 3; }, error: /distribution mismatch/ },
      { change: data => { data.board.edges.find(edge => edge.kind === "teleport")!.from = "location-1"; }, error: /two circles/ },
    ];
    for (const { change, error } of cases) {
      const data = structuredClone(baseline);
      change(data);
      expect(() => validateGameData(data)).toThrow(error);
    }
  });

  it("attaches photographed setup through selected board markers", () => {
    const base = normalizeVerifiedRecord(generatedRecord(), "a".repeat(64), "synthetic-policy-v2");
    expect(base.setup).toBeUndefined();
    expect(base.capabilities.setupVerified).toBe(false);
    const ready = attachVerifiedSetup(base, setupSupplement(base), PHOTO_HASH);
    expect(ready.schemaVersion).toBe(2);
    expect(ready.capabilities.setupVerified).toBe(true);
    expect(ready.capabilities.playableRulesEngine).toBe(false);
    expect(ready.setup?.beholderLocation).toBe("location-4");
    expect(ready.setup?.displacerLocation).toBe("location-1");
    expect(ready.setup?.beholderDamageMarkers).toBe(10);
    expect(ready.setup?.provenance.sourceKind).toBe("photograph-of-printed-component");
    expect(base.setup).toBeUndefined();
  });

  it("rejects missing, mismatched, and tampered setup evidence", () => {
    const base = normalizeVerifiedRecord(generatedRecord(), "a".repeat(64), "synthetic-policy-v2");
    const supplement = setupSupplement(base);
    expect(() => attachVerifiedSetup(base, {}, PHOTO_HASH)).toThrow(/Unsupported setup supplement version/);
    expect(() => attachVerifiedSetup(base, supplement, "c".repeat(64))).toThrow(/photo hash mismatch/);
    supplement.observedSetup.beholder.boardStartMarker = 1;
    expect(() => attachVerifiedSetup(base, supplement, PHOTO_HASH)).toThrow(/selected monster start markers/);
    supplement.observedSetup.beholder.boardStartMarker = 4;
    supplement.boardCrossReference.beholder.locationId = "location-5";
    expect(() => attachVerifiedSetup(base, supplement, PHOTO_HASH)).toThrow(/conflicts with board start marker/);
    supplement.boardCrossReference.beholder.locationId = "location-4";
    supplement.observedSetup.beholder.damageMarkersInSupply = 9;
    expect(() => attachVerifiedSetup(base, supplement, PHOTO_HASH)).toThrow(/does not match the verified mat/);
  });

  it("requires setup field exactly when setup capability is true", () => {
    const base = normalizeVerifiedRecord(generatedRecord(), "a".repeat(64), "synthetic-policy-v2");
    base.capabilities.setupVerified = true;
    expect(() => validateGameData(base)).toThrow(/Setup presence/);
    base.capabilities.setupVerified = false;
    base.setup = attachVerifiedSetup(base, setupSupplement(base), PHOTO_HASH).setup;
    expect(() => validateGameData(base)).toThrow(/Setup presence/);
  });
});
