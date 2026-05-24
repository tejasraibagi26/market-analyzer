"use client";

import { useState, KeyboardEvent } from "react";
import { DEFAULT_WATCHLIST, CANADIAN_WATCHLIST, TOP_PICKS } from "@/lib/constants";
import type { WatchlistItem } from "@/types/market";

interface Props {
  items: WatchlistItem[];
  onChange: (items: WatchlistItem[]) => void;
  onSchedule?: () => void;
  scheduleLabel?: string;
}

function makeItem(symbol: string): WatchlistItem {
  return { symbol, addedAt: new Date().toISOString() };
}

const QUICK_GROUPS = [
  { label: "US", symbols: DEFAULT_WATCHLIST },
  { label: "CA", symbols: CANADIAN_WATCHLIST },
  { label: "TOP PICKS", symbols: TOP_PICKS },
];

export default function WatchlistInput({ items, onChange, onSchedule, scheduleLabel }: Props) {
  const [input, setInput] = useState("");
  const symbols = items.map((i) => i.symbol);

  const add = (sym: string) => {
    const s = sym.trim().toUpperCase();
    if (s && !symbols.includes(s)) onChange([...items, makeItem(s)]);
  };

  const addFromInput = () => { add(input); setInput(""); };

  const remove = (sym: string) => onChange(items.filter(i => i.symbol !== sym));
  const clear   = () => onChange([]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addFromInput(); }
  };

  const addGroup = (groupSymbols: string[]) => {
    const existing = new Set(symbols);
    const toAdd = groupSymbols.filter(s => !existing.has(s)).map(makeItem);
    onChange([...items, ...toAdd]);
  };

  return (
    <div style={{ border: "1px solid #1a1a1a", background: "#080808", padding: "16px" }}>
      {/* Header */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontSize: "0.7rem", color: "#bebebe", letterSpacing: "2px" }}>◈ WATCHLIST</span>
          {items.length > 0 && (
            <button onClick={clear} style={{ fontSize: "0.62rem", color: "#333", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Space Mono', monospace", letterSpacing: "1px", padding: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#888"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#333"; }}>
              clear all
            </button>
          )}
        </div>
        {onSchedule && (
          <button onClick={onSchedule}
            style={{ width: "100%", fontSize: "0.62rem", color: scheduleLabel ? "#00ff88" : "#555", background: scheduleLabel ? "#00ff8808" : "transparent", border: `1px solid ${scheduleLabel ? "#00ff8830" : "#1a1a1a"}`, padding: "8px 12px", cursor: "pointer", fontFamily: "'Space Mono', monospace", letterSpacing: "1px", textAlign: "left", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ opacity: 0.6 }}>⏱</span>
            {scheduleLabel ? `Digest: ${scheduleLabel}` : "Schedule email digest"}
          </button>
        )}
      </div>

      {/* Input */}
      <div style={{ display: "flex", border: "1px solid #1c1c1c", background: "#050505", marginBottom: "12px", overflow: "hidden" }}>
        <div style={{ padding: "11px 12px", color: "#00ff88", borderRight: "1px solid #1c1c1c", fontSize: "1rem", flexShrink: 0 }}>$</div>
        <input
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          onKeyDown={onKey}
          placeholder="AAPL, XIU.TO..."
          maxLength={10}
          style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: "#fff", fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", letterSpacing: "1px", padding: "11px 10px", outline: "none" }}
        />
        <button onClick={addFromInput}
          style={{ background: "#00ff88", color: "#001a0d", border: "none", padding: "11px 16px", fontFamily: "'Space Mono', monospace", fontWeight: "700", fontSize: "0.78rem", letterSpacing: "1px", cursor: "pointer", flexShrink: 0 }}>
          ADD
        </button>
      </div>

      {/* Canadian ticker hint */}
      <div style={{ fontSize: "0.62rem", color: "#666", fontFamily: "'Space Mono', monospace", marginBottom: "12px", lineHeight: 1.6, borderLeft: "2px solid #1a1a1a", paddingLeft: "8px" }}>
        Canadian tickers need <span style={{ color: "#00ff88" }}>.TO</span> — e.g. <span style={{ color: "#ccc" }}>XEQT.TO</span>
      </div>

      {/* Quick-add group buttons */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "0.62rem", color: "#333", letterSpacing: "1px", marginBottom: "8px" }}>Quick add</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {QUICK_GROUPS.map(g => (
            <button key={g.label} onClick={() => addGroup(g.symbols)}
              style={{ padding: "5px 12px", background: "transparent", border: "1px solid #1a1a1a", color: "#666", fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", cursor: "pointer", letterSpacing: "1px", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#00ff8844"; (e.currentTarget as HTMLElement).style.color = "#00ff88"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a"; (e.currentTarget as HTMLElement).style.color = "#666"; }}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Current symbols */}
      {items.length === 0 ? (
        <div style={{ fontSize: "0.7rem", color: "#222", textAlign: "center", padding: "12px 0" }}>
          No tickers added yet
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {items.map(item => (
            <span key={item.symbol} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 10px", border: "1px solid #1a1a1a", background: "#050505", fontSize: "0.75rem", color: "#999", fontFamily: "'Space Mono', monospace" }}>
              {item.symbol}
              {item.targetPrice != null && (
                <span style={{ fontSize: "0.6rem", color: "#00ff8855", letterSpacing: "0.5px" }}>⊙</span>
              )}
              <button onClick={() => remove(item.symbol)} style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "1rem", padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
