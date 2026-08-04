export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_FUNCTIONS = new Set([
  "sign-in",
  "me",
  "collections",
  // Market data goes through here rather than being fetched cross-origin:
  // when the upstream function crashes it returns a platform 502 with no
  // CORS headers, which the browser reports as a CORS failure and hides the
  // real status from the caller. Proxied, the status comes back intact.
  "get-market",
]);

const SEER_FUNCTIONS_BASE = "https://app.seer.pm/.netlify/functions";

async function proxy(req: NextRequest, fn: string) {
  if (!ALLOWED_FUNCTIONS.has(fn)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const headers: Record<string, string> = {};
  const authorization = req.headers.get("authorization");
  if (authorization) headers["Authorization"] = authorization;
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  try {
    // The upstream collections function derives collectionId (null = favorites)
    // from its URL path, so the target must stay exactly `/${fn}`.
    const upstream = await fetch(`${SEER_FUNCTIONS_BASE}/${fn}`, {
      method: req.method,
      headers,
      body: req.method === "POST" ? await req.text() : undefined,
      cache: "no-store",
    });

    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Upstream unavailable" },
      { status: 502 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { fn: string } },
) {
  return proxy(req, params.fn);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { fn: string } },
) {
  return proxy(req, params.fn);
}
