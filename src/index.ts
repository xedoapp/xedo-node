export { Xedo, type XedoOptions } from './client';
export type { FetchLike } from './transport';

export {
  XedoError,
  XedoAuthError,
  XedoValidationError,
  XedoNotFoundError,
  XedoStockError,
  XedoConflictError,
  XedoRateLimitError,
  XedoPaymentInitError,
  XedoConnectionError,
  type XedoErrorParams,
} from './errors';

export type {
  JsonObject,
  SortOrder,
  PingResult,
  Product,
  Collection,
  Order,
  Cart,
  CheckoutPreview,
  CheckoutResult,
  ListParams,
  ProductListParams,
  CollectionListParams,
  OrderListParams,
  CartListParams,
  RetrieveOptions,
  RequestOptions,
  PaginatedResult,
  RateLimitInfo,
  CheckoutItem,
  CheckoutDelivery,
  CheckoutCustomer,
  PaymentMethod,
  CheckoutPreviewInput,
  CheckoutCreateInput,
  CheckoutRetryPayInput,
} from './types/public';
