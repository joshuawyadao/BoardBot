/** Converts the ignored owner packet into an ignored local runtime reference. */
import { createHash } from "node:crypto";
import { readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, sep } from "node:path";
import { attachVerifiedSetup, normalizeVerifiedRecord } from "../src/data/gameData.ts";
import { RULESET_VERSION } from "../src/engine/decisionPolicies.ts";

const EXPECTED_RECORD_HASH = "46ff404d179853f854dec0a8565139ec4455f8f60b7f41266cd4bbd16c97e853";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localDataRoot = join(root, "local-data");
const packet = join(localDataRoot, "horrified-dnd");
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export async function verifyPacket(packetDirectory: string): Promise<Uint8Array> {
  const manifest = JSON.parse(await readFile(join(packetDirectory, "packet-manifest.json"), "utf8")) as { record_version?: unknown; files_sha256?: Record<string, unknown> };
  if (manifest.record_version !== 6 || !manifest.files_sha256 || typeof manifest.files_sha256 !== "object") throw new Error("Unsupported packet manifest");
  const required = ["verification-record.json", "owner-board.jpg", "owner-perks-and-beholder-reverse.jpg"];
  if (Object.keys(manifest.files_sha256).sort().join("|") !== [...required].sort().join("|")) throw new Error("Unexpected packet manifest file list");
  let recordBytes: Uint8Array | undefined;
  for (const name of required) {
    const expected = manifest.files_sha256[name];
    if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) throw new Error(`Invalid manifest hash for ${name}`);
    const bytes = await readFile(join(packetDirectory, name));
    if (sha256(bytes) !== expected) throw new Error(`Packet hash mismatch for ${name}`);
    if (name === "verification-record.json") recordBytes = bytes;
  }
  if (!recordBytes || sha256(recordBytes) !== EXPECTED_RECORD_HASH || manifest.files_sha256["verification-record.json"] !== EXPECTED_RECORD_HASH) throw new Error("Canonical source record hash mismatch");
  return recordBytes;
}

export async function prepareGameData(packetDirectory: string) {
  const safeDirectory = await realpath(packetDirectory);
  const safeRoot = await realpath(localDataRoot);
  if (!safeDirectory.startsWith(`${safeRoot}${sep}`)) throw new Error("Output must stay under ignored local-data");
  const output = join(safeDirectory, "game-data.json");
  const recordBytes = await verifyPacket(safeDirectory);
  const source = JSON.parse(new TextDecoder().decode(recordBytes)) as unknown;
  const base = normalizeVerifiedRecord(source, EXPECTED_RECORD_HASH, RULESET_VERSION);
  const setupDirectory = join(safeDirectory, "setup-evidence");
  const supplement = JSON.parse(await readFile(join(setupDirectory, "setup-supplement.json"), "utf8")) as unknown;
  const setupPhoto = await readFile(join(setupDirectory, "online-monster-setup.jpg"));
  const normalized = attachVerifiedSetup(base, supplement, sha256(setupPhoto));
  const temporary = `${output}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(normalized, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
  return normalized;
}

async function main() {
  const normalized = await prepareGameData(packet);
  process.stdout.write(`Verified private packet and setup photo; wrote local game-data.json: ${normalized.board.locations.length} locations, ${normalized.board.edges.filter(edge => edge.kind === "ordinary").length} ordinary edges, ${normalized.items.reduce((total, item) => total + item.quantity, 0)} items, ${normalized.monsterCards.reduce((total, card) => total + card.quantity, 0)} monster cards, ${normalized.perks.reduce((total, perk) => total + perk.quantity, 0)} perks. Prose effects and gameplay remain unimplemented.\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`Game-data preparation failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
