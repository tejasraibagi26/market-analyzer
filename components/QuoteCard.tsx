"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Quote } from "@/types/market";

interface Props {
  quote: Quote;
  onClick?: () => void;
  selected?: boolean;
  inWatchlist?: boolean;
  onAddToWatchlist?: (symbol: string) => void;
  targetPrice?: number;
  onSetTarget?: (symbol: string, price: number | null, currentPrice?: number) => void;
}

function TargetModal({ quote, targetPrice, onSetTarget, onClose }: {
  quote: Quote;
  targetPrice?: number;
  onSetTarget: (symbol: string, price: number | null, currentPrice?: number) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState(targetPrice != null ? String(targetPrice) : "");
  const inputRef = useRef<HTMLInputElement>(null);
  const currencyPrefix = quote.currency === "CAD" ? "CA$" : "$";
  const val = parseFloat(input);
  const valid = !isNaN(val) && val > 0;
  const upside = valid ? ((val - quote.price) / quote.price) * 100 : null;

  useEffect(() => { inputRef.current?.focus(); }, []);

  const commit = () => {
    if (valid) { onSetTarget(quote.symbol, val, quote.price); onClose(); }
  };

  const clear = () => { onSetTarget(quote.symbol, null); onClose(); };

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#080808", border: "1px solid #1e1e1e", width: "100%", maxWidth: "360px", margin: "0 16px", fontFamily: "'Space Mono', monospace" }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #111", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "0.58rem", color: "#00ff8866", letterSpacing: "2px", marginBottom: "4px" }}>PRICE ALERT</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "2px", color: "#fff" }}>
                {quote.symbol.replace(".TO", "")}
              </span>
              <span style={{ fontSize: "0.62rem", color: "#444" }}>{currencyPrefix}{quote.price.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#333", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: "4px" }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.6rem", color: "#444", letterSpacing: "1px", marginBottom: "8px" }}>TARGET PRICE</div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", border: "1px solid #2a2a2a", background: "#0a0a0a" }}>
              <span style={{ padding: "0 10px", color: "#444", fontSize: "0.7rem" }}>{currencyPrefix}</span>
              <input
                ref={inputRef}
                type="number"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && valid) commit(); if (e.key === "Escape") onClose(); }}
                placeholder="0.00"
                style={{ flex: 1, background: "transparent", border: "none", color: "#e0e0e0", fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", padding: "10px 10px 10px 0", outline: "none", width: 0, MozAppearance: "textfield" } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Upside indicator */}
          <div style={{ marginTop: "10px", height: "20px" }}>
            {upside !== null && (
              <span style={{ fontSize: "0.62rem", color: upside >= 0 ? "#00ff8877" : "#ff444477", letterSpacing: "0.5px" }}>
                {upside >= 0 ? "▲" : "▼"} {Math.abs(upside).toFixed(1)}% {upside >= 0 ? "upside" : "downside"} from current price
              </span>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button
              onClick={commit}
              disabled={!valid}
              style={{ flex: 1, padding: "10px", background: valid ? "#001a0d" : "transparent", border: `1px solid ${valid ? "#00ff8830" : "#1e1e1e"}`, color: valid ? "#00ff88" : "#333", cursor: valid ? "pointer" : "not-allowed", fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", letterSpacing: "1px", transition: "all 0.15s" }}
            >
              {targetPrice != null ? "UPDATE" : "SET ALERT"}
            </button>
            {targetPrice != null && (
              <button
                onClick={clear}
                style={{ padding: "10px 14px", background: "transparent", border: "1px solid #1e1e1e", color: "#444", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", letterSpacing: "1px", transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#ff444440"; (e.currentTarget as HTMLElement).style.color = "#ff4444"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"; (e.currentTarget as HTMLElement).style.color = "#444"; }}
              >
                CLEAR
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function QuoteCard({ quote, onClick, selected, inWatchlist, onAddToWatchlist, targetPrice, onSetTarget }: Props) {
  const [added, setAdded] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);

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

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inWatchlist && onAddToWatchlist) {
      onAddToWatchlist(quote.symbol);
      setAdded(true);
    }
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
    <>
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

        {/* Top row: symbol + price */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.25rem", letterSpacing: "2px", color: "#fff", flexShrink: 0, lineHeight: 1 }}>
            {quote.symbol.replace(".TO", "")}
          </span>
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

        {/* Badges row */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "0.58rem", padding: "2px 5px", border: "1px solid #1c1c1c", color: "#444", letterSpacing: "1px" }}>
            {quote.type.toUpperCase()}
          </span>
          {quote.currency === "CAD" && (
            <span style={{ fontSize: "0.55rem", padding: "2px 5px", border: "1px solid #b8621822", background: "#b8621808", color: "#b86218", letterSpacing: "1px" }}>
              CA
            </span>
          )}
          {targetHit && (
            <span style={{ fontSize: "0.55rem", padding: "2px 5px", border: "1px solid #ffd70040", background: "#ffd70010", color: "#ffd700", letterSpacing: "1px" }}>
              TARGET
            </span>
          )}
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

        {/* Bottom row: metrics + alert button */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.65rem", color: "#2e2e2e" }}>Vol {formatVolume(quote.volume)}</span>
          {quote.marketCap && <span style={{ fontSize: "0.65rem", color: "#2e2e2e" }}>MCap {formatMarketCap(quote.marketCap)}</span>}
          {quote.pe && <span style={{ fontSize: "0.65rem", color: "#2e2e2e" }}>P/E {quote.pe.toFixed(1)}</span>}
          {quote.dividendYield && <span style={{ fontSize: "0.65rem", color: "#2e2e2e" }}>DIV {quote.dividendYield.toFixed(2)}%</span>}

          {/* Alert / target button */}
          {inWatchlist && onSetTarget && (
            <button
              onClick={e => { e.stopPropagation(); setShowTargetModal(true); }}
              title={targetPrice != null ? `Alert at ${currencyPrefix}${targetPrice.toFixed(2)}` : "Set price alert"}
              style={{
                marginLeft: "auto",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                background: targetPrice != null ? (targetHit ? "#1a1200" : "#001a0d") : "transparent",
                border: `1px solid ${targetHit ? "#ffd70040" : targetPrice != null ? "#00ff8825" : "#1c1c1c"}`,
                color: targetHit ? "#ffd700" : targetPrice != null ? "#00ff8888" : "#333",
                padding: "3px 8px",
                cursor: "pointer",
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.58rem",
                letterSpacing: "0.5px",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = targetHit ? "#ffd70060" : "#00ff8840";
                el.style.color = targetHit ? "#ffd700" : "#00ff88";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = targetHit ? "#ffd70040" : targetPrice != null ? "#00ff8825" : "#1c1c1c";
                el.style.color = targetHit ? "#ffd700" : targetPrice != null ? "#00ff8888" : "#333";
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {targetPrice != null ? `${currencyPrefix}${targetPrice.toFixed(2)}` : "alert"}
            </button>
          )}

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

      {showTargetModal && onSetTarget && (
        <TargetModal
          quote={quote}
          targetPrice={targetPrice}
          onSetTarget={onSetTarget}
          onClose={() => setShowTargetModal(false)}
        />
      )}
    </>
  );
}
