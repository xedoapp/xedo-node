import { Resource } from './base';
import type { DeliveryArea, RequestOptions } from '../types/public';

export class DeliveryAreas extends Resource {
  /**
   * `GET /v1/delivery-areas` — every delivery area configured by the merchant.
   * Use a returned `id` as `delivery.deliveryAreaId` when creating a cart.
   */
  list(opts: RequestOptions = {}): Promise<DeliveryArea[]> {
    return this.transport.getData<DeliveryArea[]>('GET', '/v1/delivery-areas', {
      signal: opts.signal,
    });
  }
}
