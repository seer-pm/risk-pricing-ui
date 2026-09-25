// The history is cached in memory per market (see riskPricingSnapshot); the
// route itself stays dynamic so a failed upstream isn't frozen into a cached page.
export const dynamic = "force-dynamic";
// The solver runs WORKER_SRC through `new Function`, which edge doesn't allow.
export const runtime = "nodejs";

import { corsPreflight, servePublicMarketData } from "@/utils/publicApi";
import { getRiskPricingHistory } from "@/utils/riskPricingSnapshot";

export const OPTIONS = corsPreflight;

export async function GET(request: Request) {
  return servePublicMarketData(request, getRiskPricingHistory);
}
