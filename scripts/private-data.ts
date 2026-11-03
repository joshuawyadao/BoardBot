/** Owner-only archives outside Git; runtime copies stay under ignored local-data. */
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, lstat, mkdir, mkdtemp, open, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_SAVE_LENGTH, validateLocalGameData } from '../src/data/localGameData.ts';
import { readVerifiedGameData } from './prepare-game-data.ts';

const packetFiles = [
  'packet-manifest.json', 'verification-record.json', 'owner-board.jpg',
  'owner-perks-and-beholder-reverse.jpg', 'setup-evidence/setup-supplement.json',
  'setup-evidence/online-monster-setup.jpg',
];
const allowedFiles = new Set([...packetFiles, 'game-data.json', 'boardbot-save.json']);
const hash = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
const digestPattern = /^[a-f0-9]{64}$/;
const missing = (error: unknown) => error instanceof Error && 'code' in error && error.code === 'ENOENT';
type Files = Record<string, Buffer>;

export function defaultPrivateStore(): string {
  return resolve(process.env.BOARDBOT_PRIVATE_HOME || join(homedir(), 'Documents', 'BoardBot Private Data'));
}

async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true; } catch (error) { if (missing(error)) return false; throw error; }
}

async function directory(path: string): Promise<void> {
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Private-data directories must be real directories, not symbolic links.');
}

/** Canonicalize a not-yet-created path through its nearest existing ancestor. */
async function canonicalPath(path: string): Promise<string> {
  let ancestor = resolve(path);
  const remainder: string[] = [];
  while (!await exists(ancestor)) {
    remainder.unshift(basename(ancestor));
    ancestor = dirname(ancestor);
  }
  return join(await realpath(ancestor), ...remainder);
}

/** Resolve existing ancestors before checking Git, including managed worktrees. */
async function outsideGit(path: string): Promise<void> {
  let ancestor = resolve(path);
  while (!await exists(ancestor)) ancestor = dirname(ancestor);
  ancestor = await realpath(ancestor);
  for (;;) {
    if (await exists(join(ancestor, '.git'))) throw new Error('Keep the durable private store outside every Git project/worktree.');
    const parent = dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
}

async function readRegular(path: string, maximum = 32 * 1024 * 1024): Promise<Buffer> {
  if (!(await lstat(path)).isFile()) throw new Error('Private-data inputs must be regular files, not symbolic links.');
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > maximum) throw new Error('Private-data file is invalid or too large.');
    const bytes = await handle.readFile();
    if (bytes.length > maximum) throw new Error('Private-data file is too large.');
    return bytes;
  } finally { await handle.close(); }
}

function validateComponents(bytes: Buffer): void {
  if (bytes.length > MAX_SAVE_LENGTH) throw new Error('Game data is too large.');
  validateLocalGameData(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
}

function checksums(files: Files): Record<string, string> {
  return Object.fromEntries(Object.keys(files).sort().map(name => [name, hash(files[name])]));
}

async function writeFiles(root: string, files: Files): Promise<void> {
  for (const [name, bytes] of Object.entries(files)) {
    await mkdir(dirname(join(root, name)), { recursive: true, mode: 0o700 });
    await writeFile(join(root, name), bytes, { flag: 'wx', mode: 0o600 });
  }
}

export async function initializePrivateStore(storeRoot: string): Promise<void> {
  await outsideGit(storeRoot);
  await mkdir(storeRoot, { recursive: true, mode: 0o700 });
  await directory(storeRoot);
  await chmod(storeRoot, 0o700);
  const archives = join(storeRoot, 'archives');
  await mkdir(archives, { mode: 0o700, recursive: true });
  await directory(archives);
  await chmod(archives, 0o700);
}

async function sourceFiles(source: string): Promise<Files> {
  const info = await lstat(source);
  if (info.isSymbolicLink()) throw new Error('Private-data input must not be a symbolic link.');
  if (info.isDirectory()) {
    await directory(join(source, 'setup-evidence'));
    const files: Files = {};
    for (const name of packetFiles) files[name] = await readRegular(join(source, name));
    // Validate the exact bytes to be archived, rather than rereading a changing source.
    return files;
  }
  const bytes = await readRegular(source, MAX_SAVE_LENGTH);
  const input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (input?.format === 'boardbot-local-game') {
    const components = Buffer.from(JSON.stringify(validateLocalGameData(input.data), null, 2) + '\n');
    return { 'game-data.json': components, 'boardbot-save.json': bytes };
  }
  validateComponents(bytes);
  return { 'game-data.json': bytes };
}

async function readArchive(storeRoot: string, digest: string): Promise<Files> {
  if (!digestPattern.test(digest)) throw new Error('Invalid private archive identifier.');
  await directory(storeRoot);
  await directory(join(storeRoot, 'archives'));
  const archive = join(storeRoot, 'archives', digest);
  await directory(archive);
  const manifest = JSON.parse((await readRegular(join(archive, 'archive-manifest.json'), 32 * 1024)).toString('utf8'));
  const sums: unknown = manifest.files;
  if (manifest.version !== 1 || !sums || typeof sums !== 'object' || Array.isArray(sums) || hash(JSON.stringify(sums)) !== digest) {
    throw new Error('Private archive manifest integrity check failed.');
  }
  const files: Files = {};
  for (const [name, expected] of Object.entries(sums)) {
    if (!allowedFiles.has(name) || typeof expected !== 'string' || !digestPattern.test(expected)) throw new Error('Invalid private archive entry.');
    if (name.startsWith('setup-evidence/')) await directory(join(archive, 'setup-evidence'));
    files[name] = await readRegular(join(archive, name));
    if (hash(files[name]) !== expected) throw new Error('Private archive file integrity check failed.');
  }
  if (!files['game-data.json']) throw new Error('Private archive has no prepared components.');
  validateComponents(files['game-data.json']);
  // Original evidence must always be complete, and pass the canonical verification gate.
  if (packetFiles.some(name => files[name])) {
    if (!packetFiles.every(name => files[name])) throw new Error('Private archive contains an incomplete evidence packet.');
    await readVerifiedGameData(archive);
  }
  return files;
}

export async function backupPrivateData(source: string, storeRoot: string): Promise<string> {
  const files = await sourceFiles(resolve(source));
  await initializePrivateStore(storeRoot);
  const temporary = await mkdtemp(join(storeRoot, 'archives', '.pending-'));
  try {
    await writeFiles(temporary, files);
    if (!files['game-data.json']) {
      files['game-data.json'] = Buffer.from(JSON.stringify(await readVerifiedGameData(temporary), null, 2) + '\n');
      await writeFiles(temporary, { 'game-data.json': files['game-data.json'] });
    }
    validateComponents(files['game-data.json']);
    const sums = checksums(files);
    const digest = hash(JSON.stringify(sums));
    await writeFiles(temporary, { 'archive-manifest.json': Buffer.from(JSON.stringify({ version: 1, files: sums }, null, 2) + '\n') });
    const target = join(storeRoot, 'archives', digest);
    if (await exists(target)) await readArchive(storeRoot, digest);
    else await rename(temporary, target);
    const pointer = join(storeRoot, `.latest-${randomUUID()}.tmp`);
    try {
      await writeFile(pointer, JSON.stringify({ archive: digest }) + '\n', { flag: 'wx', mode: 0o600 });
      await rename(pointer, join(storeRoot, 'latest.json'));
    } finally { await rm(pointer, { force: true }); }
    return digest;
  } finally { await rm(temporary, { recursive: true, force: true }); }
}

export async function restorePrivateData(projectRoot: string, storeRoot: string, ifPresent = false): Promise<boolean> {
  const project = await realpath(projectRoot);
  const store = await canonicalPath(storeRoot);
  if (store === project || store.startsWith(project + sep)) {
    throw new Error('Keep the durable private store outside the project/worktree.');
  }
  await outsideGit(storeRoot);
  if (!await exists(join(storeRoot, 'latest.json'))) {
    if (ifPresent) return false;
    throw new Error('No private archive is available. Recover the packet, prepared JSON, or an exported game backup, then run npm run data:backup -- <source>.');
  }
  const pointer = JSON.parse((await readRegular(join(storeRoot, 'latest.json'), 1024)).toString('utf8'));
  const files = await readArchive(storeRoot, pointer.archive);
  const local = join(projectRoot, 'local-data');
  await mkdir(local, { recursive: true, mode: 0o700 });
  await directory(local);
  const target = join(local, 'horrified-dnd');
  // Saves stay in the archive for explicit browser import, outside the served runtime copy.
  const runtime = Object.fromEntries(Object.entries(files).filter(([name]) => name !== 'boardbot-save.json'));
  if (await exists(target)) {
    await directory(target);
    for (const [name, bytes] of Object.entries(runtime)) {
      if (name.startsWith('setup-evidence/')) await directory(join(target, 'setup-evidence'));
      if (!await exists(join(target, name)) || !bytes.equals(await readRegular(join(target, name)))) {
        throw new Error('Existing local game data differs from the archive; nothing was overwritten. Back it up and move it aside before restoring.');
      }
    }
    // Existing extra files are left untouched; only required archived entries are compared.
    return true;
  }
  const temporary = await mkdtemp(join(local, '.restore-'));
  try {
    await writeFiles(temporary, runtime);
    await rename(temporary, target);
  } finally { await rm(temporary, { recursive: true, force: true }); }
  return true;
}

async function main(): Promise<void> {
  const [command, argument, ...extra] = process.argv.slice(2);
  const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const store = defaultPrivateStore();
  if (extra.length || !['init', 'backup', 'restore'].includes(command ?? '') ||
      (command === 'init' && argument) || (command === 'restore' && argument && argument !== '--if-present')) {
    throw new Error('Usage: npm run data:init | npm run data:backup -- [packet-directory-or-json] | npm run data:restore');
  }
  if (command === 'init') {
    await initializePrivateStore(store);
    process.stdout.write(`Private store ready: ${store}\nThis initializes storage only; no missing game data has been recovered.\n`);
  } else if (command === 'backup') {
    const archive = await backupPrivateData(argument || join(project, 'local-data', 'horrified-dnd'), store);
    process.stdout.write(`Private archive verified: ${store}/archives/${archive}\nOriginal evidence is included only when a complete source packet was supplied. Saves require replay validation when imported in the app.\n`);
  } else {
    const restored = await restorePrivateData(project, store, argument === '--if-present');
    process.stdout.write(restored ? 'Private components restored to ignored local-data/horrified-dnd.\n' : 'No durable private archive yet; cached browser components or one-time import may still be used.\n');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`Private-data operation failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
