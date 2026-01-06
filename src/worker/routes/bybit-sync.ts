import { Hono } from 'hono';

export const bybitSyncRouter = new Hono()
  .post('/', async (c) => {
    // Placeholder implementation: return empty array of trades
    return c.json([]);
  });
