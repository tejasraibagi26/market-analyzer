"use client";

import type { Suggestion } from "@/types/market";

const ACTION_CONFIG: Record<string, { bg: string; color: string; glow: string }> = {
  buy:   { bg: "#00ff88", color: "#001a0d", glow: "rgba(0,255,136,0.4)" },
  hold:  { bg: "#ffd700", color: "#1a1400", glow: "rgba(255,215,0,0.4)" },
  sell:  { bg: "#ff4444", color: "#1a0000", glow: "rgba(255,68,68,0.4)" },
  watch: { bg: "#888",    color: "#111",    glow: "rgba(136,136,136,0.3)" },
};

const Tag = ({ text, type }: { text: string; type: "positive" | "negative" | "neutral" }) => {
  const colors = { positive: "#00ff88", negative: "#ff4444", neutral: "#555" };
  const color = colors[type];
  return (
    <span style={{ display: "inline-block", padding: "4px 10px", border: `1px solid ${color}22`, background: `${color}0d`, color, fontSize: "0.75rem", fontFamily: "'Space Mono', monospace", marginRight: "6px", marginBottom: "6px", letterSpacing: "0px" }}>
      {text}
    </span>
  );
};

interface Props {
  suggestion: Suggestion;
}

export default function SuggestionCard({ suggestion: s }: Props) {
  const cfg = ACTION_CONFIG[s.action] ?? ACTION_CONFIG.watch;
  const upside = s.targetPrice ? ((s.targetPrice - s.currentPrice) / s.currentPrice) * 100 : null;

  return (
    <div style={{ border: "1px solid #161616", background: "#080808", padding: "20px", position: "relative", overflow: "hidden" }}>
      {/* Top accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: cfg.bg, opacity: 0.6 }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px", lineHeight: 1, color: "#fff" }}>{s.symbol}</div>
          <div style={{ fontSize: "0.78rem", color: "#555", letterSpacing: "0px", marginTop: "3px" }}>{s.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <div style={{ background: cfg.bg, color: cfg.color, padding: "7px 16px", fontFamily: "'Space Mono', monospace", fontWeight: "700", fontSize: "0.78rem", letterSpacing: "1px", boxShadow: `0 0 20px ${cfg.glow}` }}>
            {s.action.toUpperCase()}
          </div>
          <div style={{ fontSize: "0.9rem", color: "#eee", fontWeight: "700" }}>${s.currentPrice.toFixed(2)}</div>
          {s.targetPrice && upside !== null && (
            <div style={{ fontSize: "0.75rem", color: upside > 0 ? "#00ff88" : "#ff4444" }}>
              ↑ ${s.targetPrice.toFixed(2)} ({upside > 0 ? "+" : ""}{upside.toFixed(1)}%)
            </div>
          )}
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
          <span style={{ fontSize: "0.7rem", color: "#444", letterSpacing: "1px" }}>Confidence</span>
          <span style={{ fontSize: "0.7rem", color: "#666" }}>{s.confidence}%</span>
        </div>
        <div style={{ height: "2px", background: "#111" }}>
          <div style={{ height: "100%", width: `${s.confidence}%`, background: cfg.bg, transition: "width 1.2s ease", boxShadow: `0 0 6px ${cfg.glow}` }} />
        </div>
      </div>

      <p style={{ fontSize: "0.82rem", color: "#999", lineHeight: 1.75, marginBottom: "14px" }}>{s.reasoning}</p>

      {s.keyPoints.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "0.68rem", color: "#00ff88", letterSpacing: "1px", marginBottom: "8px" }}>▲ Key Points</div>
          {s.keyPoints.map((pt, i) => <Tag key={i} text={pt} type="positive" />)}
        </div>
      )}

      {s.risks.length > 0 && (
        <div>
          <div style={{ fontSize: "0.68rem", color: "#ff4444", letterSpacing: "1px", marginBottom: "8px" }}>▼ Risks</div>
          {s.risks.map((r, i) => <Tag key={i} text={r} type="negative" />)}
        </div>
      )}
    </div>
  );
}
