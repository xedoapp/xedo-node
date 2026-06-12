import { Resource } from './base';
import type { MarketplaceProfile, RequestOptions } from '../types/public';

export class Marketplace extends Resource {
  /**
   * `GET /v1/marketplace` — the merchant's marketplace profile: enabled
   * payment methods, split-payment configuration, business category, …
   */
  retrieve(opts: RequestOptions = {}): Promise<MarketplaceProfile> {
    return this.transport.getData<MarketplaceProfile>('GET', '/v1/marketplace', {
      signal: opts.signal,
    });
  }
}
