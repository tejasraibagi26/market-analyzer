"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { HistoricalDataPoint } from "@/types/market";

interface Props {
  symbol: string;
}

const PERIODS = ["1mo", "3mo", "6mo", "1y", "2y"] as const;
type Period = (typeof PERIODS)[number];

export default function PriceChart({ symbol }: Props) {
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [period, setPeriod] = useState<Period>("6mo");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetch(`/api/historical?symbol=${symbol}&period=${period}`)
      .then((r) => r.json())
      .then((json) => setData(json.data ?? []))
      .finally(() => setLoading(false));
  }, [symbol, period]);

  const firstClose = data[0]?.close ?? 0;
  const lastClose = data[data.length - 1]?.close ?? 0;
  const isPositive = lastClose >= firstClose;
  const returnPct = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0;
  const minPrice = Math.min(...data.map((d) => d.low)) * 0.995;
  const maxPrice = Math.max(...data.map((d) => d.high)) * 1.005;

  const chartData = data.map((d) => ({
    date: d.date,
    price: d.close,
    label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  const lineColor = isPositive ? "#00ff88" : "#ff4444";

  return (
    <div style={{ border: "1px solid #1a1a1a", background: "#080808", padding: "20px", minWidth: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "14px" }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "3px", color: "#fff" }}>{symbol}</span>
          <span style={{ fontSize: "0.72rem", color: isPositive ? "#00ff88" : "#ff4444", fontFamily: "'Space Mono', monospace", letterSpacing: "1px" }}>
            {isPositive ? "+" : ""}{returnPct.toFixed(2)}%
          </span>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                background: period === p ? "#00ff88" : "transparent",
                color: period === p ? "#001a0d" : "#555",
                border: `1px solid ${period === p ? "#00ff88" : "#1a1a1a"}`,
                padding: "4px 10px",
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.62rem",
                letterSpacing: "1px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "32px", height: "32px", border: "2px solid #111", borderTop: `2px solid #00ff88`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      ) : data.length === 0 ? (
        <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "0.68rem", letterSpacing: "2px" }}>
          NO DATA
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#0f0f0f" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#333", fontSize: 10, fontFamily: "'Space Mono', monospace" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[minPrice, maxPrice]} tick={{ fill: "#333", fontSize: 10, fontFamily: "'Space Mono', monospace" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={55} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 0, fontFamily: "'Space Mono', monospace", fontSize: 11 }}
              labelStyle={{ color: "#555", fontSize: 10 }}
              formatter={(v) => [`$${Number(v).toFixed(2)}`, "PRICE"]}
              itemStyle={{ color: lineColor }}
            />
            <ReferenceLine y={firstClose} stroke="#1a1a1a" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="price" stroke={lineColor} strokeWidth={1.5} fill="url(#priceGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
