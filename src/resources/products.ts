import { paginate, Resource, toListQuery } from './base';
import type { PaginatedResult, Product, ProductListParams, RetrieveOptions } from '../types/public';

export class Products extends Resource {
  /** `GET /v1/products` — one page of products. */
  list(params: ProductListParams = {}): Promise<PaginatedResult<Product>> {
    return this.transport.getPage<Product>('/v1/products', {
      query: {
        ...toListQuery(params),
        collection: params.collection,
        includeVariations: params.includeVariations,
        includeDisabled: params.includeDisabled,
      },
      signal: params.signal,
    });
  }

  /** Async iterator over every product across all pages. */
  listAll(params: ProductListParams = {}): AsyncGenerator<Product> {
    return paginate((p) => this.list(p), params);
  }

  /** `GET /v1/products/{publicId}`. */
  retrieve(publicId: string, opts: RetrieveOptions = {}): Promise<Product> {
    return this.transport.getData<Product>('GET', `/v1/products/${encodeURIComponent(publicId)}`, {
      query: { includeDisabled: opts.includeDisabled },
      signal: opts.signal,
    });
  }

  /** `GET /v1/products/by-slug/{slug}`. */
  retrieveBySlug(slug: string, opts: RetrieveOptions = {}): Promise<Product> {
    return this.transport.getData<Product>('GET', `/v1/products/by-slug/${encodeURIComponent(slug)}`, {
      query: { includeDisabled: opts.includeDisabled },
      signal: opts.signal,
    });
  }
}
