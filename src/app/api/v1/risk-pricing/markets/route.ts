import { NextResponse } from "next/server";
import { gnosis } from "viem/chains";

import { CORS_HEADERS, corsPreflight } from "@/utils/publicApi";

import { RISK_PRICING_MARKET_ID, RISK_PRICING_MARKETS } from "@/consts/markets";

export const OPTIONS = corsPreflight;

export function GET() {
  return NextResponse.json(
    {
      chainId: gnosis.id,
      markets: RISK_PRICING_MARKETS.map((market) => ({
        ...market,
        current: market.id === RISK_PRICING_MARKET_ID,
      })),
    },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    },
  );
}
