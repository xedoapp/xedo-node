/**
 * Public, hand-written type surface for the Xedo SDK.
 *
 * The Xedo Developer API returns its resource payloads inside a generic
 * envelope (`{ success, data }`). The entity payloads themselves are described
 * loosely in `openapi.json` (`type: object`), so we expose them as open
 * JSON objects here and keep the precise, validated shapes for the checkout
 * inputs — which the API does constrain. The generated mirror of the spec
 * lives in `./generated.ts` (do not edit by hand).
 */

/** A free-form JSON object returned by the API. */
export type JsonObject = { [key: string]: unknown };

/** Sort direction shared by every paginated list endpoint. */
export type SortOrder = 'asc' | 'desc';

/** Result of `GET /v1/ping` — use it to validate an API key end to end. */
export interface PingResult {
  marketplaceId: number;
  timestamp: string;
}

/** A product from the merchant catalogue (`GET /v1/products`). */
export type Product = JsonObject;

/** A collection / category of products (`GET /v1/collections`). */
export type Collection = JsonObject;

/** A paid order (`GET /v1/orders`). */
export type Order = JsonObject;

/** A cart (`GET /v1/carts`). `DRAFT` carts are never exposed by the API. */
export type Cart = JsonObject;

/** Computed totals returned by `POST /v1/carts/preview` (nothing persisted). */
export type CheckoutPreview = JsonObject;

/**
 * Returned by `POST /v1/carts` and `POST /v1/carts/{publicId}/pay`. Always
 * carries the hosted `checkoutUrl` to redirect the customer to.
 */
export interface CheckoutResult extends JsonObject {
  checkoutUrl: string;
}

/** Shared cursor parameters for every paginated list endpoint. */
export interface ListParams {
  /** Page number (1-based). */
  page?: number;
  /** Page size (capped by the platform, ~100 max). */
  perPage?: number;
  /** Sort direction. */
  order?: SortOrder;
  /** Full-text search (3 characters minimum). */
  search?: string;
  /** Abort signal for this request. */
  signal?: AbortSignal;
}

export interface ProductListParams extends ListParams {
  sort?: 'id' | 'name' | 'price' | 'createdAt';
  /** Filter by collection slug. */
  collection?: string;
  /** Include variations and combinations (SKUs) in the response. */
  includeVariations?: boolean;
  /** Include disabled products (drafts). */
  includeDisabled?: boolean;
}

export interface CollectionListParams extends ListParams {
  sort?: 'id' | 'name' | 'createdAt';
}

export interface OrderListParams extends ListParams {
  sort?: 'id' | 'createdAt' | 'amount';
}

export interface CartListParams extends ListParams {
  sort?: 'id' | 'createdAt';
}

/** Options for single-resource retrieval that supports draft resolution. */
export interface RetrieveOptions {
  /** Resolve a disabled product (draft) as well. */
  includeDisabled?: boolean;
  signal?: AbortSignal;
}

/** Options for a plain single-resource retrieval. */
export interface RequestOptions {
  signal?: AbortSignal;
}

/**
 * One page of a paginated list. The SDK unwraps the API envelope but keeps the
 * pagination metadata so callers can build their own UIs.
 */
export interface PaginatedResult<T> {
  data: T[];
  /** Total number of rows matching the query, across all pages. */
  total: number;
  /** 1-based index of the first row returned. */
  start: number;
  /** 1-based index of the last row returned. */
  end: number;
}

/** Rate-limit headers captured from the most recent response. */
export interface RateLimitInfo {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
}

// --- Checkout inputs (precisely typed from openapi.json) ---------------------

export interface CheckoutItem {
  /** e.g. "PRD-XPK39ZQA01". */
  publicProductId: string;
  /** Quantity, >= 1. */
  quantity: number;
  /** SKU public id, when the product has variations. */
  combinationPublicId?: string;
}

export interface CheckoutDelivery {
  deliveryType: 'DELIVERY' | 'PICKUP';
  /** Required when `deliveryType === 'DELIVERY'`. */
  deliveryAreaId?: number;
}

export interface CheckoutCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export type PaymentMethod = 'external_wallet' | 'split_payment';

export interface CheckoutPreviewInput {
  items: CheckoutItem[];
  delivery: CheckoutDelivery;
  paymentMethod: PaymentMethod;
}

export interface CheckoutCreateInput extends CheckoutPreviewInput {
  customer: CheckoutCustomer;
  /** HTTPS is mandatory. */
  returnUrl: string;
  additionalDetails?: string;
  /**
   * Free JSON payload echoed back, unchanged, in every cart/order response.
   * Use it to correlate a Xedo order with your own state (`internalOrderId`,
   * `source`, `templateId`, …).
   */
  meta?: Record<string, unknown>;
}

export interface CheckoutRetryPayInput {
  returnUrl: string;
}
