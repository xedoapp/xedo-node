/**
 * Plain Node script. Run with: XEDO_API_KEY=xdk_test_… npx tsx examples/script.ts
 */
import { Xedo, XedoNotFoundError } from '@xedo/sdk';

const xedo = new Xedo({ apiKey: process.env.XEDO_API_KEY! });

async function main() {
  // 1. Validate the key.
  const ping = await xedo.ping();
  console.log('marketplace', ping.marketplaceId, '(', xedo.environment, ')');

  // 2. Iterate the whole catalogue, page by page.
  for await (const product of xedo.products.listAll({ perPage: 100 })) {
    console.log(product.publicId, product.name);
  }

  // 3. Preview a cart (stateless — no cart is created).
  const totals = await xedo.carts.preview({
    items: [{ publicProductId: 'PRD-XPK39ZQA01', quantity: 2 }],
    delivery: { deliveryType: 'DELIVERY', deliveryAreaId: 11 },
    paymentMethod: 'external_wallet',
  });
  console.log('totals', totals);

  // 4. Robust single-resource lookup.
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
