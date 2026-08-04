export const revalidate = 300;

import { NextResponse } from "next/server";

import {
  RiskAssetAddresses,
  RiskAssetData,
  RiskProfile,
} from "@/consts/markets";

const CREDORA_GRAPHQL_URL = "https://api.staging.credora.io/graphql";

// Canonical ordering, same as the display_order values in the hardcoded
// RiskAssetDetailsMapping. The risk panel reorders these for display, so this
// is only the baseline order; icons are keyed by metric name.
const METRIC_ORDER = [
  "Asset Quality",
  "Governance",
  "Peg Track Record",
  "Protocol Security",
  "Reserves Management",
  "Regulatory/Legal Profile",
];

interface CredoraRatingItem {
  id: string;
  address: string;
  name: string;
  ratingType: string;
  Metrics?: {
    rating: string;
    psl: number | null;
    publishDate: string | null;
    totalNotches: number | null;
  } | null;
  riskProfiles: {
    metric_name: string;
    score: number | null;
    max_score: number;
    content: string;
  }[];
}

interface CredoraGraphqlResponse {
  data?: {
    ratings?: {
      totalCount: number;
      items: CredoraRatingItem[];
    } | null;
  };
  errors?: unknown;
}

const buildQuery = (addresses: string[]) => `
query {
ratings(filter: { product: ["assets"], chainId: 1, address: ${JSON.stringify(addresses)} }, page: 0, limit: 100) {
totalCount
items {
id
address
name
chainId
protocol
ratingType
product
curator {
name
}
Metrics {
rating
psl
publishDate
totalNotches
}
riskProfiles {
metric_name
score
max_score
content
}
modifiers {
code
name
enabled
notch_impact
factors {
code
fields {
key
value
}
}
}
anchor {
pd
atsr_enabled
aqcr_enabled
aqcr {
fields {
key
value
}
}
atsr {
fields {
key
value
}
}

}
}
}
}
`;

function toRiskProfiles(
  items: CredoraRatingItem["riskProfiles"],
): RiskProfile[] {
  const sorted = [...items].sort((a, b) => {
    const ai = METRIC_ORDER.indexOf(a.metric_name);
    const bi = METRIC_ORDER.indexOf(b.metric_name);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return sorted.map((p, index) => ({
    score: p.score,
    content: p.content,
    max_score: p.max_score,
    metric_name: p.metric_name,
    display_order: index,
  }));
}

function averageScore(profiles: RiskProfile[]): number {
  const scores = profiles
    .map((p) => p.score)
    .filter((s): s is number => s !== null && s !== undefined);
  if (!scores.length) return 0;
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return Math.round(avg * 100) / 100;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET() {
  const clientSecret = process.env.CREDORA_API;
  if (!clientSecret) {
    return NextResponse.json({}, { status: 500 });
  }

  try {
    const upstream = await fetch(CREDORA_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ClientSecret: clientSecret,
      },
      body: JSON.stringify({ query: buildQuery(RiskAssetAddresses) }),
      next: { revalidate: 300 },
    });

    if (!upstream.ok) {
      return NextResponse.json({}, { status: upstream.status });
    }

    const json: CredoraGraphqlResponse = await upstream.json();
    const items = json.data?.ratings?.items ?? [];

    const result: Record<string, RiskAssetData> = {};
    for (const item of items) {
      const risk_profiles = toRiskProfiles(item.riskProfiles ?? []);
      result[item.address.toLowerCase()] = {
        metrics_rating: item.Metrics?.rating ?? "",
        address: item.address,
        rating_type: item.ratingType,
        avg_risk_score: averageScore(risk_profiles),
        risk_profiles,
      };
    }

    const res = NextResponse.json(result);
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  } catch {
    return NextResponse.json({}, { status: 502 });
  }
}
