// The snapshot is cached in memory for 5 minutes (see riskPricingSnapshot); the
// route itself stays dynamic so a failed upstream isn't frozen into a cached page.
export const dynamic = "force-dynamic";
// The solver runs WORKER_SRC through `new Function`, which edge doesn't allow.
export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getRiskPricingSnapshot } from "@/utils/riskPricingSnapshot";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const snapshot = await getRiskPricingSnapshot();
    return NextResponse.json(snapshot, {
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
