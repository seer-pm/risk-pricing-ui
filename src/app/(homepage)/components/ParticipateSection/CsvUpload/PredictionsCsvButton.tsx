import clsx from "clsx";
import Papa from "papaparse";

import { useRiskPredictionStore } from "@/store/riskMarketStore";

import LightButton from "@/components/LightButton";

import DownloadIcon from "@/assets/svg/download.svg";

import { downloadCsvFile } from "@/utils/csv";

/**
 * Downloads the current predictions (falling back to the market value for any
 * asset the user hasn't moved) as CSV.
 *
 * Used twice with different labels - "Download CSV Template" inside the upload
 * modal and "Export Predictions" on the page - which previously existed as two
 * byte-identical components.
 */
const PredictionsCsvButton: React.FC<{ text: string }> = ({ text }) => {
  const outcomes = useRiskPredictionStore((state) => state.outcomes);
  const predictions = useRiskPredictionStore((state) => state.riskPredictions);

  const handleDownload = () => {
    // assets only: drop "No To All" (-2) and "Invalid" (-1)
    const assets = outcomes.slice(0, -2);
    const probabilityOf = (outcome: (typeof outcomes)[number]) =>
      predictions[outcome.outcomeId] ?? outcome.probability;

    const data: { asset: string; probability: number }[] = assets.map(
      (outcome) => ({
        asset: outcome.outcome,
        probability: probabilityOf(outcome),
      }),
    );

    // "No To All" is derived, not stored: exporting the raw store value would
    // emit the market number rather than what these predictions imply.
    const noToAll = outcomes.at(-2);
    if (noToAll) {
      data.push({
        asset: noToAll.outcome,
        probability: assets.reduce(
          (survival, asset) => survival * (1 - probabilityOf(asset)),
          1,
        ),
      });
    }

    const csv = Papa.unparse(data, { columns: ["asset", "probability"] });
    downloadCsvFile(
      `risk-pricing-predictions-${new Date().toUTCString()}.csv`,
      csv,
    );
  };

  return (
    <LightButton
      text={text}
      onPress={handleDownload}
      small
      className={clsx(
        "flex-row-reverse p-0",
        "[&_.button-text]:text-klerosUIComponentsPrimaryBlue [&_.button-text]:text-sm [&_.button-text]:font-normal",
        "hover:bg-klerosUIComponentsWhiteBackground",
      )}
      icon={
        <DownloadIcon className="[&_path]:fill-klerosUIComponentsPrimaryBlue! ml-2 size-4" />
      }
    />
  );
};

export default PredictionsCsvButton;
