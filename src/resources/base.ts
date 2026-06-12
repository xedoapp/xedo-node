import type { Transport } from '../transport';
import type { ListParams, PaginatedResult } from '../types/public';

export abstract class Resource {
  constructor(protected readonly transport: Transport) {}
}

/** Map the SDK's camelCase list params to the API's wire query keys. */
export function toListQuery(params: ListParams): Record<string, unknown> {
  return {
    page: params.page,
    per_page: params.perPage,
    _sort: (params as { sort?: string }).sort,
    _order: params.order,
    search: params.search,
  };
}

/**
 * Walk every page of a list endpoint, yielding items one by one. Defaults to a
 * large page size to minimise round-trips; the transport's 429 retry provides
 * the throughput guard.
 */
export async function* paginate<T, P extends ListParams>(
  fetchPage: (params: P) => Promise<PaginatedResult<T>>,
  params: P,
): AsyncGenerator<T> {
  let page = params.page ?? 1;
  const perPage = params.perPage ?? 100;
  for (;;) {
    const result = await fetchPage({ ...params, page, perPage });
    for (const item of result.data) yield item;
    if (result.data.length === 0 || result.end >= result.total) break;
    page += 1;
  }
}
