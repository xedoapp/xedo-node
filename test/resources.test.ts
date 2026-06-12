import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE, server } from './server';
import { makeClient, ok, page } from './helpers';

describe('list endpoints', () => {
  it('maps camelCase params to wire query keys and returns pagination metadata', async () => {
    let url: URL | undefined;
    server.use(
      http.get(`${BASE}/v1/products`, ({ request }) => {
        url = new URL(request.url);
        return page([{ publicId: 'PRD-1' }], 42, 1, 1);
      }),
    );

    const xedo = makeClient();
    const result = await xedo.products.list({
      page: 1,
      perPage: 20,
      sort: 'createdAt',
      order: 'desc',
      search: 'burger',
      collection: 'fast-food',
      includeVariations: true,
      includeDisabled: false,
    });

    expect(result).toEqual({ data: [{ publicId: 'PRD-1' }], total: 42, start: 1, end: 1 });
    expect(url?.searchParams.get('per_page')).toBe('20');
    expect(url?.searchParams.get('_sort')).toBe('createdAt');
    expect(url?.searchParams.get('_order')).toBe('desc');
    expect(url?.searchParams.get('search')).toBe('burger');
    expect(url?.searchParams.get('collection')).toBe('fast-food');
    expect(url?.searchParams.get('includeVariations')).toBe('true');
  });

  it('listAll walks every page until end >= total', async () => {
    server.use(
      http.get(`${BASE}/v1/products`, ({ request }) => {
        const p = Number(new URL(request.url).searchParams.get('page'));
        if (p === 1) return page([{ id: 1 }, { id: 2 }], 3, 1, 2);
        return page([{ id: 3 }], 3, 3, 3);
      }),
    );

    const xedo = makeClient();
    const seen: unknown[] = [];
    for await (const item of xedo.products.listAll({ perPage: 2 })) seen.push(item);

    expect(seen).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('retrieve encodes the path id and forwards includeDisabled', async () => {
    let url: URL | undefined;
    server.use(
      http.get(`${BASE}/v1/products/:id`, ({ request }) => {
        url = new URL(request.url);
        return ok({ publicId: 'PRD-XPK39ZQA01' });
      }),
    );

    const xedo = makeClient();
    const product = await xedo.products.retrieve('PRD-XPK39ZQA01', { includeDisabled: true });

    expect(product).toEqual({ publicId: 'PRD-XPK39ZQA01' });
    expect(url?.searchParams.get('includeDisabled')).toBe('true');
  });
});

describe('orders.invoice', () => {
  it('returns the PDF as an ArrayBuffer', async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
    server.use(
      http.get(`${BASE}/v1/orders/:id/invoice`, () =>
        new Response(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf' } }),
      ),
    );

    const xedo = makeClient();
    const buffer = await xedo.orders.invoice('ORD-1');

    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(buffer)).toEqual(pdf);
  });
});
