import { paginate, Resource, toListQuery } from './base';
import { XedoPaymentInitError } from '../errors';
import type {
  Cart,
  CartListItem,
  CartListParams,
  CheckoutCreateInput,
  CheckoutPreview,
  CheckoutPreviewInput,
  CheckoutResult,
  CheckoutRetryPayInput,
  CheckoutRetryResult,
  PaginatedResult,
  RequestOptions,
} from '../types/public';

export class Carts extends Resource {
  /**
   * `GET /v1/carts` — one page of carts (summary rows). `DRAFT` carts are
   * never exposed by the API.
   */
  list(params: CartListParams = {}): Promise<PaginatedResult<CartListItem>> {
    return this.transport.getPage<CartListItem>('/v1/carts', {
      query: toListQuery(params),
      signal: params.signal,
    });
  }

  /** Async iterator over every cart (summary row) across all pages. */
  listAll(params: CartListParams = {}): AsyncGenerator<CartListItem> {
    return paginate((p) => this.list(p), params);
  }

  /** `GET /v1/carts/{publicId}`. */
  retrieve(publicId: string, opts: RequestOptions = {}): Promise<Cart> {
    return this.transport.getData<Cart>('GET', `/v1/carts/${encodeURIComponent(publicId)}`, {
      signal: opts.signal,
    });
  }

  /** `POST /v1/carts/preview` — compute totals without persisting anything. */
  preview(input: CheckoutPreviewInput, opts: RequestOptions = {}): Promise<CheckoutPreview> {
    return this.transport.getData<CheckoutPreview>('POST', '/v1/carts/preview', {
      body: input,
      signal: opts.signal,
    });
  }

  /**
   * `POST /v1/carts` — create the cart (`PENDING_PAYMENT`) and return
   * `data.checkoutUrl`. On a `502 PAYMENT_INIT_FAILED` the cart is kept; retry
   * the payment with {@link Carts.pay} (or use {@link Carts.createAndPay}).
   */
  create(input: CheckoutCreateInput, opts: RequestOptions = {}): Promise<CheckoutResult> {
    return this.transport.getData<CheckoutResult>('POST', '/v1/carts', {
      body: input,
      signal: opts.signal,
    });
  }

  /**
   * `POST /v1/carts/{publicId}/pay` — relaunch payment initialization after a
   * `502 PAYMENT_INIT_FAILED`.
   */
  pay(publicId: string, input: CheckoutRetryPayInput, opts: RequestOptions = {}): Promise<CheckoutRetryResult> {
    return this.transport.getData<CheckoutRetryResult>(
      'POST',
      `/v1/carts/${encodeURIComponent(publicId)}/pay`,
      { body: input, signal: opts.signal },
    );
  }

  /**
   * Convenience wrapper around the 502 checkout flow: create the cart, and if
   * the payment provider could not be reached (`PAYMENT_INIT_FAILED`), retry
   * `pay()` once with the same `returnUrl`. Stays transparent — it logs the
   * code and never swallows a definitive failure.
   *
   * Returns a {@link CheckoutResult} on the happy path, or a
   * {@link CheckoutRetryResult} when the retry succeeded — both carry
   * `checkoutUrl` and `payment`.
   */
  async createAndPay(
    input: CheckoutCreateInput,
    opts: RequestOptions = {},
  ): Promise<CheckoutResult | CheckoutRetryResult> {
    try {
      return await this.create(input, opts);
    } catch (err) {
      if (err instanceof XedoPaymentInitError && err.cartPublicId) {
        console.warn(
          `[xedo] PAYMENT_INIT_FAILED for cart ${err.cartPublicId}; retrying once via pay().`,
        );
        return this.pay(err.cartPublicId, { returnUrl: input.returnUrl }, opts);
      }
      throw err;
    }
  }
}
