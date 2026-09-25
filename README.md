This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Public API

`GET /api/v1/risk-pricing` returns the current market estimates the UI shows, so they can be used without scraping the page. It is open to any origin (CORS `*`). Results are cached for 5 minutes, and the underlying pool data is hourly.

```jsonc
{
  "marketId": "0x…",
  "chainId": 100,
  "collateral": "0x…",        // sDAI
  "updatedAt": 1787264050,    // unix seconds of the latest pool data used
  "assets": [
    {
      "index": 0,
      "name": "weETH",
      "symbol": "WEETHPD",
      "outcomeToken": "0x…",
      "price": 0.00021,       // outcome token price in collateral
      "pdQuarterly": 0.0002,  // implied probability of default, quarterly
      "pdYearly": 0.0009      // same, annualised: 1 - (1 - pdQuarterly)^4
    }
  ],
  "noToAll": {
    "index": 33,
    "outcomeToken": "0x…",
    "price": 0.74,
    "probability": 0.465      // yearly chance that no listed asset defaults
  },
  "solverMaxErr": 2.4e-17     // residual of the price → probability solve
}
```

All probabilities are fractions in [0, 1]. If an upstream source fails, the endpoint returns `502` with `{ "error": "…" }`.

### Markets

A quarter can have more than one market, so every endpoint takes an optional `?market=0x…`. Without it, the endpoint uses the current market. An id that isn't listed returns `404`. `GET /api/v1/risk-pricing/markets` lists the markets the API serves:

```jsonc
{
  "chainId": 100,
  "markets": [
    { "id": "0x…", "quarter": "2026-Q3", "startTime": 1771871400, "endTime": 1790812799, "current": true }
  ]
}
```

### History

`GET /api/v1/risk-pricing/history?market=0x…` returns how each estimate has moved over the market's lifetime. These are the same series the "Over Time" chart plots. Each series is aligned with `times`:

```jsonc
{
  "marketId": "0x…",
  "chainId": 100,
  "quarter": "2026-Q3",
  "startTime": 1771871400,
  "endTime": 1790812799,
  "intervalSeconds": 14400,   // 4h grid
  "times": [1786516200, …],   // unix seconds
  "assets": [
    {
      "index": 0,
      "name": "weETH",
      "symbol": "WEETHPD",
      "outcomeToken": "0x…",
      "pdQuarterly": [0.00024, …],
      "pdYearly": [0.00096, …]
    }
  ],
  "noToAll": { "index": 33, "outcomeToken": "0x…", "probability": [0.46, …] },
  "solverMaxErr": 2.9e-13     // worst residual across all points
}
```

- Each point uses the latest pool price at or before its time.
- The series starts once every asset's pool has traded, so it can start after `startTime`.
- Points where any pool price is degenerate are skipped.
- The last point is the current estimate. It isn't on the grid, and it matches `/api/v1/risk-pricing`.
- Values are rounded to 6 significant digits.
- Results are cached for 5 minutes. After a market's `endTime` they no longer change.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
