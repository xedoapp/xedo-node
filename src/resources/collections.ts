import { paginate, Resource, toListQuery } from './base';
import type { Collection, CollectionListParams, PaginatedResult, RequestOptions } from '../types/public';

export class Collections extends Resource {
  /** `GET /v1/collections` — one page of collections. */
  list(params: CollectionListParams = {}): Promise<PaginatedResult<Collection>> {
    return this.transport.getPage<Collection>('/v1/collections', {
      query: toListQuery(params),
      signal: params.signal,
    });
  }

  /** Async iterator over every collection across all pages. */
  listAll(params: CollectionListParams = {}): AsyncGenerator<Collection> {
    return paginate((p) => this.list(p), params);
  }

  /** `GET /v1/collections/{publicId}`. */
  retrieve(publicId: string, opts: RequestOptions = {}): Promise<Collection> {
    return this.transport.getData<Collection>(
      'GET',
      `/v1/collections/${encodeURIComponent(publicId)}`,
      { signal: opts.signal },
    );
  }

  /** `GET /v1/collections/by-slug/{slug}`. */
  retrieveBySlug(slug: string, opts: RequestOptions = {}): Promise<Collection> {
    return this.transport.getData<Collection>(
      'GET',
      `/v1/collections/by-slug/${encodeURIComponent(slug)}`,
      { signal: opts.signal },
    );
  }
}
