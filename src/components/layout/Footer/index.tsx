"use client";

import { EcosystemFooter } from "@seer-pm/ui-kit/react";

import { riskApp } from "@/consts/brand";
import { beginnerUserGuide, advancedUserGuide } from "@/consts/markets";

export default function Footer() {
  return (
    <div className="mt-auto [--seer-footer-gutter:24px] [--seer-footer-max-width:1240px]">
      <EcosystemFooter
        appName={riskApp.name}
        homeUrl="/"
        tagline={riskApp.summary}
        groups={[
          {
            title: riskApp.name,
            links: [
              { name: "Market estimates", url: "/#market-estimates" },
              { name: "Beginner guide", url: beginnerUserGuide },
              { name: "Advanced guide", url: advancedUserGuide },
              { name: "API", url: "/api/v1/risk-pricing" },
            ],
          },
        ]}
      />
    </div>
  );
}
