import { NextResponse } from "next/server";

import { getRiskPricingMarket, RiskPricingMarketInfo } from "@/consts/markets";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const corsPreflight = () =>
  new NextResponse(null, { status: 204, headers: CORS_HEADERS });

/**
 * Wraps a public GET handler: resolves `?market=` against the registry (404
 * for unknown ids, so arbitrary addresses never reach the solver), adds CORS
 * and cache headers, and turns upstream failures into a 502.
 */
export async function servePublicMarketData<T>(
  request: Request,
  load: (market: RiskPricingMarketInfo) => Promise<T>,
) {
  const id = new URL(request.url).searchParams.get("market");
  const market = getRiskPricingMarket(id);
  if (!market) {
    return NextResponse.json(
      { error: `Unknown market ${id}` },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  try {
    return NextResponse.json(await load(market), {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upstream request failed" },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}
