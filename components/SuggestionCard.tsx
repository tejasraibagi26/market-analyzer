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

const SENTIMENT_ICON: Record<string, string> = { bullish: "▲", bearish: "▼", neutral: "◈" };
const SENTIMENT_COLOR: Record<string, string> = { bullish: "#00ff88", bearish: "#ff4444", neutral: "#555" };

export default function SuggestionCard({ suggestion: s }: Props) {
  const cfg = ACTION_CONFIG[s.action] ?? ACTION_CONFIG.watch;
  const upside = s.targetPrice ? ((s.targetPrice - s.currentPrice) / s.currentPrice) * 100 : null;
  const sentimentColor = SENTIMENT_COLOR[s.sentiment] ?? "#555";

  return (
    <div style={{ border: "1px solid #141414", background: "#060606", padding: "20px", position: "relative", overflow: "hidden" }}>
      {/* Left accent bar keyed to action */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "3px", height: "100%", background: cfg.bg, opacity: 0.7 }} />

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px", lineHeight: 1, color: "#fff" }}>{s.symbol}</div>
            <span style={{ fontSize: "0.72rem", color: sentimentColor, border: `1px solid ${sentimentColor}22`, padding: "2px 8px", background: `${sentimentColor}08`, letterSpacing: "1px", whiteSpace: "nowrap" }}>
              {SENTIMENT_ICON[s.sentiment]} {s.sentiment.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#383838", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px", flexShrink: 0, marginLeft: "12px" }}>
          <div style={{ background: cfg.bg, color: cfg.color, padding: "6px 14px", fontFamily: "'Space Mono', monospace", fontWeight: "700", fontSize: "0.75rem", letterSpacing: "1px", boxShadow: `0 0 16px ${cfg.glow}` }}>
            {s.action.toUpperCase()}
          </div>
          <div style={{ fontSize: "0.95rem", color: "#e8e8e8", fontWeight: "700" }}>${s.currentPrice.toFixed(2)}</div>
          {s.targetPrice && upside !== null && (
            <div style={{ fontSize: "0.72rem", color: upside > 0 ? "#00ff88" : "#ff4444", fontWeight: "700" }}>
              → ${s.targetPrice.toFixed(2)}&nbsp;
              <span style={{ color: upside > 0 ? "#00ff8888" : "#ff444488" }}>({upside > 0 ? "+" : ""}{upside.toFixed(1)}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
          <span style={{ fontSize: "0.65rem", color: "#2e2e2e", letterSpacing: "1px" }}>CONFIDENCE</span>
          <span style={{ fontSize: "0.65rem", color: cfg.bg, fontWeight: "700" }}>{s.confidence}%</span>
        </div>
        <div style={{ height: "3px", background: "#0e0e0e", borderRadius: "2px" }}>
          <div style={{ height: "100%", width: `${s.confidence}%`, background: `linear-gradient(90deg, ${cfg.bg}66, ${cfg.bg})`, transition: "width 1.2s ease", borderRadius: "2px", boxShadow: `0 0 6px ${cfg.glow}` }} />
        </div>
      </div>

      <p style={{ fontSize: "0.8rem", color: "#777", lineHeight: 1.8, marginBottom: "14px" }}>{s.reasoning}</p>

      {s.keyPoints.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "0.62rem", color: "#00ff8877", letterSpacing: "2px", marginBottom: "8px" }}>CATALYSTS</div>
          {s.keyPoints.map((pt, i) => <Tag key={i} text={pt} type="positive" />)}
        </div>
      )}

      {s.risks.length > 0 && (
        <div>
          <div style={{ fontSize: "0.62rem", color: "#ff444477", letterSpacing: "2px", marginBottom: "8px" }}>RISKS</div>
          {s.risks.map((r, i) => <Tag key={i} text={r} type="negative" />)}
        </div>
      )}
    </div>
  );
}
