"use client";

import React, { useEffect, useRef } from "react";

import { useTheme } from "next-themes";

import {
  createChart,
  type ISeriesApi,
  LineSeries,
  LineStyle,
  PriceScaleMode,
} from "lightweight-charts";

import { type PdSeries } from "@/hooks/useRiskPdHistory";

import { formatPd, shortenName } from "@/utils";

interface IChart {
  /** Already filtered to the visible set by the parent. */
  series: PdSeries[];
  /** Symbol hovered in the shared legend, highlighted here. */
  hoveredSymbol?: string | null;
}

const cssColor = (value: string) => {
  const token = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
  return token
    ? getComputedStyle(document.documentElement).getPropertyValue(token).trim()
    : value;
};

/** Canvas consumes resolved CSS colors and is rebuilt when the active theme changes. */
const Chart: React.FC<IChart> = ({ series, hoveredSymbol = null }) => {
  const { resolvedTheme } = useTheme();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const seriesRefMap = useRef<Record<string, ISeriesApi<"Line">>>({});
  const seriesColorsRef = useRef<Record<string, string>>({});
  const seriesOrderRef = useRef<Record<string, number>>({});

  const applyHighlight = React.useCallback((symbol: string | null) => {
    const map = seriesRefMap.current;
    const colors = seriesColorsRef.current;
    const orders = seriesOrderRef.current;
    const strokeColor = cssColor("var(--seer-muted)");
    const isResetting = symbol === null;
    Object.entries(map).forEach(([name, s]) => {
      const isHovered = name === symbol;
      s.applyOptions({
        lineWidth: isHovered ? 4 : 2,
        color:
          (isResetting || isHovered ? colors[name] : strokeColor) ??
          strokeColor,
      });
      s.setSeriesOrder(isHovered ? 999 : (orders[name] ?? 0));
    });
  }, []);

  // Hover lives in the shared legend, so the highlight is driven by prop.
  // Mirrored into a ref as well: the chart is torn down and rebuilt whenever the
  // visible set changes, and effects run in definition order, so this one would
  // otherwise fire against cleared refs and lose a held highlight. The rebuild
  // effect re-applies from the ref once the new series exist.
  const hoveredRef = useRef<string | null>(hoveredSymbol);
  hoveredRef.current = hoveredSymbol;

  useEffect(() => {
    applyHighlight(hoveredSymbol);
  }, [hoveredSymbol, applyHighlight]);

  useEffect(() => {
    if (!chartContainerRef.current || !resolvedTheme) return;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef?.current?.clientWidth });
    };

    const accentColor = cssColor("var(--seer-muted)");
    const gridLinesColor = cssColor("var(--seer-border)");
    const chart = createChart(chartContainerRef?.current, {
      layout: {
        background: {
          color: "transparent",
        },
        textColor: accentColor,
        fontFamily: getComputedStyle(document.documentElement)
          .getPropertyValue("--seer-font-sans")
          .trim(),
      },
      width: chartContainerRef?.current?.clientWidth,
      height: 400,
      autoSize: true,
      rightPriceScale: {
        borderVisible: false,
        visible: true,
        ensureEdgeTickMarksVisible: true,
        // PD spans orders of magnitude across assets (0.05% to 30%+), same
        // reason the bar chart plots on a log scale.
        mode: PriceScaleMode.Logarithmic,
      },
      localization: {
        priceFormatter: (val: number) => formatPd(val),
      },
      leftPriceScale: {
        borderVisible: false,
        visible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        rightOffset: 25,
      },
      grid: {
        vertLines: {
          color: gridLinesColor,
          style: LineStyle.SparseDotted,
        },
        horzLines: {
          color: gridLinesColor,
          style: LineStyle.SparseDotted,
        },
      },
    });

    seriesRefMap.current = {};
    seriesColorsRef.current = {};
    seriesOrderRef.current = {};
    let orderIndex = 0;
    series.forEach((s) => {
      if (s.data.length === 0) return;
      const lineSeries = chart.addSeries(LineSeries, {
        color: cssColor(s.color),
        lineWidth: 2,
        title: shortenName(s.symbol),
      });
      lineSeries.setData(s.data);
      seriesRefMap.current[s.symbol] = lineSeries;
      seriesColorsRef.current[s.symbol] = cssColor(s.color);
      seriesOrderRef.current[s.symbol] = orderIndex++;
    });

    // Must run after the series are added - fitting an empty chart is a no-op.
    chart.timeScale().fitContent();

    // Restore a highlight held across the rebuild.
    applyHighlight(hoveredRef.current);

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      seriesRefMap.current = {};
      seriesColorsRef.current = {};
      seriesOrderRef.current = {};
      chart.remove();
    };
  }, [series, resolvedTheme, applyHighlight]);

  return (
    // min-h matches the chart's own height, so the container doesn't collapse
    // to zero for a frame before createChart runs.
    <div className="flex size-full min-h-100 flex-col">
      <div ref={chartContainerRef} />
    </div>
  );
};

export default Chart;
