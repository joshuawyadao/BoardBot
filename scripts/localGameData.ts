import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { MAX_SAVE_LENGTH, validateLocalGameData } from '../src/data/localGameData.ts';

export const LOCAL_GAME_DATA_PATH = '/__boardbot/local-game-data';

type Next = () => void;

function loopback(value: string | undefined): boolean {
  if (!value) return false;
  return value === '127.0.0.1' || value === '::1' || value === '::ffff:127.0.0.1';
}

function allowedRequest(request: IncomingMessage): boolean {
  if (!loopback(request.socket.remoteAddress)) return false;
  let host: URL;
  try {
    host = new URL(`http://${request.headers.host ?? ''}`);
  } catch {
    return false;
  }
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(host.hostname)) return false;
  const site = request.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = request.headers.origin;
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (parsed.protocol !== 'http:' || parsed.host !== host.host) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function send(response: ServerResponse, status: number, message: string): void {
  response.statusCode = status;
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  response.end(message);
}

async function readPreparedFile(projectRoot: string): Promise<Buffer> {
  const localDirectory = join(projectRoot, 'local-data');
  const gameDirectory = join(localDirectory, 'horrified-dnd');
  for (const directory of [localDirectory, gameDirectory]) {
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('unavailable');
  }
  const path = join(gameDirectory, 'game-data.json');
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile()) throw new Error('unavailable');
    if (info.size > MAX_SAVE_LENGTH) throw new Error('oversized');
    const buffer = Buffer.allocUnsafe(Math.min(info.size + 1, MAX_SAVE_LENGTH + 1));
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length > MAX_SAVE_LENGTH) throw new Error('oversized');
    const bytes = buffer.subarray(0, length);
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      validateLocalGameData(JSON.parse(text));
    } catch {
      throw new Error('invalid');
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

/** Serve only the owner's ignored prepared manifest to this local Vite app. */
export function createLocalGameDataMiddleware(projectRoot: string) {
  return async (request: IncomingMessage, response: ServerResponse, next: Next): Promise<void> => {
    // Vite normally serves files beneath its root, including ignored files.
    // Deny all direct URL spellings before its static and /@fs middleware runs.
    let decodedPath = request.url?.split('?', 1)[0] ?? '';
    try { decodedPath = decodeURIComponent(decodedPath); } catch { /* Vite handles malformed URLs. */ }
    if (decodedPath.split('/').includes('local-data')) {
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      send(response, 404, 'Not found.');
      return;
    }
    if (request.url !== LOCAL_GAME_DATA_PATH) {
      next();
      return;
    }
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Vary', 'Origin, Sec-Fetch-Site');
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      send(response, 405, 'Method not allowed.');
      return;
    }
    if (!allowedRequest(request)) {
      send(response, 403, 'The prepared game data is available only to this local app.');
      return;
    }
    try {
      const bytes = await readPreparedFile(projectRoot);
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Content-Length', bytes.length);
      response.end(bytes);
    } catch (error) {
      if (error instanceof Error && error.message === 'oversized') {
        send(response, 413, 'The prepared game data is too large.');
      } else if (error instanceof Error && error.message === 'invalid') {
        send(response, 422, 'The prepared game data is invalid. Run npm run data:prepare again.');
      } else if (error instanceof Error &&
        (error.message === 'unavailable' || ('code' in error && (error.code === 'ENOENT' || error.code === 'ELOOP')))) {
        send(response, 404, 'Prepared game data was not found. Run npm run data:prepare.');
      } else {
        send(response, 422, 'The prepared game data could not be read or validated.');
      }
    }
  };
}

export function createLocalGameDataPlugin(projectRoot: string): Plugin {
  return {
    name: 'boardbot-local-game-data',
    configureServer(server) {
      server.middlewares.use(createLocalGameDataMiddleware(projectRoot));
    },
    configurePreviewServer(server) {
      server.middlewares.use(createLocalGameDataMiddleware(projectRoot));
    },
  };
}
