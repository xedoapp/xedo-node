/**
 * Typed error hierarchy. Every `success: false` response (and every transport
 * failure) is thrown as a {@link XedoError} or one of its subclasses. Route on
 * `error.code` (stable, machine-readable), never on `error.message` (French,
 * subject to change).
 */

export interface XedoErrorParams {
  message: string;
  /** Machine-readable code, e.g. "PRODUCT_NOT_FOUND". */
  code: string;
  /** HTTP status (0 for transport/connection errors). */
  status: number;
  /** Per-field validation details. */
  errors?: Record<string, string[]>;
  /** Extra context (e.g. `cartPublicId` on PAYMENT_INIT_FAILED). */
  data?: unknown;
  /** Request id, when the API returns one. */
  requestId?: string;
  /** `Retry-After` value in seconds, when present. */
  retryAfter?: number;
}

export class XedoError extends Error {
  readonly code: string;
  readonly status: number;
  readonly errors?: Record<string, string[]>;
  readonly data?: unknown;
  readonly requestId?: string;

  constructor(params: XedoErrorParams) {
    super(params.message);
    // Keep the concrete subclass name on instances created via `new.target`.
    this.name = new.target.name;
    this.code = params.code;
    this.status = params.status;
    this.errors = params.errors;
    this.data = params.data;
    this.requestId = params.requestId;
    // Restore the prototype chain for `instanceof` under transpiled targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 401 — `MISSING_DEVELOPER_API_KEY`, `INVALID_DEVELOPER_API_KEY`. */
export class XedoAuthError extends XedoError {}

/** 400 — bad request / invalid payment configuration. */
export class XedoValidationError extends XedoError {}

/** 404 — product, combination, delivery area, cart or generic not found. */
export class XedoNotFoundError extends XedoError {}

/** 422 — `INSUFFICIENT_STOCK` (per-product detail in `errors`). */
export class XedoStockError extends XedoError {}

/** 409 — `CART_NOT_RETRYABLE`. */
export class XedoConflictError extends XedoError {}

/** 429 — `RATE_LIMITED`. Exposes `retryAfter` (seconds). */
export class XedoRateLimitError extends XedoError {
  readonly retryAfter?: number;
  constructor(params: XedoErrorParams) {
    super(params);
    this.retryAfter = params.retryAfter;
  }
}

/**
 * 502 — `PAYMENT_INIT_FAILED`. The cart was kept; relaunch the payment via
 * `xedo.carts.pay(cartPublicId, …)`. Exposes `cartPublicId`.
 */
export class XedoPaymentInitError extends XedoError {
  readonly cartPublicId?: string;
  constructor(params: XedoErrorParams) {
    super(params);
    const data = params.data as { cartPublicId?: string } | undefined;
    this.cartPublicId = data?.cartPublicId;
  }
}

/** Transport-level failure (timeout, network, malformed response). */
export class XedoConnectionError extends XedoError {}

const CODE_MAP: Record<string, new (p: XedoErrorParams) => XedoError> = {
  MISSING_DEVELOPER_API_KEY: XedoAuthError,
  INVALID_DEVELOPER_API_KEY: XedoAuthError,
  BAD_REQUEST: XedoValidationError,
  INVALID_PAYMENT_METHOD: XedoValidationError,
  SPLIT_PAYMENT_NOT_ENABLED: XedoValidationError,
  COMBINATION_PRODUCT_MISMATCH: XedoValidationError,
  PRODUCT_NOT_FOUND: XedoNotFoundError,
  COMBINATION_NOT_FOUND: XedoNotFoundError,
  DELIVERY_AREA_NOT_FOUND: XedoNotFoundError,
  CART_NOT_FOUND: XedoNotFoundError,
  NOT_FOUND: XedoNotFoundError,
  INSUFFICIENT_STOCK: XedoStockError,
  CART_NOT_RETRYABLE: XedoConflictError,
  RATE_LIMITED: XedoRateLimitError,
  PAYMENT_INIT_FAILED: XedoPaymentInitError,
};

function fallbackByStatus(status: number): new (p: XedoErrorParams) => XedoError {
  switch (status) {
    case 400:
      return XedoValidationError;
    case 401:
      return XedoAuthError;
    case 404:
      return XedoNotFoundError;
    case 409:
      return XedoConflictError;
    case 422:
      return XedoStockError;
    case 429:
      return XedoRateLimitError;
    case 502:
      return XedoPaymentInitError;
    default:
      return XedoError;
  }
}

/** Build the most specific {@link XedoError} subclass for a failed response. */
export function createXedoError(params: XedoErrorParams): XedoError {
  const Ctor = CODE_MAP[params.code] ?? fallbackByStatus(params.status);
  return new Ctor(params);
}
