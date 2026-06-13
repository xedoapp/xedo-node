/**
 * Next.js (App Router) Server Component. The Xedo client is instantiated and
 * used entirely on the server, so the xdk_… key never reaches the browser.
 */
import { Xedo } from '@xedo/sdk';

// Module-scope is fine: this file is never bundled for the client.
const xedo = new Xedo({ apiKey: process.env.XEDO_API_KEY! });

export default async function ProductsPage() {
  // Pagination metadata comes back alongside the data.
  const { data: products, total } = await xedo.products.list({
    perPage: 24,
    sort: 'createdAt',
    order: 'desc',
  });

  return (
    <main>
      <h1>Catalogue ({total})</h1>
      <ul>
        {products.map((p) => (
          <li key={String(p.publicId)}>{String(p.name)}</li>
        ))}
      </ul>
    </main>
  );
}

// --- A Route Handler that kicks off checkout -------------------------------
//
// export async function POST(req: Request) {
//   const body = await req.json();
//   const { checkoutUrl } = await xedo.carts.createAndPay({
//     customer: body.customer,
//     items: body.items,
//     delivery: { deliveryType: 'DELIVERY', deliveryAreaId: 11 },
//     paymentMethod: 'external_wallet',
//     returnUrl: 'https://my-shop.com/after-checkout',
//     meta: { internalOrderId: body.orderId },
//   });
//   return Response.redirect(checkoutUrl, 303);
// }
