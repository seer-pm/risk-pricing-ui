# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The question is set by the team administering the Risk Pricing UI, currently Seer (confirmed 2026-10-24).

Readers include DeFi traders, risk managers, DAOs, insurers, and hedging protocols. They use the estimates to assess and compare default risk. Traders can contribute predictions for individual assets or upload a CSV and execute multiple predictions through a trade wallet.

Reality.eth determines the default outcome. Kleros handles disputes. Credora supplies reference metrics and does not determine the outcome.

## Product Purpose

Risk Pricing displays market-implied annualized and quarterly probabilities of default for 33 DeFi assets in a Q3 2026 market, plus the probability that none of the assets default. Estimates come from live market data, including when the trading period has ended. They are not realized default rates.

## Operating Context

- Gnosis, with sDAI collateral. Wallet connection uses Reown AppKit and wagmi.
- Read estimates by asset and category, compare movement over time, inspect Credora metrics and market rules, then optionally submit predictions.
- A trade wallet supports deposits, withdrawals, mint, merge, redemption and portfolio trading. These behaviors and all probability calculations are outside the redesign scope.
- The configured trading period ends on 30 September 2026 at 23:59:59 UTC. Preserve the ended state; do not describe this market as currently trading.
- The public API exposes current estimates, available markets and history. Preserve its contract.

## Capabilities and Constraints

Next.js 14 App Router, React 18, Tailwind 4, Yarn 4. Shared Electric Foundation UI comes from a vendored @seer-pm/ui-kit tarball until npm publication. Existing Kleros interaction primitives may retain their accessibility and transaction behavior while taking the shared brand.

## Brand Commitments

The product is Risk Pricing, matching seerApps in @seer-pm/ui-kit. Canonical ecosystem address: https://risk.seer.pm. Apply the shared brand across the application and redesign the main surface only. Support system light/dark mode and a persisted manual toggle.

## Evidence on Hand

Production baseline: .impeccable/review/baseline/ (local, ignored). Existing question and default definition, asset names, contract data, market prices, Credora metrics, and guides are authoritative content. Do not invent askers, resolvers, partnerships, incentives, guarantees, default events, performance claims or market activity. Do not substitute synthetic values for failed live requests in the application.

## Product Principles

1. Show the question and the market's answer before trading controls.
2. Distinguish estimates, user predictions and external risk metrics.
3. Preserve market and outcome ordering in calculations and transactions.
4. Keep annualized and quarterly probabilities clearly identified.
5. Show loading, missing data, errors and ended periods honestly.
