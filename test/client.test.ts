import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { Xedo } from '../src/index';
import { BASE, server } from './server';
import { makeClient, ok } from './helpers';

describe('Xedo client', () => {
  it('requires an apiKey', () => {
    // @ts-expect-error intentionally missing apiKey
    expect(() => new Xedo({})).toThrow(/apiKey/i);
  });

  it('sends the Bearer auth header and unwraps `data` on ping', async () => {
    let authHeader: string | null = null;
    server.use(
      http.get(`${BASE}/v1/ping`, ({ request }) => {
        authHeader = request.headers.get('authorization');
        return ok({ marketplaceId: 42, timestamp: '2026-05-28T10:15:00.000Z' });
      }),
    );

    const xedo = makeClient();
    const result = await xedo.ping();

    expect(authHeader).toBe('Bearer xdk_abc123');
    expect(result).toEqual({ marketplaceId: 42, timestamp: '2026-05-28T10:15:00.000Z' });
  });

  it('captures rate-limit headers from the last response', async () => {
    server.use(
      http.get(`${BASE}/v1/ping`, () =>
        Response.json(
          { success: true, data: { marketplaceId: 1, timestamp: 'now' } },
          {
            headers: {
              'X-RateLimit-Limit': '600',
              'X-RateLimit-Remaining': '599',
              'X-RateLimit-Reset': '1716639600',
            },
          },
        ),
      ),
    );

    const xedo = makeClient();
    await xedo.ping();

    expect(xedo.lastRateLimit).toEqual({ limit: 600, remaining: 599, reset: 1716639600 });
  });
});
