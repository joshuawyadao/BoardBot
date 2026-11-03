import { afterEach, describe, expect, it } from 'vitest';
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backupPrivateData, initializePrivateStore, restorePrivateData } from '../../scripts/private-data';
import { fighterFixture } from '../engine/fixtures/fighterFixture';

const roots: string[] = [];
async function workspace() {
  const root = await mkdtemp(join(tmpdir(), 'boardbot-private-store-test-'));
  roots.push(root);
  const project = join(root, 'checkout');
  const store = join(root, 'private-store');
  await mkdir(project);
  return { root, project, store };
}
async function preparedFile(root: string) {
  const source = join(root, 'prepared.json');
  const bytes = JSON.stringify(fighterFixture());
  await writeFile(source, bytes);
  return { source, bytes };
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

describe('durable private game data', () => {
  it('creates a private store and restores a validated prepared reference into a fresh checkout', async () => {
    const { root, project, store } = await workspace();
    await initializePrivateStore(store);
    expect((await lstat(store)).mode & 0o777).toBe(0o700);
    const { source, bytes } = await preparedFile(root);
    const archive = await backupPrivateData(source, store);
    expect(archive).toMatch(/^[a-f0-9]{64}$/);
    expect((await lstat(join(store, 'archives', archive))).mode & 0o777).toBe(0o700);
    expect((await lstat(join(store, 'archives', archive, 'game-data.json'))).mode & 0o777).toBe(0o600);
    expect(await restorePrivateData(project, store)).toBe(true);
    expect(await readFile(join(project, 'local-data', 'horrified-dnd', 'game-data.json'), 'utf8')).toBe(bytes);
    expect(await restorePrivateData(project, store)).toBe(true);
  });

  it('rejects malformed prepared data without making it the latest archive', async () => {
    const { root, store } = await workspace();
    const { source } = await preparedFile(root);
    const archive = await backupPrivateData(source, store);
    const malformed = join(root, 'malformed.json');
    await writeFile(malformed, JSON.stringify({ board: { locations: [] } }));
    await expect(backupPrivateData(malformed, store)).rejects.toThrow();
    expect(JSON.parse(await readFile(join(store, 'latest.json'), 'utf8'))).toEqual({ archive });
  });

  it('rejects archive corruption before creating a game-data directory', async () => {
    const { root, project, store } = await workspace();
    const { source } = await preparedFile(root);
    const archive = await backupPrivateData(source, store);
    await writeFile(join(store, 'archives', archive, 'game-data.json'), '{}');
    await expect(restorePrivateData(project, store)).rejects.toThrow();
    await expect(lstat(join(project, 'local-data', 'horrified-dnd'))).rejects.toThrow();
  });

  it('keeps a different existing reference untouched', async () => {
    const { root, project, store } = await workspace();
    const { source } = await preparedFile(root);
    await backupPrivateData(source, store);
    const target = join(project, 'local-data', 'horrified-dnd');
    await mkdir(target, { recursive: true });
    await writeFile(join(target, 'game-data.json'), 'existing private data');
    await expect(restorePrivateData(project, store)).rejects.toThrow();
    expect(await readFile(join(target, 'game-data.json'), 'utf8')).toBe('existing private data');
  });

  it('reports an absent archive for optional startup restore without creating data', async () => {
    const { project, store } = await workspace();
    expect(await restorePrivateData(project, store, true)).toBe(false);
    await expect(restorePrivateData(project, store)).rejects.toThrow();
    await expect(lstat(join(project, 'local-data'))).rejects.toThrow();
  });

  it('rejects symlinked input and a store nested inside the checkout', async () => {
    const { root, project, store } = await workspace();
    const { source } = await preparedFile(root);
    const link = join(root, 'linked.json');
    await symlink(source, link);
    await expect(backupPrivateData(link, store)).rejects.toThrow();
    await expect(restorePrivateData(project, join(project, 'private-store'), true)).rejects.toThrow();
  });

  it('preserves an exported save exactly while restoring only its components', async () => {
    const { root, project, store } = await workspace();
    const source = join(root, 'boardbot-save.json');
    const backup = JSON.stringify({ format: 'boardbot-local-game', data: fighterFixture(), state: { marker: 'synthetic backup' } });
    await writeFile(source, backup);
    const archive = await backupPrivateData(source, store);
    expect(await readFile(join(store, 'archives', archive, 'boardbot-save.json'), 'utf8')).toBe(backup);
    await restorePrivateData(project, store);
    expect(JSON.parse(await readFile(join(project, 'local-data', 'horrified-dnd', 'game-data.json'), 'utf8')))
      .toEqual(fighterFixture());
    await expect(lstat(join(project, 'local-data', 'horrified-dnd', 'boardbot-save.json'))).rejects.toThrow();
  });

  it('reuses a verified archive for identical content', async () => {
    const { root, store } = await workspace();
    const { source } = await preparedFile(root);
    const first = await backupPrivateData(source, store);
    const second = await backupPrivateData(source, store);
    expect(second).toBe(first);
    expect(await readdir(join(store, 'archives'))).toEqual([first]);
  });

  it('rejects an invalid original packet without changing the latest reference', async () => {
    const { root, store } = await workspace();
    const { source } = await preparedFile(root);
    const archive = await backupPrivateData(source, store);
    const packet = join(root, 'packet');
    await mkdir(join(packet, 'setup-evidence'), { recursive: true });
    for (const name of ['packet-manifest.json', 'verification-record.json', 'owner-board.jpg',
      'owner-perks-and-beholder-reverse.jpg', 'setup-evidence/setup-supplement.json',
      'setup-evidence/online-monster-setup.jpg']) {
      await writeFile(join(packet, name), name === 'packet-manifest.json' ? '{}' : 'synthetic invalid source');
    }
    await expect(backupPrivateData(packet, store)).rejects.toThrow();
    expect(JSON.parse(await readFile(join(store, 'latest.json'), 'utf8'))).toEqual({ archive });
  });

  it('rejects a forged pointer and a changed manifest', async () => {
    const { root, project, store } = await workspace();
    const { source } = await preparedFile(root);
    const archive = await backupPrivateData(source, store);
    await writeFile(join(store, 'latest.json'), JSON.stringify({ archive: '../outside' }));
    await expect(restorePrivateData(project, store)).rejects.toThrow();
    await writeFile(join(store, 'latest.json'), JSON.stringify({ archive }));
    const manifestPath = join(store, 'archives', archive, 'archive-manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.files['../outside'] = '0'.repeat(64);
    await writeFile(manifestPath, JSON.stringify(manifest));
    await expect(restorePrivateData(project, store)).rejects.toThrow();
    await expect(lstat(join(project, 'local-data', 'horrified-dnd'))).rejects.toThrow();
  });

  it('rejects a symlinked runtime destination without altering its target', async () => {
    const { root, project, store } = await workspace();
    const { source } = await preparedFile(root);
    await backupPrivateData(source, store);
    const outside = join(root, 'outside');
    await mkdir(outside);
    await mkdir(join(project, 'local-data'));
    await symlink(outside, join(project, 'local-data', 'horrified-dnd'));
    await expect(restorePrivateData(project, store)).rejects.toThrow();
    expect(await readdir(outside)).toEqual([]);
  });

});
