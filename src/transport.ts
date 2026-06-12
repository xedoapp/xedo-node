import { createXedoError, XedoConnectionError, type XedoErrorParams } from './errors';
import type { PaginatedResult, RateLimitInfo } from './types/public';

export type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface TransportOptions {
  apiKey: string;
  baseUrl: string;
  maxRetries: number;
  timeoutMs: number;
  fetchImpl: FetchLike;
}

export interface RequestConfig {
  query?: Record<string, unknown>;
  body?: unknown;
  signal?: AbortSignal;
  /** Accept header; defaults to `application/json`. */
  accept?: string;
}

type HttpMethod = 'GET' | 'POST';

interface Envelope {
  success: boolean;
  code?: string;
  message?: string;
  errors?: Record<string, string[]>;
  data?: unknown;
  total?: number;
  start?: number;
  end?: number;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('Aborted'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error('Aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function parseHeaderInt(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Owns the HTTP concern: auth header, query/body serialization, per-request
 * timeout + abort, automatic 429 retries, envelope parsing and error mapping.
 * Resources sit on top and never touch `fetch` directly.
 */
export class Transport {
  lastRateLimit: RateLimitInfo | null = null;

  constructor(private readonly opts: TransportOptions) {}

  // --- Public helpers used by resources --------------------------------------

  /** Run a request and return the unwrapped `data` payload, typed as `T`. */
  async getData<T>(method: HttpMethod, path: string, config: RequestConfig = {}): Promise<T> {
    const env = await this.requestJson(method, path, config);
    return env.data as T;
  }

  /** Run a GET list request and return `{ data, total, start, end }`. */
  async getPage<T>(path: string, config: RequestConfig = {}): Promise<PaginatedResult<T>> {
    const env = await this.requestJson('GET', path, config);
    return {
      data: (env.data as T[]) ?? [],
      total: env.total ?? 0,
      start: env.start ?? 0,
      end: env.end ?? 0,
    };
  }

  /** Run a request that returns a binary body (e.g. the invoice PDF). */
  async getBinary(method: HttpMethod, path: string, config: RequestConfig = {}): Promise<ArrayBuffer> {
    const res = await this.execute(method, path, config);
    if (!res.ok) {
      throw this.toError(res, await this.tryParseJson(res));
    }
    return res.arrayBuffer();
  }

  // --- Internals -------------------------------------------------------------

  private async requestJson(method: HttpMethod, path: string, config: RequestConfig): Promise<Envelope> {
    const res = await this.execute(method, path, config);
    const body = await this.tryParseJson(res);
    if (!res.ok || body?.success === false) {
      throw this.toError(res, body);
    }
    if (!body) {
      throw new XedoConnectionError({
        code: 'INVALID_RESPONSE',
        status: res.status,
        message: 'Expected a JSON response body but received none.',
      });
    }
    return body;
  }

  private async tryParseJson(res: Response): Promise<Envelope | undefined> {
    const text = await res.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text) as Envelope;
    } catch {
      return undefined;
    }
  }

  private toError(res: Response, body: Envelope | undefined): Error {
    const retryAfter = parseHeaderInt(res.headers.get('retry-after'));
    const params: XedoErrorParams = {
      code: body?.code ?? `HTTP_${res.status}`,
      message: body?.message ?? res.statusText ?? 'Request failed',
      status: res.status,
      errors: body?.errors,
      data: body?.data,
      requestId: res.headers.get('x-request-id') ?? undefined,
      retryAfter: retryAfter ?? undefined,
    };
    return createXedoError(params);
  }

  /** Fetch with retry on 429; returns the final {@link Response}. */
  private async execute(method: HttpMethod, path: string, config: RequestConfig): Promise<Response> {
    const url = this.buildUrl(path, config.query);
    let attempt = 0;
    for (;;) {
      const res = await this.fetchOnce(method, url, config);
      this.captureRateLimit(res);
      if (res.status === 429 && attempt < this.opts.maxRetries) {
        await sleep(this.retryDelayMs(res, attempt), config.signal);
        attempt += 1;
        continue;
      }
      return res;
    }
  }

  private async fetchOnce(method: HttpMethod, url: URL, config: RequestConfig): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.opts.timeoutMs);

    const userSignal = config.signal;
    const onUserAbort = () => controller.abort();
    if (userSignal) {
      if (userSignal.aborted) controller.abort();
      else userSignal.addEventListener('abort', onUserAbort, { once: true });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.opts.apiKey}`,
      Accept: config.accept ?? 'application/json',
    };
    let body: string | undefined;
    if (config.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(config.body);
    }

    try {
      return await this.opts.fetchImpl(url, { method, headers, body, signal: controller.signal });
    } catch (err) {
      if (timedOut) {
        throw new XedoConnectionError({
          code: 'TIMEOUT',
          status: 0,
          message: `Request to ${url.pathname} timed out after ${this.opts.timeoutMs}ms.`,
        });
      }
      // Genuine user-initiated cancellation: surface it untouched.
      if (userSignal?.aborted) throw err;
      throw new XedoConnectionError({
        code: 'CONNECTION_ERROR',
        status: 0,
        message: err instanceof Error ? err.message : 'Network request failed.',
      });
    } finally {
      clearTimeout(timer);
      userSignal?.removeEventListener('abort', onUserAbort);
    }
  }

  private buildUrl(path: string, query: Record<string, unknown> | undefined): URL {
    const url = new URL(this.opts.baseUrl.replace(/\/+$/, '') + path);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url;
  }

  private captureRateLimit(res: Response): void {
    const limit = parseHeaderInt(res.headers.get('x-ratelimit-limit'));
    const remaining = parseHeaderInt(res.headers.get('x-ratelimit-remaining'));
    const reset = parseHeaderInt(res.headers.get('x-ratelimit-reset'));
    if (limit === null && remaining === null && reset === null) return;
    this.lastRateLimit = { limit, remaining, reset };
  }

  private retryDelayMs(res: Response, attempt: number): number {
    const retryAfter = parseHeaderInt(res.headers.get('retry-after'));
    if (retryAfter !== null) return retryAfter * 1000;
    // Exponential backoff with jitter: 500ms, 1s, 2s, … capped at 8s.
    const base = Math.min(8000, 500 * 2 ** attempt);
    return base + Math.random() * base * 0.25;
  }
}
