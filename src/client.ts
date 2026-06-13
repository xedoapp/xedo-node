import { XedoConnectionError, XedoError } from './errors';
import { Carts } from './resources/carts';
import { Collections } from './resources/collections';
import { DeliveryAreas } from './resources/delivery-areas';
import { Marketplace } from './resources/marketplace';
import { Orders } from './resources/orders';
import { Products } from './resources/products';
import { Transport, type FetchLike } from './transport';
import type { PingResult, RateLimitInfo, RequestOptions } from './types/public';

const DEFAULT_BASE_URL = 'https://systems.xedoapp.com/marketplace';
const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_TIMEOUT_MS = 30_000;

export interface XedoOptions {
  /** Developer API key: an opaque `xdk_…` string. */
  apiKey: string;
  /**
   * Override the API base URL. Defaults to the production marketplace URL.
   * The base URL alone selects Production vs Sandbox — the key is opaque and
   * carries no environment. See https://developers.xedoapp.com/introduction/environments
   */
  baseUrl?: string;
  /** Max automatic retries on `429`. Defaults to 4. */
  maxRetries?: number;
  /** Per-request timeout in milliseconds. Defaults to 30000. */
  timeoutMs?: number;
  /** Inject a custom fetch (tests, edge runtimes). Defaults to global fetch. */
  fetch?: FetchLike;
  /**
   * Escape hatch to run in a browser. Strongly discouraged: your
   * `xdk_…` key would be exposed in the client bundle.
   */
  dangerouslyAllowBrowser?: boolean;
}

/**
 * The Xedo Developer API client. Server-side only — see
 * `dangerouslyAllowBrowser`.
 *
 * ```ts
 * const xedo = new Xedo({ apiKey: process.env.XEDO_API_KEY! });
 * const { data } = await xedo.products.list({ perPage: 20 });
 * ```
 */
export class Xedo {
  readonly products: Products;
  readonly collections: Collections;
  readonly orders: Orders;
  readonly carts: Carts;
  readonly deliveryAreas: DeliveryAreas;
  readonly marketplace: Marketplace;

  private readonly transport: Transport;

  constructor(options: XedoOptions) {
    if (!options?.apiKey) {
      throw new XedoError({
        code: 'MISSING_DEVELOPER_API_KEY',
        status: 0,
        message: 'A Xedo `apiKey` is required.',
      });
    }

    const maybeWindow = (globalThis as { window?: { document?: unknown } }).window;
    const isBrowser = typeof maybeWindow !== 'undefined' && typeof maybeWindow.document !== 'undefined';
    if (isBrowser && !options.dangerouslyAllowBrowser) {
      throw new XedoError({
        code: 'BROWSER_ENV_DETECTED',
        status: 0,
        message:
          'The Xedo SDK is server-side only: running it in a browser would expose your ' +
          'xdk_… key in the client bundle. Call it from a server (Next.js Server ' +
          'Component / Route Handler, Express, a worker, …). See the README on authentication.',
      });
    }

    const fetchImpl: FetchLike =
      options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    if (typeof globalThis.fetch !== 'function' && !options.fetch) {
      throw new XedoConnectionError({
        code: 'NO_FETCH',
        status: 0,
        message: 'Global fetch is unavailable (Node >= 18 required) — pass `options.fetch`.',
      });
    }

    this.transport = new Transport({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      fetchImpl,
    });

    this.products = new Products(this.transport);
    this.collections = new Collections(this.transport);
    this.orders = new Orders(this.transport);
    this.carts = new Carts(this.transport);
    this.deliveryAreas = new DeliveryAreas(this.transport);
    this.marketplace = new Marketplace(this.transport);
  }

  /** Rate-limit headers from the most recent response, for monitoring. */
  get lastRateLimit(): RateLimitInfo | null {
    return this.transport.lastRateLimit;
  }

  /** `GET /v1/ping` — validate the API key end to end. */
  ping(opts: RequestOptions = {}): Promise<PingResult> {
    return this.transport.getData<PingResult>('GET', '/v1/ping', { signal: opts.signal });
  }
}
