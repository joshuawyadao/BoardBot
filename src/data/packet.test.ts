import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { prepareGameData } from "../../scripts/prepare-game-data";

const temporary: string[] = [];
const ignoredRoot = resolve(import.meta.dirname, "../../local-data");
const createSyntheticPacketDirectory = async () => {
  await mkdir(ignoredRoot, { recursive: true });
  const directory = await mkdtemp(join(ignoredRoot, "synthetic-packet-test-"));
  temporary.push(directory);
  return directory;
};
afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

describe("private packet gate", () => {
  it("rejects a missing manifest without changing existing output", async () => {
    const directory = await createSyntheticPacketDirectory();
    const output = join(directory, "game-data.json");
    await writeFile(output, "existing private reference");
    await expect(prepareGameData(directory)).rejects.toThrow();
    expect(await readFile(output, "utf8")).toBe("existing private reference");
  });

  it("rejects a manifest hash mismatch without changing existing output", async () => {
    const directory = await createSyntheticPacketDirectory();
    const output = join(directory, "game-data.json");
    await writeFile(output, "existing private reference");
    await writeFile(join(directory, "packet-manifest.json"), JSON.stringify({
      record_version: 6,
      files_sha256: {
        "verification-record.json": "0".repeat(64),
        "owner-board.jpg": "1".repeat(64),
        "owner-perks-and-beholder-reverse.jpg": "2".repeat(64),
      },
    }));
    await writeFile(join(directory, "verification-record.json"), "synthetic invalid data");
    await expect(prepareGameData(directory)).rejects.toThrow(/hash mismatch/);
    expect(await readFile(output, "utf8")).toBe("existing private reference");
  });
});
