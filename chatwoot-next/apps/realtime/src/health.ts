/**
 * Liveness probe used by Fly.io / Railway / k8s.
 *
 * Mounted on the same `http.Server` Socket.io is bound to; replies 200 to
 * `GET /healthz` and lets everything else fall through to socket.io's
 * upgrade handling.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

export const healthHandler = (
  req: IncomingMessage,
  res: ServerResponse
): boolean => {
  if (req.method === 'GET' && req.url === '/healthz') {
    // TODO: assert redis connection state before reporting healthy.
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ status: 'ok' }));
    return true;
  }
  return false;
};
