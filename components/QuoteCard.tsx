"use client";

import { useState } from "react";
import type { Quote } from "@/types/market";

interface Props {
  quote: Quote;
  onClick?: () => void;
  selected?: boolean;
  inWatchlist?: boolean;
  onAddToWatchlist?: (symbol: string) => void;
}

export default function QuoteCard({ quote, onClick, selected, inWatchlist, onAddToWatchlist }: Props) {
  const [added, setAdded] = useState(false);
  const isPositive = quote.changePercent >= 0;
  const priceFromLow =
    quote.fiftyTwoWeekHigh > quote.fiftyTwoWeekLow
      ? ((quote.price - quote.fiftyTwoWeekLow) /
          (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) *
        100
      : 50;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inWatchlist && onAddToWatchlist) {
      onAddToWatchlist(quote.symbol);
      setAdded(true);
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: "16px",
        border: `1px solid ${selected ? "#00ff8840" : "#1a1a1a"}`,
        background: selected ? "#001a0d" : "#080808",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a";
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a";
      }}
    >
      {selected && (
        <div style={{ position: "absolute", top: 0, left: 0, width: "2px", height: "100%", background: "#00ff88" }} />
      )}

      {/* Symbol row */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: "2px", color: "#fff", flexShrink: 0 }}>
          {quote.symbol.replace(".TO", "")}
        </span>
        <span style={{ fontSize: "0.6rem", padding: "2px 5px", border: "1px solid #1a1a1a", color: "#555", letterSpacing: "1px", flexShrink: 0 }}>
          {quote.type.toUpperCase()}
        </span>
        {quote.currency === "CAD" && (
          <span style={{ fontSize: "0.55rem", padding: "2px 5px", border: "1px solid #b8621822", background: "#b8621811", color: "#b86218", letterSpacing: "1px", flexShrink: 0 }}>
            🍁 CA
          </span>
        )}
        {/* Add to watchlist button — only shown when not already in watchlist */}
        {!inWatchlist && onAddToWatchlist && (
          <button
            onClick={handleAdd}
            title="Add to watchlist"
            style={{
              marginLeft: "auto",
              flexShrink: 0,
              background: added ? "#001a0d" : "transparent",
              border: `1px solid ${added ? "#00ff8830" : "#1a1a1a"}`,
              color: added ? "#00ff88" : "#333",
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: added ? "default" : "pointer",
              fontSize: "0.75rem",
              lineHeight: 1,
              transition: "all 0.2s",
              padding: 0,
            }}
            onMouseEnter={e => { if (!added) (e.currentTarget as HTMLElement).style.borderColor = "#00ff8840"; (e.currentTarget as HTMLElement).style.color = "#00ff88"; }}
            onMouseLeave={e => { if (!added) { (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a"; (e.currentTarget as HTMLElement).style.color = "#333"; } }}
          >
            {added ? "✓" : "+"}
          </button>
        )}
      </div>

      {/* Name + price row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", gap: "8px" }}>
        <p style={{ fontSize: "0.72rem", color: "#555", fontFamily: "'Space Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1, margin: 0 }}>
          {quote.name}
        </p>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: "0.95rem", fontWeight: "700", color: "#eee", margin: 0 }}>
            {quote.currency === "CAD" ? "CA$" : "$"}{quote.price.toFixed(2)}
          </p>
          <p style={{ fontSize: "0.78rem", fontWeight: "700", color: isPositive ? "#00ff88" : "#ff4444", margin: "2px 0 0" }}>
            {isPositive ? "+" : ""}{quote.changePercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* 52-week range */}
      <div style={{ marginTop: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontSize: "0.68rem", color: "#444" }}>${quote.fiftyTwoWeekLow.toFixed(0)}</span>
          <span style={{ fontSize: "0.65rem", color: "#333", letterSpacing: "1px" }}>52W</span>
          <span style={{ fontSize: "0.68rem", color: "#444" }}>${quote.fiftyTwoWeekHigh.toFixed(0)}</span>
        </div>
        <div style={{ height: "2px", background: "#1a1a1a", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, height: "100%", width: `${Math.min(Math.max(priceFromLow, 1), 99)}%`, background: isPositive ? "#00ff88" : "#ff4444" }} />
        </div>
      </div>

      {/* P/E + dividend — always rendered for equal card height */}
      <div style={{ marginTop: "8px", display: "flex", gap: "12px", minHeight: "1rem" }}>
        {quote.pe ? <span style={{ fontSize: "0.7rem", color: "#444" }}>P/E {quote.pe.toFixed(1)}</span> : null}
        {quote.dividendYield ? <span style={{ fontSize: "0.7rem", color: "#444" }}>DIV {quote.dividendYield.toFixed(2)}%</span> : null}
      </div>
    </div>
  );
}
