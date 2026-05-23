"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const mono = "'Space Mono', monospace";
const bebas = "'Bebas Neue', sans-serif";

const FEATURES = [
  {
    tag: "◈ REAL-TIME DATA",
    title: "Live Market Quotes",
    desc: "Pull live prices, volume, and daily change for any stock or ETF via Yahoo Finance. Your watchlist updates on demand.",
  },
  {
    tag: "◈ TECHNICAL ANALYSIS",
    title: "RSI · MACD · Bollinger",
    desc: "Rule-based signals computed on historical data. Spot overbought/oversold conditions and momentum shifts at a glance.",
  },
  {
    tag: "◈ AI SIGNALS",
    title: "Claude-Powered Insights",
    desc: "Bring your own Anthropic API key and get natural-language market outlook and ranked buy suggestions from Claude Sonnet.",
  },
  {
    tag: "◈ EMAIL DIGEST",
    title: "Scheduled Reports",
    desc: "Get your watchlist analysis delivered on a schedule — daily, weekdays, or weekly. Set it and forget it.",
  },
];

const TICKERS = ["AAPL", "TSLA", "NVDA", "SPY", "QQQ", "MSFT", "AMZN", "BTC-USD", "XEQT.TO", "VFV.TO"];

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/");
    });
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#eee", fontFamily: mono, overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #111", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#050505cc", backdropFilter: "blur(8px)", zIndex: 10 }}>
        <div>
          <div style={{ fontSize: "0.58rem", color: "#00ff88", letterSpacing: "3px", marginBottom: "2px" }}>◈ Technical Analysis</div>
          <div style={{ fontFamily: bebas, fontSize: "1.4rem", letterSpacing: "4px", background: "linear-gradient(135deg,#fff 0%,#555 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            MARKET<span style={{ WebkitTextFillColor: "#00ff88" }}> ANALYTICS</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => router.push("/login")}
            style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#555", padding: "8px 16px", fontFamily: mono, fontSize: "0.72rem", letterSpacing: "1px", cursor: "pointer" }}>
            Sign In
          </button>
          <button onClick={() => router.push("/login")}
            style={{ background: "#00ff88", border: "none", color: "#001a0d", padding: "8px 16px", fontFamily: mono, fontWeight: "700", fontSize: "0.72rem", letterSpacing: "1px", cursor: "pointer" }}>
            Get Started →
          </button>
        </div>
      </nav>

      {/* Ticker tape */}
      <div style={{ borderBottom: "1px solid #0d0d0d", background: "#080808", overflow: "hidden", padding: "8px 0" }}>
        <div style={{ display: "flex", animation: "marquee 20s linear infinite", width: "max-content" }}>
          {[...TICKERS, ...TICKERS].map((t, i) => (
            <span key={i} style={{ fontSize: "0.65rem", color: "#1a1a1a", letterSpacing: "2px", marginRight: "32px", whiteSpace: "nowrap" }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section style={{
        maxWidth: "960px", margin: "0 auto", padding: "80px 24px 64px",
        backgroundImage: "radial-gradient(ellipse at 10% 0%,#001a0d 0%,transparent 50%), radial-gradient(ellipse at 90% 100%,#0a0a1a 0%,transparent 50%)",
        animation: "fadeUp 0.6s ease",
      }}>
        <div style={{ fontSize: "0.65rem", color: "#00ff88", letterSpacing: "4px", marginBottom: "20px" }}>◈ AI-POWERED MARKET INTELLIGENCE</div>

        <h1 style={{ fontFamily: bebas, fontSize: "clamp(3rem, 10vw, 6rem)", letterSpacing: "4px", lineHeight: 1, margin: "0 0 24px" }}>
          <span style={{ background: "linear-gradient(135deg,#fff 0%,#888 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            TRACK. ANALYZE.
          </span>
          <br />
          <span style={{ color: "#00ff88" }}>DECIDE.</span>
        </h1>

        <p style={{ fontSize: "0.9rem", color: "#444", lineHeight: 1.9, maxWidth: "560px", marginBottom: "36px" }}>
          Real-time quotes, technical signals, and Claude AI analysis for your stock and ETF watchlist.
          No noise — just the data you need.
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={() => router.push("/login")}
            style={{ background: "#00ff88", border: "none", color: "#001a0d", padding: "14px 28px", fontFamily: mono, fontWeight: "700", fontSize: "0.82rem", letterSpacing: "1px", cursor: "pointer", boxShadow: "0 0 40px rgba(0,255,136,0.2)", animation: "pulse 3s infinite" }}>
            Start for free →
          </button>
          <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#444", padding: "14px 28px", fontFamily: mono, fontSize: "0.82rem", letterSpacing: "1px", cursor: "pointer" }}>
            See features
          </button>
        </div>

        {/* Mini stat strip */}
        <div style={{ display: "flex", gap: "32px", marginTop: "56px", flexWrap: "wrap" }}>
          {[
            { val: "Real-time", label: "Market data" },
            { val: "RSI · MACD", label: "Technical indicators" },
            { val: "Claude AI", label: "Optional AI signals" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: bebas, fontSize: "1.4rem", color: "#fff", letterSpacing: "2px" }}>{s.val}</div>
              <div style={{ fontSize: "0.62rem", color: "#333", letterSpacing: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard preview placeholder */}
      <section style={{ maxWidth: "960px", margin: "0 auto 64px", padding: "0 24px" }}>
        <div style={{ border: "1px solid #111", background: "#080808", padding: "0" }}>
          {/* Fake header bar */}
          <div style={{ borderBottom: "1px solid #111", padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff4444" }} />
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ffaa00" }} />
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00ff88" }} />
            <div style={{ flex: 1, height: "1px", background: "#111" }} />
            <div style={{ fontSize: "0.62rem", color: "#1a1a1a", letterSpacing: "2px" }}>MARKET ANALYTICS</div>
          </div>
          {/* Fake quote tiles */}
          <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "1px", background: "#111" }}>
            {[
              { sym: "AAPL",    price: "211.34", chg: "+1.24%" , up: true },
              { sym: "NVDA",    price: "134.72", chg: "+3.88%" , up: true },
              { sym: "TSLA",    price: "249.10", chg: "-2.13%" , up: false },
              { sym: "SPY",     price: "587.44", chg: "+0.67%" , up: true },
              { sym: "QQQ",     price: "512.80", chg: "+0.91%" , up: true },
              { sym: "MSFT",    price: "449.26", chg: "-0.35%" , up: false },
            ].map(q => (
              <div key={q.sym} style={{ background: "#080808", padding: "14px 16px" }}>
                <div style={{ fontSize: "0.72rem", color: "#555", letterSpacing: "1px", marginBottom: "6px" }}>{q.sym}</div>
                <div style={{ fontFamily: bebas, fontSize: "1.3rem", color: "#ddd", letterSpacing: "1px" }}>{q.price}</div>
                <div style={{ fontSize: "0.68rem", color: q.up ? "#00ff88" : "#ff4444" }}>{q.chg}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 20px", borderTop: "1px solid #0d0d0d" }}>
            <div style={{ height: "60px", background: "linear-gradient(90deg, #001a0d 0%, #00ff8811 40%, #001a0d 100%)", borderRadius: "2px", position: "relative", overflow: "hidden" }}>
              <svg viewBox="0 0 400 60" preserveAspectRatio="none" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
                <polyline points="0,50 40,42 80,38 120,44 160,28 200,20 240,30 280,18 320,24 360,16 400,10" fill="none" stroke="#00ff88" strokeWidth="1.5" opacity="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth: "960px", margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ fontSize: "0.62rem", color: "#00ff88", letterSpacing: "4px", marginBottom: "8px" }}>◈ WHAT YOU GET</div>
        <div style={{ fontFamily: bebas, fontSize: "clamp(1.8rem,5vw,3rem)", letterSpacing: "4px", color: "#fff", marginBottom: "40px" }}>BUILT FOR TRADERS</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1px", background: "#111" }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: "#080808", padding: "28px 24px" }}>
              <div style={{ fontSize: "0.60rem", color: "#00ff88", letterSpacing: "3px", marginBottom: "10px" }}>{f.tag}</div>
              <div style={{ fontFamily: bebas, fontSize: "1.4rem", letterSpacing: "2px", color: "#fff", marginBottom: "10px" }}>{f.title}</div>
              <p style={{ fontSize: "0.75rem", color: "#333", lineHeight: 1.8, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: "960px", margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ border: "1px solid #1a1a1a", background: "#080808", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: "0.62rem", color: "#00ff88", letterSpacing: "4px", marginBottom: "12px" }}>◈ FREE TO USE</div>
          <div style={{ fontFamily: bebas, fontSize: "clamp(2rem,6vw,3.5rem)", letterSpacing: "4px", color: "#fff", marginBottom: "16px", lineHeight: 1 }}>
            READY TO START?
          </div>
          <p style={{ fontSize: "0.78rem", color: "#333", lineHeight: 1.8, marginBottom: "28px" }}>
            Create an account to save your watchlist and settings across devices.
          </p>
          <button onClick={() => router.push("/login")}
            style={{ background: "#00ff88", border: "none", color: "#001a0d", padding: "14px 36px", fontFamily: mono, fontWeight: "700", fontSize: "0.82rem", letterSpacing: "1px", cursor: "pointer", boxShadow: "0 0 40px rgba(0,255,136,0.15)" }}>
            Create free account →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #0d0d0d", padding: "20px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "0.60rem", color: "#1a1a1a", letterSpacing: "1px", margin: 0 }}>
          Not financial advice · Data from Yahoo Finance
        </p>
      </footer>
    </div>
  );
}
