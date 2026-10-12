import http from 'node:http';
import type { Socket } from 'node:net';

/** Enforce one local origin at the network boundary, before any external DNS or connection. */
export async function loopbackProxy(baseURL: string) {
  const allowedOrigin = new URL(baseURL).origin;
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(allowedOrigin)) throw new Error('Expected the loopback production server.');
  const forwarded: string[] = [], denied: string[] = [];
  const sockets = new Set<Socket>();
  const server = http.createServer((request, response) => {
    let target: URL;
    try { target = new URL(request.url!); }
    catch { response.writeHead(400).end(); return; }
    if (target.origin !== allowedOrigin || target.username || target.password) {
      denied.push(target.href);
      response.writeHead(403).end('Only the local table server is reachable.');
      return;
    }
    forwarded.push(target.href);
    const upstream = http.request(target, {
      method: request.method,
      headers: { ...request.headers, host: target.host },
    }, incoming => {
      response.writeHead(incoming.statusCode!, incoming.headers);
      incoming.pipe(response);
    });
    upstream.on('error', () => {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
    request.on('aborted', () => upstream.destroy());
    request.pipe(upstream);
  });
  server.on('connect', (request, socket) => {
    denied.push(`CONNECT ${request.url}`);
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
  });
  server.on('upgrade', (request, socket) => {
    denied.push(`UPGRADE ${request.url}`);
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
  });
  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Proxy did not bind a local port.');
  return {
    url: `http://127.0.0.1:${address.port}`,
    forwarded,
    denied,
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    },
  };
}
