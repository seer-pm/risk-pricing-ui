import { Card } from "@kleros/ui-components-library";
import clsx from "clsx";
import Link from "next/link";
import Papa from "papaparse";

import { useRiskPredictionStore } from "@/store/riskMarketStore";

import SeerLogo from "@/components/SeerLogo";

import Download from "@/assets/svg/download.svg";
import ExternalArrow from "@/assets/svg/external-arrow.svg";

import { cn } from "@/utils";
import { downloadCsvFile } from "@/utils/csv";

import { RISK_PRICING_MARKET_ID } from "@/consts/markets";
import { FOCUS_RING } from "@/consts/styles";

const AdvancedSection: React.FC = () => {
  const outcomes = useRiskPredictionStore((state) => state.outcomes);
  const handleDownload = () => {
    const data = outcomes.slice(0, -1).map((outcome) => {
      return {
        asset: outcome.outcome,
        probability: outcome.probability,
      };
    });

    const csv = Papa.unparse(data, {
      columns: ["asset", "probability"],
    });
    downloadCsvFile(
      `risk-pricing-predictions-${new Date().toUTCString()}.csv`,
      csv,
    );
  };
  return (
    <Card
      round
      className={clsx(
        "border-gradient-purple-blue h-auto w-full rounded-xl border-none px-4 py-6 md:px-8",
        "flex flex-col-reverse items-start justify-center gap-x-8 gap-y-4",
        "md:flex-row md:items-center md:justify-between",
      )}
    >
      <div className="flex flex-col items-start gap-2">
        <h3 className="text-klerosUIComponentsPrimaryText text-base font-semibold">
          Advanced
        </h3>
        <p className="text-klerosUIComponentsSecondaryText text-sm">
          Check the opportunities if you want to LP or Trade specific outcome
          tokens in Seer.&nbsp;
          <Link
            href={`https://app.seer.pm/markets/100/${RISK_PRICING_MARKET_ID}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-klerosUIComponentsPrimaryBlue items-center text-sm transition-opacity hover:underline hover:opacity-80"
          >
            Check it out <ExternalArrow className="ml-1 inline size-4" />
          </Link>
        </p>
        <p className="text-klerosUIComponentsSecondaryText text-sm">
          Download the latest data (updated in the last 24 hours) in CSV
          format.&nbsp;
          <button
            type="button"
            onClick={handleDownload}
            className={cn(
              "text-klerosUIComponentsPrimaryBlue cursor-pointer items-center rounded-sm text-sm transition-opacity hover:underline hover:opacity-80",
              FOCUS_RING,
            )}
          >
            Download CSV <Download className="ml-1 inline size-4" />
          </button>
        </p>
      </div>
      <SeerLogo className="shrink-0" />
    </Card>
  );
};
export default AdvancedSection;
