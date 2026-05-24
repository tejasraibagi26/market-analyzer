"use client";

import { useState, useRef, useEffect } from "react";
import type { Quote } from "@/types/market";

interface Props {
  quote: Quote;
  onClick?: () => void;
  selected?: boolean;
  inWatchlist?: boolean;
  onAddToWatchlist?: (symbol: string) => void;
  targetPrice?: number;
  onSetTarget?: (symbol: string, price: number | null) => void;
}

export default function QuoteCard({ quote, onClick, selected, inWatchlist, onAddToWatchlist, targetPrice, onSetTarget }: Props) {
  const [added, setAdded] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const targetInputRef = useRef<HTMLInputElement>(null);

  const isPositive = quote.changePercent >= 0;
  const priceFromLow =
    quote.fiftyTwoWeekHigh > quote.fiftyTwoWeekLow
      ? ((quote.price - quote.fiftyTwoWeekLow) /
          (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) *
        100
      : 50;

  const targetHit = targetPrice != null && (
    quote.price >= targetPrice ||
    Math.abs(quote.price - targetPrice) / targetPrice <= 0.02
  );

  useEffect(() => {
    if (editingTarget && targetInputRef.current) {
      targetInputRef.current.focus();
    }
  }, [editingTarget]);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inWatchlist && onAddToWatchlist) {
      onAddToWatchlist(quote.symbol);
      setAdded(true);
    }
  };

  const commitTarget = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const val = parseFloat(targetInput);
    if (!isNaN(val) && val > 0 && onSetTarget) {
      onSetTarget(quote.symbol, val);
    }
    setEditingTarget(false);
    setTargetInput("");
  };

  const clearTarget = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSetTarget) onSetTarget(quote.symbol, null);
  };

  const openTargetEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetInput(targetPrice != null ? String(targetPrice) : "");
    setEditingTarget(true);
  };

  const formatVolume = (v: number) => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v.toString();
  };

  const formatMarketCap = (mc: number) => {
    if (mc >= 1_000_000_000_000) return `${(mc / 1_000_000_000_000).toFixed(1)}T`;
    if (mc >= 1_000_000_000) return `${(mc / 1_000_000_000).toFixed(1)}B`;
    if (mc >= 1_000_000) return `${(mc / 1_000_000).toFixed(0)}M`;
    return mc.toString();
  };

  const accent = isPositive ? "#00ff88" : "#ff4444";
  const currencyPrefix = quote.currency === "CAD" ? "CA$" : "$";

  return (
    <div
      onClick={onClick}
      style={{
        padding: "14px 16px 12px",
        border: `1px solid ${targetHit ? "#ffd70040" : selected ? "#00ff8840" : "#151515"}`,
        background: targetHit ? "#0d0a00" : selected ? "#020f07" : "#060606",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
      onMouseEnter={(e) => {
        if (!selected && !targetHit) (e.currentTarget as HTMLElement).style.borderColor = "#252525";
      }}
      onMouseLeave={(e) => {
        if (!selected && !targetHit) (e.currentTarget as HTMLElement).style.borderColor = "#151515";
      }}
    >
      {/* Left accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "2px", height: "100%", background: targetHit ? "#ffd700" : selected ? "#00ff88" : accent, opacity: selected || targetHit ? 1 : 0.25 }} />

      {/* Top row: symbol + badges + price */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", minWidth: 0 }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.25rem", letterSpacing: "2px", color: "#fff", flexShrink: 0 }}>
            {quote.symbol.replace(".TO", "")}
          </span>
          <span style={{ fontSize: "0.58rem", padding: "2px 5px", border: "1px solid #1c1c1c", color: "#444", letterSpacing: "1px", flexShrink: 0 }}>
            {quote.type.toUpperCase()}
          </span>
          {quote.currency === "CAD" && (
            <span style={{ fontSize: "0.55rem", padding: "2px 5px", border: "1px solid #b8621822", background: "#b8621808", color: "#b86218", letterSpacing: "1px", flexShrink: 0 }}>
              CA
            </span>
          )}
          {targetHit && (
            <span style={{ fontSize: "0.55rem", padding: "2px 5px", border: "1px solid #ffd70040", background: "#ffd70010", color: "#ffd700", letterSpacing: "1px", flexShrink: 0 }}>
              TARGET
            </span>
          )}
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "1rem", fontWeight: "700", color: "#f0f0f0", lineHeight: 1 }}>
            {currencyPrefix}{quote.price.toFixed(2)}
          </div>
          <div style={{ fontSize: "0.78rem", fontWeight: "700", color: accent, marginTop: "3px" }}>
            {isPositive ? "+" : ""}{quote.changePercent.toFixed(2)}%
          </div>
          <div style={{ fontSize: "0.68rem", color: "#333", marginTop: "2px" }}>
            {isPositive ? "+" : ""}{currencyPrefix}{quote.change.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Company name */}
      <p style={{ fontSize: "0.68rem", color: "#3a3a3a", fontFamily: "'Space Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
        {quote.name}
      </p>

      {/* 52-week range */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
          <span style={{ fontSize: "0.62rem", color: "#333" }}>${quote.fiftyTwoWeekLow.toFixed(0)}</span>
          <span style={{ fontSize: "0.60rem", color: "#2a2a2a", letterSpacing: "1px" }}>52W RANGE</span>
          <span style={{ fontSize: "0.62rem", color: "#333" }}>${quote.fiftyTwoWeekHigh.toFixed(0)}</span>
        </div>
        <div style={{ height: "3px", background: "#111", borderRadius: "2px", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(Math.max(priceFromLow, 1), 99)}%`, background: `linear-gradient(90deg, ${accent}66, ${accent})`, borderRadius: "2px" }} />
          <div style={{ position: "absolute", top: "-2px", left: `${Math.min(Math.max(priceFromLow, 1), 99)}%`, transform: "translateX(-50%)", width: "2px", height: "7px", background: accent, borderRadius: "1px" }} />
        </div>
      </div>

      {/* Target price row */}
      {inWatchlist && onSetTarget && (
        <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "6px", minHeight: "20px" }}>
          {editingTarget ? (
            <>
              <span style={{ fontSize: "0.6rem", color: "#555", letterSpacing: "1px" }}>⊙</span>
              <input
                ref={targetInputRef}
                type="number"
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") commitTarget(e);
                  if (e.key === "Escape") { setEditingTarget(false); setTargetInput(""); }
                }}
                placeholder="target price"
                style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ccc", fontFamily: "'Space Mono', monospace", fontSize: "0.68rem", padding: "3px 8px", width: "90px", outline: "none" }}
              />
              <button onClick={commitTarget} style={{ background: "transparent", border: "1px solid #00ff8830", color: "#00ff88", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", padding: "2px 8px" }}>set</button>
              <button onClick={e => { e.stopPropagation(); setEditingTarget(false); setTargetInput(""); }} style={{ background: "transparent", border: "none", color: "#333", cursor: "pointer", fontSize: "0.75rem", padding: 0 }}>×</button>
            </>
          ) : targetPrice != null ? (
            <>
              <span style={{ fontSize: "0.6rem", color: targetHit ? "#ffd700" : "#00ff8855", letterSpacing: "1px" }}>⊙</span>
              <button onClick={openTargetEdit} style={{ background: "transparent", border: "none", color: targetHit ? "#ffd700" : "#00ff8877", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "0.68rem", padding: 0, letterSpacing: "0.5px" }}>
                {currencyPrefix}{targetPrice.toFixed(2)}
              </button>
              <button onClick={clearTarget} style={{ background: "transparent", border: "none", color: "#333", cursor: "pointer", fontSize: "0.75rem", padding: "0 0 0 2px", lineHeight: 1 }}>×</button>
            </>
          ) : (
            <button onClick={openTargetEdit} style={{ background: "transparent", border: "1px solid #1e1e1e", color: "#444", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "0.62rem", padding: "3px 8px", letterSpacing: "1px", transition: "color 0.15s, border-color 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#00ff88"; (e.currentTarget as HTMLElement).style.borderColor = "#00ff8840"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#444"; (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"; }}>
              + set target
            </button>
          )}
        </div>
      )}

      {/* Bottom metrics row */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.65rem", color: "#2e2e2e" }}>Vol {formatVolume(quote.volume)}</span>
        {quote.marketCap && <span style={{ fontSize: "0.65rem", color: "#2e2e2e" }}>MCap {formatMarketCap(quote.marketCap)}</span>}
        {quote.pe && <span style={{ fontSize: "0.65rem", color: "#2e2e2e" }}>P/E {quote.pe.toFixed(1)}</span>}
        {quote.dividendYield && <span style={{ fontSize: "0.65rem", color: "#2e2e2e" }}>DIV {quote.dividendYield.toFixed(2)}%</span>}

        {/* Add to watchlist */}
        {!inWatchlist && onAddToWatchlist && (
          <button
            onClick={handleAdd}
            title="Add to watchlist"
            style={{
              marginLeft: "auto",
              flexShrink: 0,
              background: added ? "#001a0d" : "transparent",
              border: `1px solid ${added ? "#00ff8830" : "#1c1c1c"}`,
              color: added ? "#00ff88" : "#2a2a2a",
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: added ? "default" : "pointer",
              fontSize: "0.75rem",
              lineHeight: 1,
              transition: "all 0.15s",
              padding: 0,
            }}
            onMouseEnter={e => { if (!added) { (e.currentTarget as HTMLElement).style.borderColor = "#00ff8840"; (e.currentTarget as HTMLElement).style.color = "#00ff88"; } }}
            onMouseLeave={e => { if (!added) { (e.currentTarget as HTMLElement).style.borderColor = "#1c1c1c"; (e.currentTarget as HTMLElement).style.color = "#2a2a2a"; } }}
          >
            {added ? "✓" : "+"}
          </button>
        )}
      </div>
    </div>
  );
}
