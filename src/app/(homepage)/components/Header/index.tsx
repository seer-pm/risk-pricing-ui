import { useRawMarketData } from "@/hooks/useMarketData";
import { useRiskMarketResolution } from "@/hooks/useRiskMarketResolution";

import { formatPd, shortenAddress } from "@/utils";

import {
  endTime,
  marketMetadata,
  RISK_PRICING_MARKET_ID,
} from "@/consts/markets";

const defaultDefinition = (
  <>
    Default according to Risk Pricing definition includes:
    <br />• <span className="font-bold">Redemption Failure:</span> inability to
    redeem the asset at expected value for 2 weeks
    <br />• <span className="font-bold">Reserve Insolvency:</span> reserves fall
    1% below issuance value for 7+ days
    <br />• <span className="font-bold">Other structural failures</span>{" "}
    relevant to token mechanics (wrapped assets, LSTs, fiat-backed stablecoins)
    <br />
    <br />
    <span className="font-bold">
      Only defaults occurring during Q3 2026 count.
    </span>{" "}
    Defaults caused by events prior to Q3 do not count.
  </>
);

export default function Header() {
  const { data } = useRawMarketData();
  const market = data?.marketData;
  const { isResolved, payoutFractions } = useRiskMarketResolution();
  const winners =
    isResolved && payoutFractions
      ? (market?.outcomes ?? []).filter(
          (_, index) => (payoutFractions[index] ?? 0) > 0,
        )
      : [];
  const arbitrator = market?.questions[0]?.arbitrator;
  const seerUrl = `https://app.seer.pm/markets/100/${RISK_PRICING_MARKET_ID}`;

  return (
    <section
      className="space-y-4 sm:space-y-6"
      aria-labelledby="market-question"
    >
      <h1
        id="market-question"
        className="text-seer-text max-w-4xl text-3xl leading-tight font-semibold tracking-tight sm:text-4xl"
      >
        {marketMetadata.question}
      </h1>
      <div className="text-seer-muted flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span>
          Trading Period:{" "}
          <time
            className="text-seer-text"
            dateTime={new Date(endTime * 1000).toISOString()}
          >
            Until{" "}
            {new Date(endTime * 1000).toLocaleString("en-GB", {
              timeZone: "UTC",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            UTC
          </time>
        </span>
        <span className="rounded-control border-seer-border bg-seer-surface-raised text-seer-text border px-2 py-1 font-semibold">
          {Date.now() / 1000 >= endTime ? "Trading ended" : "Trading open"}
        </span>
        <span>Gnosis · sDAI</span>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <p className="text-seer-text">
          <span className="text-seer-muted">Asked by </span>
          Risk Pricing UI team · Seer
        </p>
        <p className="text-seer-text">
          <span className="text-seer-muted">Resolved by </span>
          Reality.eth · <span className="text-seer-muted">Disputes: </span>
          Kleros
        </p>
      </div>
      <div className="border-seer-border flex flex-wrap gap-x-8 gap-y-3 border-y py-4 text-sm">
        <details className="text-seer-muted basis-full">
          <summary className="text-seer-text w-fit cursor-pointer font-semibold">
            Market rules and contracts
          </summary>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
            {" "}
            {market?.creator && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-seer-muted">Market creator</span>
                <a
                  className="text-seer-accent-text font-mono underline underline-offset-4"
                  href={`https://gnosisscan.io/address/${market.creator}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortenAddress(market.creator as `0x${string}`)}
                </a>
              </div>
            )}
            {arbitrator && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-seer-muted">Arbitrator</span>
                <a
                  className="text-seer-accent-text font-mono underline underline-offset-4"
                  href={`https://gnosisscan.io/address/${arbitrator}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortenAddress(arbitrator)}
                </a>
              </div>
            )}
            <a
              className="text-seer-accent-text font-semibold underline underline-offset-4"
              href={seerUrl}
              target="_blank"
              rel="noreferrer"
            >
              Market rules on Seer
            </a>
          </div>
        </details>
        <details className="text-seer-muted basis-full">
          <summary className="text-seer-text w-fit cursor-pointer font-semibold">
            What counts as a default?
          </summary>
          <div className="mt-3 max-w-3xl text-sm leading-relaxed">
            {defaultDefinition}
          </div>
        </details>
      </div>
      {winners.length > 0 && (
        <div className="text-seer-text text-sm">
          <h2 className="font-semibold">Market resolved:</h2>
          {winners.map((outcome) => (
            <p key={outcome}>
              {outcome}:{" "}
              {formatPd(
                (payoutFractions?.[market!.outcomes.indexOf(outcome)] ?? 0) *
                  100,
              )}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
