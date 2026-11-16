"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { toCandles, type TradeRow } from "@/lib/data";
import { nativeSymbol } from "@/lib/chain";

const INTERVALS = [
  { label: "1m", s: 60 },
  { label: "5m", s: 300 },
  { label: "15m", s: 900 },
  { label: "1h", s: 3600 },
];

export function PriceChart({ trades, startPrice, mode }: { trades: TradeRow[]; startPrice?: number; mode: "price" | "mcap" }) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const vol = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [iv, setIv] = useState(60);

  useEffect(() => {
    if (!box.current) return;
    const css = getComputedStyle(document.documentElement);
    const c = createChart(box.current, {
      height: 380,
      layout: { background: { color: "transparent" }, textColor: css.getPropertyValue("--ink-3").trim(), fontFamily: "JetBrains Mono, monospace", fontSize: 11 },
      grid: { vertLines: { color: "#1a201e" }, horzLines: { color: "#1a201e" } },
      rightPriceScale: { borderColor: "#1f1f1f" },
      timeScale: { borderColor: "#1f1f1f", timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
      autoSize: true,
    });
    series.current = c.addCandlestickSeries({
      upColor: "#3ddc84", downColor: "#ff5c5c", borderVisible: false, wickUpColor: "#3ddc84", wickDownColor: "#ff5c5c",
      priceFormat: { type: "custom", formatter: (p: number) => fmt(p), minMove: 1e-12 },
    });
    vol.current = c.addHistogramSeries({ priceScaleId: "", color: "#ffffff33", priceFormat: { type: "volume" } });
    vol.current.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    chart.current = c;
    return () => c.remove();
  }, []);

  useEffect(() => {
    if (!series.current || !vol.current) return;
    const mult = mode === "mcap" ? 1e9 : 1; // 1B supply
    const candles = toCandles(trades, iv, startPrice);
    series.current.setData(candles.map((k) => ({
      time: k.time as UTCTimestamp, open: k.open * mult, high: k.high * mult, low: k.low * mult, close: k.close * mult,
    })));
    vol.current.setData(candles.map((k) => ({ time: k.time as UTCTimestamp, value: k.volume, color: k.close >= k.open ? "#3ddc8440" : "#ff5c5c40" })));
    chart.current?.timeScale().fitContent();
  }, [trades, iv, startPrice, mode]);

  return (
    <div>
      <div className="row between" style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)" }}>
        <span className="label">{mode === "mcap" ? "Market cap" : "Price"} · {nativeSymbol}</span>
        <div className="chips">
          {INTERVALS.map((x) => (
            <button key={x.s} onClick={() => setIv(x.s)} style={iv === x.s ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}>{x.label}</button>
          ))}
        </div>
      </div>
      <div ref={box} style={{ height: 380 }} />
    </div>
  );
}

function fmt(p: number) {
  if (p === 0) return "0";
  if (p >= 1) return p.toFixed(3);
  const s = p.toExponential(3);
  return p < 1e-4 ? s : p.toPrecision(4);
}
