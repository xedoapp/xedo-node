import { Xedo, type XedoOptions } from '../src/index';
import { BASE } from './server';

export function makeClient(overrides: Partial<XedoOptions> = {}): Xedo {
  return new Xedo({
    apiKey: 'xdk_abc123',
    baseUrl: BASE,
    maxRetries: 2,
    timeoutMs: 1000,
    ...overrides,
  });
}

export function ok(data: unknown): Response {
  return Response.json({ success: true, data });
}

export function page(data: unknown[], total: number, start: number, end: number): Response {
  return Response.json({ success: true, data, total, start, end });
}

export function fail(
  status: number,
  code: string,
  message: string,
  extra: { errors?: Record<string, string[]>; data?: unknown } = {},
  headers: Record<string, string> = {},
): Response {
  return Response.json({ success: false, code, message, ...extra }, { status, headers });
}
