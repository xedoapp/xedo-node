/**
 * Plain Node script. Run with: XEDO_API_KEY=xdk_… npx tsx examples/script.ts
 */
import { Xedo, XedoNotFoundError } from '@xedo/sdk';

const xedo = new Xedo({ apiKey: process.env.XEDO_API_KEY! });

async function main() {
  // 1. Validate the key.
  const ping = await xedo.ping();
  console.log('marketplace', ping.marketplaceId);

  // 2. Inspect the merchant configuration and delivery areas.
  const profile = await xedo.marketplace.retrieve();
  console.log('split payment enabled:', profile.enableSplitPayment);
  const areas = await xedo.deliveryAreas.list();
  console.log('delivery areas:', areas.map((a) => `${a.name} (${a.deliveryCost})`));

  // 3. Iterate the whole catalogue, page by page.
  for await (const product of xedo.products.listAll({ perPage: 100 })) {
    console.log(product.publicId, product.name, product.price, `stock=${product.stockQuantity}`);
  }

  // 4. Preview a cart (stateless — no cart is created).
  const totals = await xedo.carts.preview({
    items: [{ publicProductId: 'PRD-XPK39ZQA01', quantity: 2 }],
    delivery: { deliveryType: 'DELIVERY', deliveryAreaId: areas[0]?.id },
    paymentMethod: 'external_wallet',
  });
  console.log('total', totals.total, 'delivery', totals.deliveryCost);

  // 5. Robust single-resource lookup.
  try {
    await xedo.products.retrieve('PRD-does-not-exist');
  } catch (err) {
    if (err instanceof XedoNotFoundError) console.log('not found:', err.code);
    else throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
