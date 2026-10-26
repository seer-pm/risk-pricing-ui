import { Metadata } from "next";

import { riskApp } from "./brand";

export const websiteUrl = riskApp.url;
export const siteName = riskApp.name;

export const metadata: Metadata = {
  title: "Risk Pricing | Seer",
  description: riskApp.summary,
  metadataBase: new URL(websiteUrl),
  twitter: {
    card: "summary_large_image",
    title: "Risk Pricing | Seer",
    description: riskApp.summary,
    site: siteName,
    creator: "@seer_pm",
    images: ["seer-og.png"],
  },
  openGraph: {
    title: "Risk Pricing | Seer",
    description: riskApp.summary,
    url: websiteUrl,
    siteName: siteName,
    images: ["seer-og.png"],
    locale: "en_US",
    type: "website",
  },
};
