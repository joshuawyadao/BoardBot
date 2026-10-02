import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLocalGameDataMiddleware, LOCAL_GAME_DATA_PATH } from '../../scripts/localGameData';
import { fighterFixture } from '../engine/fixtures/fighterFixture';
import { MAX_SAVE_LENGTH } from '../session/gameSave';

let root: string;
const host = '127.0.0.1:5173';
async function putPrepared(contents: string) {
  const directory = join(root, 'local-data', 'horrified-dnd');
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'game-data.json'), contents);
}

async function request(path: string, options: {
  method?: string; headers?: Record<string, string>; remoteAddress?: string;
} = {}) {
  const headers: Record<string, string | number> = {};
  const result = { status: 200, body: '', headers, next: false };
  const incoming = {
    url: path, method: options.method ?? 'GET',
    headers: { host, ...options.headers },
    socket: { remoteAddress: options.remoteAddress ?? '127.0.0.1' },
  } as unknown as IncomingMessage;
  const outgoingObject = {
    statusCode: 200,
    setHeader(name: string, value: string | number) { headers[name.toLowerCase()] = value; },
    end(body?: string | Buffer) {
      result.status = outgoingObject.statusCode;
      result.body = body?.toString() ?? '';
    },
  };
  const outgoing = outgoingObject as unknown as ServerResponse;
  await createLocalGameDataMiddleware(root)(incoming, outgoing, () => { result.next = true; });
  return result;
}

beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'boardbot-endpoint-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('prepared local game data endpoint', () => {
  it('returns only validated synthetic data with private response headers', async () => {
    const data = fighterFixture();
    await putPrepared(JSON.stringify(data));
    const result = await request(LOCAL_GAME_DATA_PATH, {
      headers: { origin: `http://${host}`, 'sec-fetch-site': 'same-origin' },
    });
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toMatch(/application\/json/);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.headers['x-content-type-options']).toBe('nosniff');
    expect(result.headers['access-control-allow-origin']).toBeUndefined();
    expect(JSON.parse(result.body)).toEqual(data);
  });

  it('gives safe errors for missing, malformed, invalid, oversized, and symlinked data', async () => {
    const missing = await request(LOCAL_GAME_DATA_PATH);
    expect(missing.status).toBe(404);
    expect(missing.body).not.toContain(root);
    await putPrepared('{broken');
    expect((await request(LOCAL_GAME_DATA_PATH)).status).toBe(422);
    await putPrepared('{}');
    const invalid = await request(LOCAL_GAME_DATA_PATH);
    expect(invalid.status).toBe(422);
    expect(invalid.body).toMatch(/data:prepare/);
    await putPrepared('x'.repeat(MAX_SAVE_LENGTH + 1));
    expect((await request(LOCAL_GAME_DATA_PATH)).status).toBe(413);
    const file = join(root, 'local-data', 'horrified-dnd', 'game-data.json');
    await rm(file);
    await symlink(join(root, 'outside.json'), file);
    const linked = await request(LOCAL_GAME_DATA_PATH);
    expect(linked.status).toBe(404);
    expect(linked.body).not.toContain(root);
  });

  it('rejects direct files, other paths, methods, foreign origins, and remote clients', async () => {
    await putPrepared(JSON.stringify(fighterFixture()));
    for (const path of [
      '/local-data/horrified-dnd/game-data.json',
      '/%6cocal-data/horrified-dnd/game-data.json',
      `/@fs${root}/local-data/horrified-dnd/game-data.json`,
    ]) {
      const result = await request(path);
      expect(result.status).toBe(404);
      expect(result.body).toBe('Not found.');
    }
    expect((await request(`${LOCAL_GAME_DATA_PATH}?file=anything`)).next).toBe(true);
    expect((await request(LOCAL_GAME_DATA_PATH, { method: 'POST' })).status).toBe(405);
    expect((await request(LOCAL_GAME_DATA_PATH, { headers: { origin: 'http://attacker.invalid' } })).status).toBe(403);
    expect((await request(LOCAL_GAME_DATA_PATH, { headers: { 'sec-fetch-site': 'cross-site' } })).status).toBe(403);
    expect((await request(LOCAL_GAME_DATA_PATH, { remoteAddress: '192.0.2.25' })).status).toBe(403);
    expect((await request(LOCAL_GAME_DATA_PATH, { headers: { host: 'attacker.invalid' } })).status).toBe(403);
  });
});
