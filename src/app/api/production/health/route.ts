import { productionStoreHealth } from "@/lib/server/productionStore";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ ok: true, productionStore: productionStoreHealth() });
}
