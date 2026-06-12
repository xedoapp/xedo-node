/**
 * Public type surface for the Xedo SDK.
 *
 * The Xedo Developer API returns its resource payloads inside a generic
 * envelope (`{ success, data }`). Since the API v1 spec now describes every
 * entity in detail, these public types are derived directly from the generated
 * mirror of `openapi.json` (`./generated.ts`, do not edit by hand) so they stay
 * in sync on every `npm run generate`. Only cross-cutting helpers (pagination,
 * list params, rate-limit) are hand-written here.
 */

import type { components } from './generated';

type Schemas = components['schemas'];

/** A free-form JSON object (e.g. the developer-supplied `meta` payload). */
export type JsonObject = { [key: string]: unknown };

/**
 * `meta` is a free-form JSON object, but openapi-typescript renders the spec's
 * loose `object` as `Record<string, never>`. Swap it back to {@link JsonObject}.
 */
type WithMeta<T> = Omit<T, 'meta'> & { meta?: JsonObject | null };

/** Sort direction shared by every paginated list endpoint. */
export type SortOrder = 'asc' | 'desc';

// --- Enums (single source: the generated spec) -------------------------------

/** Lifecycle status of an order. */
export type OrderStatus = Schemas['DevApiOrderDetailDto']['status'];
/** Lifecycle status of a cart (orders that are not yet paid). */
export type CartStatus = Schemas['DevApiCartDetailDto']['status'];
/** Fulfillment status once an order is being prepared/shipped. */
export type FulfillmentStatus = Schemas['DevApiOrderDeliveryDto']['orderStatus'];
/** Delivery mode of a cart/order. */
export type DeliveryType = Schemas['DevApiOrderDeliveryDto']['deliveryType'];
/** Payment status of an order. */
export type PaymentStatus = Schemas['DevApiOrderPaymentDto']['status'];
/** Payment method as reported on a paid order (read side). */
export type OrderPaymentMethod = Schemas['DevApiOrderPaymentDto']['method'];
/** How a per-option/combination price is adjusted. */
export type PriceAdjustmentType = NonNullable<Schemas['DevApiProductCombinationDto']['priceAdjustmentType']>;
/** Gallery media kind. */
export type MediaType = Schemas['DevApiProductGalleryMediaDto']['type'];

// --- Entities ----------------------------------------------------------------

/** Result of `GET /v1/ping` — use it to validate an API key end to end. */
export type PingResult = Schemas['PingPayload'];

/** The lightweight collection reference embedded on a product. */
export type ProductCollection = Schemas['DevApiProductCollectionDto'];
/** A gallery image or video attached to a product/variation option. */
export type ProductGalleryMedia = Schemas['DevApiProductGalleryMediaDto'];
/** One selectable option (e.g. "XL") of a product variation. */
export type ProductVariationOption = Schemas['DevApiProductVariationOptionDto'];
/** A product variation axis (e.g. "Size") and its options. */
export type ProductVariation = Schemas['DevApiProductVariationDto'];
/** A combination (SKU) with its own stock and pricing. */
export type ProductCombination = Schemas['DevApiProductCombinationDto'];
/** A product from the merchant catalogue (`GET /v1/products`). */
export type Product = Schemas['DevApiProductDto'];

/** A collection / category of products (`GET /v1/collections`). */
export type Collection = Schemas['DevApiCollectionDto'];

/** Customer details attached to an order. */
export type OrderCustomer = Schemas['DevApiOrderCustomerDto'];
/** Payment details of a paid order. */
export type OrderPayment = Schemas['DevApiOrderPaymentDto'];
/** A single line item of an order. */
export type OrderItem = Schemas['DevApiOrderItemDto'];
/** Computed monetary totals of an order. */
export type OrderTotals = Schemas['DevApiOrderTotalsDto'];
/** Delivery information of an order. */
export type OrderDelivery = Schemas['DevApiOrderDeliveryDto'];
/** A row in `GET /v1/orders` (summary). */
export type OrderListItem = WithMeta<Schemas['DevApiOrderListItemDto']>;
/** A full order from `GET /v1/orders/{publicId}`. */
export type Order = WithMeta<Schemas['DevApiOrderDetailDto']>;

/** Customer details attached to a cart. */
export type CartCustomer = Schemas['DevApiCartCustomerDto'];
/** A single line item of a cart. */
export type CartItem = Schemas['DevApiCartItemDto'];
/** Computed monetary totals of a cart. */
export type CartTotals = Schemas['DevApiCartTotalsDto'];
/** Delivery information of a cart. */
export type CartDelivery = Schemas['DevApiCartDeliveryDto'];
/** A row in `GET /v1/carts` (summary). `DRAFT` carts are never exposed. */
export type CartListItem = WithMeta<Schemas['DevApiCartListItemDto']>;
/** A full cart from `GET /v1/carts/{publicId}`. `DRAFT` carts are never exposed. */
export type Cart = WithMeta<Schemas['DevApiCartDetailDto']>;

/** Computed totals returned by `POST /v1/carts/preview` (nothing persisted). */
export type CheckoutPreview = Schemas['DevApiCheckoutPreviewResponseDto'];
/** Totals carried on a created cart. */
export type CheckoutTotals = Schemas['DevApiCheckoutTotalsDto'];
/** Payment handle carried on a created cart. */
export type CheckoutPayment = Schemas['DevApiCheckoutPaymentDto'];
/**
 * Returned by `POST /v1/carts`. Always carries the hosted `checkoutUrl` to
 * redirect the customer to.
 */
export type CheckoutResult = Schemas['DevApiCheckoutCreateResponseDto'];
/** Returned by `POST /v1/carts/{publicId}/pay`. */
export type CheckoutRetryResult = Schemas['DevApiCheckoutRetryPayResponseDto'];

/** A delivery area (`GET /v1/delivery-areas`). */
export type DeliveryArea = Schemas['DevApiDeliveryAreaDto'];

/** The merchant's business category. */
export type BusinessCategory = Schemas['DevApiBusinessCategoryDto'];
/** The marketplace profile (`GET /v1/marketplace`). */
export type MarketplaceProfile = Schemas['DevApiMarketplaceProfileDto'];

// --- Checkout inputs ---------------------------------------------------------

export type CheckoutItem = Schemas['DevApiCheckoutItemDto'];
export type CheckoutDelivery = Schemas['DevApiCheckoutDeliveryDto'];
export type CheckoutCustomer = Schemas['DevApiCheckoutCustomerDto'];
/** Payment method accepted when creating a cart (write side). */
export type PaymentMethod = Schemas['DevApiCheckoutCreateDto']['paymentMethod'];
export type CheckoutPreviewInput = Schemas['DevApiCheckoutPreviewDto'];
export type CheckoutCreateInput = WithMeta<Schemas['DevApiCheckoutCreateDto']>;
export type CheckoutRetryPayInput = Schemas['DevApiCheckoutRetryPayDto'];

// --- Hand-written cross-cutting helpers --------------------------------------

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
