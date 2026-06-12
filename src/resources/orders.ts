import { paginate, Resource, toListQuery } from './base';
import type { Order, OrderListParams, PaginatedResult, RequestOptions } from '../types/public';

export class Orders extends Resource {
  /** `GET /v1/orders` — one page of paid orders. */
  list(params: OrderListParams = {}): Promise<PaginatedResult<Order>> {
    return this.transport.getPage<Order>('/v1/orders', {
      query: toListQuery(params),
      signal: params.signal,
    });
  }

  /** Async iterator over every order across all pages. */
  listAll(params: OrderListParams = {}): AsyncGenerator<Order> {
    return paginate((p) => this.list(p), params);
  }

  /** `GET /v1/orders/{publicId}`. */
  retrieve(publicId: string, opts: RequestOptions = {}): Promise<Order> {
    return this.transport.getData<Order>('GET', `/v1/orders/${encodeURIComponent(publicId)}`, {
      signal: opts.signal,
    });
  }

  /**
   * `GET /v1/orders/{publicId}/invoice` — the invoice PDF as a binary
   * `ArrayBuffer` (not JSON). Throws {@link XedoNotFoundError} if the invoice
   * has not been generated yet.
   */
  invoice(publicId: string, opts: RequestOptions = {}): Promise<ArrayBuffer> {
    return this.transport.getBinary('GET', `/v1/orders/${encodeURIComponent(publicId)}/invoice`, {
      accept: 'application/pdf',
      signal: opts.signal,
    });
  }
}
