# @xedo/sdk

Official Node.js / TypeScript SDK for the **Xedo Developer API v1** — a typed,
ergonomic client for products, collections, orders & checkout. Server-side,
MIT licensed.

```bash
npm install @xedo/sdk
```

> Requires **Node ≥ 18** (native `fetch`).

## Quickstart

```ts
import { Xedo } from '@xedo/sdk';

const xedo = new Xedo({ apiKey: process.env.XEDO_API_KEY! }); // xdk_live_… or xdk_test_…

await xedo.ping();                          // validate the key
const { data, total } = await xedo.products.list({ perPage: 20 });
```

## ⚠️ Server-side only

The SDK sends your `xdk_live_…` key as a Bearer token. **Never import it into a
browser bundle** — your key would be exposed to anyone. Call it from a server:
Next.js Server Components / Route Handlers, Express, workers, scripts. The
constructor throws if it detects a browser environment (override only if you
truly know what you are doing via `dangerouslyAllowBrowser`).

## Configuration

```ts
const xedo = new Xedo({
  apiKey: process.env.XEDO_API_KEY!,
  baseUrl: 'https://systems.xedoapp.com/marketplace', // default
  maxRetries: 4,        // auto-retry on 429 (default)
  timeoutMs: 30000,     // per-request timeout
  fetch: customFetch,   // optional injection (tests, edge)
});

xedo.environment;       // 'test' | 'live' | 'unknown' (from key prefix)
xedo.lastRateLimit;     // { limit, remaining, reset } from the last call
```

## Resources

| Resource | Methods |
|---|---|
| `xedo.ping()` | validate the key → `{ marketplaceId, timestamp }` |
| `xedo.products` | `list`, `listAll`, `retrieve`, `retrieveBySlug` |
| `xedo.collections` | `list`, `listAll`, `retrieve`, `retrieveBySlug` |
| `xedo.orders` | `list`, `listAll`, `retrieve`, `invoice` (PDF) |
| `xedo.carts` | `list`, `listAll`, `retrieve`, `preview`, `create`, `pay`, `createAndPay` |

### Pagination

`list()` returns `{ data, total, start, end }`. `listAll()` is an async iterator
that walks every page for you:

```ts
const { data, total } = await xedo.orders.list({ page: 1, perPage: 50 });

for await (const order of xedo.orders.listAll()) {
  // …
}
```

### Checkout

```ts
// Stateless totals — nothing is persisted.
const totals = await xedo.carts.preview({
  items: [{ publicProductId: 'PRD-XPK39ZQA01', quantity: 2 }],
  delivery: { deliveryType: 'DELIVERY', deliveryAreaId: 11 },
  paymentMethod: 'external_wallet',
});

// Create the cart and get a hosted checkout URL. createAndPay() also retries
// once if the payment provider was unreachable (502 PAYMENT_INIT_FAILED).
const { checkoutUrl } = await xedo.carts.createAndPay({
  customer: { firstName: 'Jean', lastName: 'Kouassi', email: 'jean@example.com', phone: '+225 07 12 34 56 78' },
  items: [{ publicProductId: 'PRD-XPK39ZQA01', quantity: 2 }],
  delivery: { deliveryType: 'DELIVERY', deliveryAreaId: 11 },
  paymentMethod: 'external_wallet',
  returnUrl: 'https://my-shop.com/after-checkout', // HTTPS required
  meta: { internalOrderId: 'ORD-12345' },          // echoed back in cart/order responses
});
```

The `meta` field is your correlation hook: store your own identifiers in it and
they come back unchanged on every cart/order response.

### Invoices

```ts
const pdf = await xedo.orders.invoice('ORD-XPK39ZQA01'); // ArrayBuffer (404 if not generated yet)
```

## Error handling

Every `success: false` response throws a typed error. **Route on `error.code`**
(stable), never on `error.message` (French, may change).

```ts
import { XedoNotFoundError, XedoStockError, XedoError } from '@xedo/sdk';

try {
  await xedo.carts.create(input);
} catch (err) {
  if (err instanceof XedoStockError) console.log(err.errors); // per-product detail
  else if (err instanceof XedoNotFoundError) console.log(err.code);
  else if (err instanceof XedoError) console.log(err.code, err.status);
  else throw err;
}
```

| Class | Codes | HTTP |
|---|---|---|
| `XedoAuthError` | `MISSING_DEVELOPER_API_KEY`, `INVALID_DEVELOPER_API_KEY` | 401 |
| `XedoValidationError` | `BAD_REQUEST`, `INVALID_PAYMENT_METHOD`, `SPLIT_PAYMENT_NOT_ENABLED`, `COMBINATION_PRODUCT_MISMATCH` | 400 |
| `XedoNotFoundError` | `PRODUCT_NOT_FOUND`, `COMBINATION_NOT_FOUND`, `DELIVERY_AREA_NOT_FOUND`, `CART_NOT_FOUND`, `NOT_FOUND` | 404 |
| `XedoStockError` | `INSUFFICIENT_STOCK` (detail in `errors`) | 422 |
| `XedoConflictError` | `CART_NOT_RETRYABLE` | 409 |
| `XedoRateLimitError` | `RATE_LIMITED` (exposes `retryAfter`) | 429 |
| `XedoPaymentInitError` | `PAYMENT_INIT_FAILED` (exposes `cartPublicId`) | 502 |
| `XedoConnectionError` | timeout / network / malformed response | 0 |

`429` responses are retried automatically (respecting `Retry-After`, then
exponential backoff + jitter, up to `maxRetries`). `POST /v1/carts` is **never**
auto-retried on `5xx` — the cart may already exist; use `pay()` / `createAndPay()`.

## Development

```bash
npm install
npm run generate   # regenerate src/types/generated.ts from openapi.json
npm run lint
npm run typecheck
npm test           # vitest + msw
npm run build      # ESM + CJS + .d.ts (tsup)
```

## License

MIT
