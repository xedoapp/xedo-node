import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  XedoAuthError,
  XedoNotFoundError,
  XedoPaymentInitError,
  XedoRateLimitError,
  XedoStockError,
  XedoValidationError,
} from '../src/index';
import { BASE, server } from './server';
import { fail, makeClient } from './helpers';

describe('typed errors', () => {
  it('maps 401 to XedoAuthError routed on code', async () => {
    server.use(
      http.get(`${BASE}/v1/ping`, () =>
        fail(401, 'INVALID_DEVELOPER_API_KEY', 'Clé API invalide'),
      ),
    );
    const xedo = makeClient();
    await expect(xedo.ping()).rejects.toMatchObject({
      name: 'XedoAuthError',
      code: 'INVALID_DEVELOPER_API_KEY',
      status: 401,
    });
    await expect(xedo.ping()).rejects.toBeInstanceOf(XedoAuthError);
  });

  it('maps 404 to XedoNotFoundError', async () => {
    server.use(
      http.get(`${BASE}/v1/products/:id`, () =>
        fail(404, 'PRODUCT_NOT_FOUND', "Le produit n'a pas été trouvé"),
      ),
    );
    await expect(makeClient().products.retrieve('PRD-x')).rejects.toBeInstanceOf(XedoNotFoundError);
  });

  it('exposes per-field detail on 422 stock errors', async () => {
    server.use(
      http.post(`${BASE}/v1/carts/preview`, () =>
        fail(422, 'INSUFFICIENT_STOCK', 'Le stock est insuffisant', {
          errors: { 'PRD-XPK39ZQA01': ['stock disponible : 1, demandé : 2'] },
        }),
      ),
    );
    const err = await makeClient()
      .carts.preview({
        items: [{ publicProductId: 'PRD-XPK39ZQA01', quantity: 2 }],
        delivery: { deliveryType: 'PICKUP' },
        paymentMethod: 'external_wallet',
      })
      .catch((e) => e);

    expect(err).toBeInstanceOf(XedoStockError);
    expect(err.errors).toEqual({ 'PRD-XPK39ZQA01': ['stock disponible : 1, demandé : 2'] });
  });

  it('400 maps to XedoValidationError', async () => {
    server.use(
      http.get(`${BASE}/v1/products`, () => fail(400, 'BAD_REQUEST', 'La requête est invalide')),
    );
    await expect(makeClient().products.list()).rejects.toBeInstanceOf(XedoValidationError);
  });

  it('502 PAYMENT_INIT_FAILED exposes cartPublicId', async () => {
    server.use(
      http.post(`${BASE}/v1/carts`, () =>
        fail(502, 'PAYMENT_INIT_FAILED', 'échec', { data: { cartPublicId: 'CART-99' } }),
      ),
    );
    const err = await makeClient()
      .carts.create({
        customer: { firstName: 'A', lastName: 'B', email: 'a@b.c', phone: '+1' },
        items: [{ publicProductId: 'PRD-1', quantity: 1 }],
        delivery: { deliveryType: 'PICKUP' },
        paymentMethod: 'external_wallet',
        returnUrl: 'https://shop.test/done',
      })
      .catch((e) => e);

    expect(err).toBeInstanceOf(XedoPaymentInitError);
    expect(err.cartPublicId).toBe('CART-99');
  });
});

describe('429 retry', () => {
  it('retries on 429 respecting Retry-After, then succeeds', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/v1/ping`, () => {
        calls += 1;
        if (calls === 1) {
          return fail(429, 'RATE_LIMITED', 'slow down', {}, { 'Retry-After': '0' });
        }
        return Response.json({ success: true, data: { marketplaceId: 1, timestamp: 'now' } });
      }),
    );
    const result = await makeClient().ping();
    expect(calls).toBe(2);
    expect(result.marketplaceId).toBe(1);
  });

  it('throws XedoRateLimitError after exhausting maxRetries', async () => {
    server.use(
      http.get(`${BASE}/v1/ping`, () =>
        fail(429, 'RATE_LIMITED', 'slow down', {}, { 'Retry-After': '0' }),
      ),
    );
    const err = await makeClient({ maxRetries: 1 })
      .ping()
      .catch((e) => e);
    expect(err).toBeInstanceOf(XedoRateLimitError);
    expect(err.retryAfter).toBe(0);
  });
});

describe('carts.createAndPay', () => {
  it('retries via pay() once after PAYMENT_INIT_FAILED', async () => {
    server.use(
      http.post(`${BASE}/v1/carts`, () =>
        fail(502, 'PAYMENT_INIT_FAILED', 'échec', { data: { cartPublicId: 'CART-42' } }),
      ),
      http.post(`${BASE}/v1/carts/:id/pay`, ({ params }) =>
        Response.json({
          success: true,
          data: { checkoutUrl: `https://pay.test/${String(params.id)}` },
        }),
      ),
    );

    const result = await makeClient().carts.createAndPay({
      customer: { firstName: 'A', lastName: 'B', email: 'a@b.c', phone: '+1' },
      items: [{ publicProductId: 'PRD-1', quantity: 1 }],
      delivery: { deliveryType: 'PICKUP' },
      paymentMethod: 'external_wallet',
      returnUrl: 'https://shop.test/done',
    });

    expect(result.checkoutUrl).toBe('https://pay.test/CART-42');
  });
});
