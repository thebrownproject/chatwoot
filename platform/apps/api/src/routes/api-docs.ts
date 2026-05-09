/**
 * API documentation endpoint.
 *
 * GET /api/v1/docs — returns a listing of all available endpoints.
 */

import { Hono } from 'hono';
import { endpointDocs } from './endpoint-docs.js';

const apiDocs = new Hono();

apiDocs.get('/', (c) => {
  // Group by module
  const byModule: Record<string, typeof endpointDocs> = {};
  for (const ep of endpointDocs) {
    if (!byModule[ep.module]) {
      byModule[ep.module] = [];
    }
    byModule[ep.module]!.push(ep);
  }

  return c.json({
    version: '0.1.0',
    totalEndpoints: endpointDocs.length,
    modules: Object.keys(byModule).sort(),
    endpoints: byModule,
  });
});

export { apiDocs };
