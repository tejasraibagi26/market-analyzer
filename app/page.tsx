"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Quote, AnalysisResult } from "@/types/market";
import { DEFAULT_WATCHLIST } from "@/lib/constants";
import QuoteCard from "@/components/QuoteCard";
import PriceChart from "@/components/PriceChart";
import SuggestionCard from "@/components/SuggestionCard";
import WatchlistInput from "@/components/WatchlistInput";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

const Spinner = ({ text }: { text: string }) => {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const i = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(i);
  }, []);
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div style={{ width: "40px", height: "40px", margin: "0 auto 16px", border: "2px solid #111", borderTop: "2px solid #00ff88", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <div style={{ color: "#00ff88", fontSize: "0.75rem", letterSpacing: "2px", fontFamily: "'Space Mono', monospace" }}>{text}{dots}</div>
    </div>
  );
};

const DIGEST_PREFS_KEY = "ma_digest";
const SALT = "market-analytics-v1"; // legacy local-only obfuscation (kept for digest prefs only)

interface DigestPrefs {
  enabled: boolean;
  frequency: string;   // cron expression
  frequencyLabel: string;
  sameOnChange: boolean;
  watchlist: string[]; // snapshot at time of setup
}

function loadDigestPrefs(): DigestPrefs | null {
  try { const v = localStorage.getItem(DIGEST_PREFS_KEY); return v ? JSON.parse(v) : null; }
  catch { return null; }
}

function saveDigestPrefs(prefs: DigestPrefs) {
  try { localStorage.setItem(DIGEST_PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

function clearDigestPrefs() {
  try { localStorage.removeItem(DIGEST_PREFS_KEY); } catch {}
}

const FREQUENCIES = [
  { label: "Daily at 9am",    cron: "0 9 * * *",   short: "Daily 9am" },
  { label: "Daily at 5pm",    cron: "0 17 * * *",  short: "Daily 5pm" },
  { label: "Weekdays at 8am", cron: "0 8 * * 1-5", short: "Weekdays 8am" },
  { label: "Weekly Monday",   cron: "0 9 * * 1",   short: "Weekly Mon" },
  { label: "Weekly Friday",   cron: "0 17 * * 5",  short: "Weekly Fri" },
];

const DigestSetupModal = ({
  onSave, onSkip, initialSymbols,
}: {
  onSave: (prefs: DigestPrefs) => void;
  onSkip: () => void;
  initialSymbols: string[];
}) => {
  const [step, setStep] = useState<"consent" | "frequency" | "onChange">("consent");
  const [selectedFreq, setSelectedFreq] = useState(FREQUENCIES[0]);
  const [sameOnChange, setSameOnChange] = useState<boolean | null>(null);

  const modalStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, fontFamily: "'Space Mono', monospace", padding: "16px" };
  const boxStyle: React.CSSProperties = { width: "100%", maxWidth: "480px", border: "1px solid #1a1a1a", background: "#080808", padding: "28px" };
  const labelStyle: React.CSSProperties = { fontSize: "0.62rem", color: "#00ff88", letterSpacing: "3px", marginBottom: "6px" };
  const titleStyle: React.CSSProperties = { fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.7rem", letterSpacing: "3px", color: "#fff", marginBottom: "16px" };
  const btnPrimary: React.CSSProperties = { width: "100%", background: "#00ff88", color: "#001a0d", border: "none", padding: "13px 16px", fontFamily: "'Space Mono', monospace", fontWeight: "700", fontSize: "0.78rem", letterSpacing: "1px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" };
  const btnSecondary: React.CSSProperties = { width: "100%", background: "transparent", color: "#555", border: "1px solid #1a1a1a", padding: "13px 16px", fontFamily: "'Space Mono', monospace", fontWeight: "700", fontSize: "0.78rem", letterSpacing: "1px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" };

  if (step === "consent") return (
    <div style={modalStyle}>
      <div style={boxStyle}>
        <div style={labelStyle}>◈ EMAIL DIGEST</div>
        <div style={titleStyle}>SCHEDULED UPDATES</div>
        <p style={{ fontSize: "0.78rem", color: "#555", lineHeight: 1.8, marginBottom: "20px" }}>
          Get automatic market analysis and watchlist updates delivered to your email on a schedule.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button style={btnPrimary} onClick={() => setStep("frequency")}><span>Yes, set it up</span><span>→</span></button>
          <button style={btnSecondary} onClick={onSkip}><span>No thanks</span><span>→</span></button>
        </div>
      </div>
    </div>
  );

  if (step === "frequency") return (
    <div style={modalStyle}>
      <div style={boxStyle}>
        <button onClick={() => setStep("consent")} style={{ background: "transparent", border: "none", color: "#444", fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", cursor: "pointer", padding: "0 0 16px 0", letterSpacing: "1px" }}>← Back</button>
        <div style={labelStyle}>◈ FREQUENCY</div>
        <div style={titleStyle}>HOW OFTEN?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {FREQUENCIES.map(f => (
            <button key={f.cron} onClick={() => setSelectedFreq(f)}
              style={{ ...btnSecondary, border: `1px solid ${selectedFreq.cron === f.cron ? "#00ff88" : "#1a1a1a"}`, color: selectedFreq.cron === f.cron ? "#00ff88" : "#555", background: selectedFreq.cron === f.cron ? "#001a0d" : "transparent" }}>
              <span>{f.label}</span>
              {selectedFreq.cron === f.cron && <span>◈</span>}
            </button>
          ))}
        </div>
        <button style={btnPrimary} onClick={() => setStep("onChange")}><span>Continue</span><span>→</span></button>
      </div>
    </div>
  );

  // onChange step
  return (
    <div style={modalStyle}>
      <div style={boxStyle}>
        <button onClick={() => setStep("frequency")} style={{ background: "transparent", border: "none", color: "#444", fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", cursor: "pointer", padding: "0 0 16px 0", letterSpacing: "1px" }}>← Back</button>
        <div style={labelStyle}>◈ WATCHLIST CHANGES</div>
        <div style={titleStyle}>ON WATCHLIST CHANGE?</div>
        <p style={{ fontSize: "0.78rem", color: "#555", lineHeight: 1.8, marginBottom: "20px" }}>
          If you update your watchlist, should we keep the same schedule or ask you again?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button style={{ ...btnPrimary, background: sameOnChange === true ? "#00ff88" : "#111", color: sameOnChange === true ? "#001a0d" : "#555", border: `1px solid ${sameOnChange === true ? "#00ff88" : "#1a1a1a"}` }}
            onClick={() => setSameOnChange(true)}>
            <span>Keep {selectedFreq.short} — same schedule</span>
            {sameOnChange === true && <span>◈</span>}
          </button>
          <button style={{ ...btnSecondary, border: `1px solid ${sameOnChange === false ? "#00ff88" : "#1a1a1a"}`, color: sameOnChange === false ? "#00ff88" : "#555", background: sameOnChange === false ? "#001a0d" : "transparent" }}
            onClick={() => setSameOnChange(false)}>
            <span>Ask me again on change</span>
            {sameOnChange === false && <span>◈</span>}
          </button>
        </div>
        {sameOnChange !== null && (
          <button style={{ ...btnPrimary, marginTop: "16px" }} onClick={() => {
            onSave({
              enabled: true,
              frequency: selectedFreq.cron,
              frequencyLabel: selectedFreq.label,
              sameOnChange: sameOnChange!,
              watchlist: initialSymbols,
            });
          }}><span>Save &amp; Finish</span><span>→</span></button>
        )}
      </div>
    </div>
  );
};

// API key is now stored encrypted in Supabase via /api/user/settings
// These are kept only as a no-op fallback shape so callers don't break during migration
function saveKey(_raw: string) {}
function clearKey() {}

const ApiKeyModal = ({ onSave, onSkip, savedKey }: { onSave: (key: string) => void; onSkip: () => void; savedKey?: string }) => {
  const [step, setStep] = useState<"choose" | "enter">("choose");
  const [val, setVal] = useState(savedKey ?? "");
  const [remember, setRemember] = useState(true);
  const hasSaved = !!(savedKey);
  const valid = val.startsWith("sk-");

  const handleUseKey = () => {
    if (!valid) return;
    // remember flag — callers handle DB persistence; clear local stub if unchecked
    if (!remember) clearKey();
    onSave(val);
  };

  const modalStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, fontFamily: "'Space Mono', monospace", padding: "16px" };
  const boxStyle: React.CSSProperties = { width: "100%", maxWidth: "480px", border: "1px solid #1a1a1a", background: "#080808", padding: "28px" };
  const labelStyle: React.CSSProperties = { fontSize: "0.65rem", color: "#00ff88", letterSpacing: "3px", marginBottom: "6px" };
  const titleStyle: React.CSSProperties = { fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "3px", color: "#fff", marginBottom: "16px" };

  if (step === "choose") {
    return (
      <div style={modalStyle}>
        <div style={boxStyle}>
          <div style={labelStyle}>◈ ANALYSIS MODE</div>
          <div style={titleStyle}>HOW TO ANALYZE?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button onClick={() => setStep("enter")}
              style={{ background: "#00ff88", color: "#001a0d", border: "none", padding: "16px", fontFamily: "'Space Mono', monospace", fontWeight: "700", fontSize: "0.82rem", letterSpacing: "1px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Claude AI {hasSaved ? "— key saved ◈" : ""}</span>
              <span>→</span>
            </button>
            <div style={{ fontSize: "0.68rem", color: "#333", paddingLeft: "4px", lineHeight: 1.6 }}>Claude Sonnet · Uses your Anthropic API key · More accurate signals</div>
            <button onClick={onSkip}
              style={{ background: "transparent", color: "#555", border: "1px solid #1a1a1a", padding: "16px", fontFamily: "'Space Mono', monospace", fontWeight: "700", fontSize: "0.82rem", letterSpacing: "1px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
              <span>Rule-based</span>
              <span>→</span>
            </button>
            <div style={{ fontSize: "0.68rem", color: "#333", paddingLeft: "4px", lineHeight: 1.6 }}>RSI · MACD · Bollinger Bands · No API key needed</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={modalStyle}>
      <div style={boxStyle}>
        <button onClick={() => setStep("choose")} style={{ background: "transparent", border: "none", color: "#444", fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", cursor: "pointer", padding: "0 0 16px 0", letterSpacing: "1px" }}>← Back</button>
        <div style={labelStyle}>◈ ANTHROPIC API KEY</div>
        <div style={titleStyle}>CLAUDE AI</div>
        <div style={{ display: "flex", border: "1px solid #1c1c1c", background: "#050505", marginBottom: "10px", overflow: "hidden" }}>
          <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && valid && handleUseKey()}
            placeholder="sk-ant-api03-..." type="password"
            style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontFamily: "'Space Mono', monospace", fontSize: "0.8rem", padding: "12px 16px", outline: "none", minWidth: 0 }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", cursor: "pointer" }}>
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
            style={{ accentColor: "#00ff88", width: "14px", height: "14px", cursor: "pointer" }} />
          <span style={{ fontSize: "0.68rem", color: "#444", fontFamily: "'Space Mono', monospace" }}>Save key on this device</span>
        </label>
        <button onClick={handleUseKey} disabled={!valid}
          style={{ width: "100%", background: valid ? "#00ff88" : "#111", color: valid ? "#001a0d" : "#333", border: "none", padding: "13px", fontFamily: "'Space Mono', monospace", fontWeight: "700", fontSize: "0.78rem", letterSpacing: "1px", cursor: valid ? "pointer" : "not-allowed" }}>
          USE CLAUDE AI →
        </button>
        <p style={{ fontSize: "0.62rem", color: "#222", marginTop: "12px", textAlign: "center", lineHeight: 1.6 }}>console.anthropic.com · Stored locally, never sent to our servers</p>
      </div>
    </div>
  );
};

const AnalyzeButton = ({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled: boolean }) => (
  <button onClick={onClick} disabled={loading || disabled}
    style={{ width: "100%", background: loading ? "#111" : "#00ff88", color: loading ? "#555" : "#001a0d", border: `1px solid ${loading ? "#1a1a1a" : "#00ff88"}`, padding: "14px", fontFamily: "'Space Mono', monospace", fontWeight: "700", fontSize: "0.82rem", letterSpacing: "1px", cursor: loading || disabled ? "not-allowed" : "pointer", boxShadow: loading || disabled ? "none" : "0 0 30px rgba(0,255,136,0.2)", transition: "all 0.2s", animation: !loading && !disabled ? "pulse 3s infinite" : "none" }}>
    {loading ? "Analyzing..." : "▶ Analyze Signals"}
  </button>
);

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [symbols, setSymbols] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [analysis, setAnalysis] = useState<(AnalysisResult & { usedAI?: boolean }) | null>(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisStage, setAnalysisStage] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyDecided, setKeyDecided] = useState(false);
  const [moversOpen, setMoversOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"market" | "analysis">("market");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sent" | "error">("idle");
  const [pendingEmailDigest, setPendingEmailDigest] = useState(false);
  const [digestPrefs, setDigestPrefs] = useState<DigestPrefs | null>(() => loadDigestPrefs());
  const [showDigestSetup, setShowDigestSetup] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);
  const prevWatchlistRef = useRef<string[]>([]);
  const watchlistSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect unauthenticated users after auth finishes loading
  useEffect(() => {
    if (!authLoading && !user) router.replace("/landing");
  }, [authLoading, user, router]);

  // Load watchlist + settings from DB on sign-in
  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/user/watchlist").then(r => r.json()),
      fetch("/api/user/settings").then(r => r.json()),
    ]).then(([watchlistData, settingsData]) => {
      if (Array.isArray(watchlistData.symbols) && watchlistData.symbols.length > 0) {
        setSymbols(watchlistData.symbols);
      } else {
        setSymbols(DEFAULT_WATCHLIST);
      }
      if (settingsData.anthropicKey) {
        setApiKey(settingsData.anthropicKey);
        setKeyDecided(true);
      }
      setDbLoaded(true);
    }).catch(() => {
      setSymbols(DEFAULT_WATCHLIST);
      setDbLoaded(true);
    });
  }, [user]);

  // Debounced watchlist sync to DB
  const syncWatchlist = useCallback((syms: string[]) => {
    if (!user) return;
    if (watchlistSyncRef.current) clearTimeout(watchlistSyncRef.current);
    watchlistSyncRef.current = setTimeout(() => {
      fetch("/api/user/watchlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: syms }),
      }).catch(() => {});
    }, 800);
  }, [user]);

  const fetchQuotes = useCallback(async () => {
    if (symbols.length === 0) { setQuotes([]); return; }
    setLoadingQuotes(true);
    setError(null);
    try {
      const res = await fetch(`/api/market?symbols=${symbols.join(",")}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuotes(data.quotes);
      setLastUpdated(data.lastUpdated);

      // Auto-correct symbols (e.g. XEQT → XEQT.TO)
      const resolved: Record<string, string> = data.resolved ?? {};
      if (Object.keys(resolved).length > 0) {
        setSymbols(prev => {
          const updated = prev.map(s => resolved[s] ?? s);
          syncWatchlist(updated);
          return updated;
        });
      }

      const returned = new Set((data.quotes as Quote[]).map(q => q.symbol));
      const failed = symbols.filter(s => !returned.has(s) && !resolved[s]);
      if (failed.length > 0) {
        setError(`Could not load: ${failed.join(", ")} — ticker not found on Yahoo Finance`);
      }
      if (!selectedSymbol && data.quotes.length > 0) setSelectedSymbol(data.quotes[0].symbol);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch quotes");
    } finally {
      setLoadingQuotes(false);
    }
  }, [symbols, selectedSymbol]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  // Detect watchlist change and re-prompt if user opted in to "ask me again"
  useEffect(() => {
    const prev = prevWatchlistRef.current;
    if (prev.length === 0) { prevWatchlistRef.current = symbols; return; }
    const changed = symbols.join(",") !== prev.join(",");
    if (changed) {
      prevWatchlistRef.current = symbols;
      const prefs = loadDigestPrefs();
      if (prefs && prefs.enabled && !prefs.sameOnChange) {
        setShowDigestSetup(true);
      }
    }
  }, [symbols]);

  const runAnalysis = async (key: string) => {
    setLoadingAnalysis(true);
    setShowKeyModal(false);
    setError(null);
    const stages = key
      ? ["Fetching history", "Computing indicators", "Sending to Claude", "Parsing response"]
      : ["Fetching history", "Computing RSI & MACD", "Scoring Bollinger Bands", "Building signals"];
    let si = 0;
    setAnalysisStage(stages[0]);
    const interval = setInterval(() => { si = (si + 1) % stages.length; setAnalysisStage(stages[si]); }, 2000);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (key) headers["x-anthropic-key"] = key;
      const res = await fetch("/api/market-data", { method: "POST", headers, body: JSON.stringify({ symbols }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data);
      setMobileView("analysis");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      clearInterval(interval);
      setLoadingAnalysis(false);
      setAnalysisStage("");
    }
  };

  const sendEmailDigest = async (key?: string) => {
    const resolvedKey = key ?? apiKey.trim();
    setSendingEmail(true);
    setEmailStatus("idle");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (resolvedKey) headers["x-anthropic-key"] = resolvedKey;
      const res = await fetch("/api/email-digest", { method: "POST", headers, body: JSON.stringify({ symbols }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setEmailStatus("sent");
      setTimeout(() => setEmailStatus("idle"), 4000);
    } catch (e) {
      setEmailStatus("error");
      setError(e instanceof Error ? e.message : "Failed to send email");
      setTimeout(() => setEmailStatus("idle"), 4000);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleEmailDigestClick = () => {
    if (!keyDecided) {
      // Reuse the modal — save/skip callbacks feed into sendEmailDigest instead of runAnalysis
      setShowKeyModal(true);
      setPendingEmailDigest(true);
    } else {
      sendEmailDigest();
    }
  };

  const handleDigestSave = async (prefs: DigestPrefs) => {
    saveDigestPrefs(prefs);
    setDigestPrefs(prefs);
    setShowDigestSetup(false);
    // Register the job with email-service
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey.trim()) headers["x-anthropic-key"] = apiKey.trim();
      await fetch("/api/email-digest/schedule", {
        method: "POST",
        headers,
        body: JSON.stringify({ cronExpression: prefs.frequency, symbols: prefs.watchlist }),
      });
    } catch (e) {
      console.error("Failed to schedule digest:", e);
    }
  };

  const persistSettings = useCallback((key: string, mode: string) => {
    if (!user) return;
    fetch("/api/user/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anthropicKey: key, analysisMode: mode }),
    }).catch(() => {});
  }, [user]);

  const onModalSave = (key: string) => {
    setApiKey(key); setKeyDecided(true); setShowKeyModal(false);
    persistSettings(key, "claude");
    if (pendingEmailDigest) { setPendingEmailDigest(false); sendEmailDigest(key); }
    else runAnalysis(key);
  };
  const onModalSkip = () => {
    setApiKey(""); setKeyDecided(true); setShowKeyModal(false);
    persistSettings("", "rule-based");
    if (pendingEmailDigest) { setPendingEmailDigest(false); sendEmailDigest(""); }
    else runAnalysis("");
  };
  const handleBtnClick = () => { if (!keyDecided) setShowKeyModal(true); else runAnalysis(apiKey.trim()); };

  const gainers = [...quotes].filter(q => q.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 3);
  const losers  = [...quotes].filter(q => q.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 3);

  if (authLoading || !user || !dbLoaded) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050505" }}>
        <div style={{ width: "32px", height: "32px", border: "2px solid #111", borderTop: "2px solid #00ff88", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.8} }
        input { outline: none !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; }

        .app-root {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #050505;
          color: #eee;
          font-family: 'Space Mono', monospace;
          background-image: radial-gradient(ellipse at 10% 0%,#001a0d 0%,transparent 40%),
                            radial-gradient(ellipse at 90% 100%,#0a0a1a 0%,transparent 40%);
          overflow: hidden;
        }

        .app-root > header { flex-shrink: 0; }
        .app-root > footer { flex-shrink: 0; }

        .header-inner {
          max-width: 1280px; margin: 0 auto; padding: 16px 20px;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .header-left  { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; overflow: hidden; }
        .header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .header-sub   { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .header-tag   { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .main-inner {
          max-width: 1280px; margin: 0 auto; padding: 24px 20px; width: 100%;
          flex: 1; overflow-y: auto; overflow-x: clip;
        }
        .main-scroll-wrapper { flex: 1; overflow-y: auto; overflow-x: clip; }

        .layout { display: grid; grid-template-columns: 300px 1fr; gap: 24px; align-items: start; }
        .sidebar { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 0; max-height: calc(100vh - 120px); overflow-y: auto; }

        .quote-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1px; background: #111; align-items: stretch;
        }
        .suggestion-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .movers-toggle { display: none; }
        .mobile-analyze { display: none; }
        .mobile-watchlist-wrapper { display: none !important; }

        @media (max-width: 768px) {
          .header-sub { display: none; }
          .header-tag { display: none; }
          .header-inner { padding: 14px 16px; }
          .main-inner { padding: 12px; }

          .layout { grid-template-columns: 1fr; }
          .layout > aside { display: none; }

          .quote-grid { grid-template-columns: repeat(2, 1fr); }
          .suggestion-grid { grid-template-columns: 1fr; }
          .main-scroll-wrapper { overflow-x: clip; }

          .movers-toggle { display: block; }
          .mobile-analyze { display: block; margin-top: 4px; }
          .mobile-watchlist-wrapper { display: block !important; }
        }

        @media (max-width: 400px) {
          .quote-grid { grid-template-columns: 1fr; }
          .main-inner { padding: 8px; }
        }
      `}</style>

      {showKeyModal && <ApiKeyModal onSave={onModalSave} onSkip={onModalSkip} savedKey={apiKey} />}
      {showDigestSetup && !showKeyModal && (
        <DigestSetupModal
          initialSymbols={symbols}
          onSave={handleDigestSave}
          onSkip={() => { clearDigestPrefs(); setDigestPrefs(null); setShowDigestSetup(false); }}
        />
      )}

      {/* ── Header ── */}
      <header style={{ borderBottom: "1px solid #111" }}>
        <div className="header-inner">
          <div className="header-left">
            <div>
              <div className="header-sub" style={{ fontSize: "0.65rem", color: "#00ff88", letterSpacing: "2px", marginBottom: "4px" }}>◈ Technical Analysis · Real-time Data</div>
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(1.6rem,5vw,3rem)", margin: 0, lineHeight: 1, letterSpacing: "4px", background: "linear-gradient(135deg,#fff 0%,#555 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                MARKET<span style={{ WebkitTextFillColor: "#00ff88" }}> ANALYTICS</span>
              </h1>
              <p className="header-tag" style={{ color: "#444", fontSize: "0.7rem", marginTop: "6px", letterSpacing: "1px" }}>RSI · MACD · Bollinger Bands · Moving Averages</p>
            </div>
          </div>
          <div className="header-right">
            {/* User avatar + sign out */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {user.user_metadata?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.user_metadata.avatar_url} alt="avatar"
                  style={{ width: "26px", height: "26px", borderRadius: "50%", border: "1px solid #1a1a1a" }} />
              ) : (
                <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#001a0d", border: "1px solid #00ff8830", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "#00ff88" }}>
                  {(user.email ?? "?")[0].toUpperCase()}
                </div>
              )}
              <button onClick={signOut}
                style={{ fontSize: "0.62rem", color: "#333", background: "transparent", border: "1px solid #1a1a1a", padding: "5px 9px", fontFamily: "'Space Mono', monospace", letterSpacing: "1px", cursor: "pointer" }}>
                sign out
              </button>
            </div>
            {keyDecided && (
              <button onClick={() => { setKeyDecided(false); setApiKey(""); clearKey(); persistSettings("", "rule-based"); }}
                style={{ fontSize: "0.65rem", color: apiKey.trim() ? "#1f4a2e" : "#333", background: "transparent", border: `1px solid ${apiKey.trim() ? "#0a2a14" : "#1a1a1a"}`, padding: "6px 10px", fontFamily: "'Space Mono', monospace", letterSpacing: "1px", cursor: "pointer", whiteSpace: "nowrap" }}>
                {apiKey.trim() ? "◈ Claude AI" : "◈ Rule-based"}
              </button>
            )}
            {lastUpdated && (
              <span style={{ fontSize: "0.72rem", color: "#444", whiteSpace: "nowrap" }}>
                {new Date(lastUpdated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button onClick={fetchQuotes} disabled={loadingQuotes}
              style={{ background: "transparent", border: "1px solid #1c1c1c", color: loadingQuotes ? "#333" : "#666", padding: "7px 14px", fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", cursor: loadingQuotes ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
              {loadingQuotes ? "..." : "↻"}
            </button>
          </div>
        </div>
      </header>

      <div className="main-scroll-wrapper">
      <main className="main-inner">
        {error && (
          <div style={{ border: "1px solid #ff444433", background: "#ff44440a", padding: "14px 18px", color: "#ff4444", fontSize: "0.78rem", marginBottom: "20px" }}>⚠ {error}</div>
        )}

        <div className="layout">
          {/* ── Desktop sidebar ── */}
          <aside className="sidebar">
            <WatchlistInput symbols={symbols} onChange={s => { setSymbols(s); syncWatchlist(s); setAnalysis(null); setMobileView("market"); if (s.length === 0) setSelectedSymbol(""); }} onSchedule={() => setShowDigestSetup(true)} scheduleLabel={digestPrefs?.enabled ? digestPrefs.frequencyLabel : undefined} />
            {quotes.length > 0 && (
              <div style={{ border: "1px solid #1a1a1a", background: "#080808", padding: "16px" }}>
                <div style={{ fontSize: "0.72rem", color: "#555", letterSpacing: "1px", marginBottom: "12px" }}>◈ Top Movers</div>
                {gainers.map(q => (
                  <div key={q.symbol} onClick={() => setSelectedSymbol(q.symbol)} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #0d0d0d", cursor: "pointer" }}>
                    <span style={{ fontSize: "0.8rem", color: "#999" }}>{q.symbol}</span>
                    <span style={{ fontSize: "0.8rem", color: "#00ff88" }}>+{q.changePercent.toFixed(2)}%</span>
                  </div>
                ))}
                {losers.map(q => (
                  <div key={q.symbol} onClick={() => setSelectedSymbol(q.symbol)} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #0d0d0d", cursor: "pointer" }}>
                    <span style={{ fontSize: "0.8rem", color: "#999" }}>{q.symbol}</span>
                    <span style={{ fontSize: "0.8rem", color: "#ff4444" }}>{q.changePercent.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            )}
            <AnalyzeButton onClick={handleBtnClick} loading={loadingAnalysis} disabled={quotes.length === 0} />
            <button onClick={handleEmailDigestClick} disabled={sendingEmail || quotes.length === 0}
              style={{ width: "100%", background: sendingEmail ? "#111" : emailStatus === "sent" ? "#001a0d" : emailStatus === "error" ? "#1a0000" : "transparent", color: sendingEmail ? "#555" : emailStatus === "sent" ? "#00ff88" : emailStatus === "error" ? "#ff4444" : "#444", border: `1px solid ${emailStatus === "sent" ? "#00ff8840" : emailStatus === "error" ? "#ff444440" : "#1a1a1a"}`, padding: "12px", fontFamily: "'Space Mono', monospace", fontWeight: "700", fontSize: "0.75rem", letterSpacing: "1px", cursor: sendingEmail || quotes.length === 0 ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
              {sendingEmail ? "Sending..." : emailStatus === "sent" ? "✓ Email Sent" : emailStatus === "error" ? "✗ Send Failed" : "✉ Email Digest"}
            </button>
          </aside>

          {/* ── Main content ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0, overflow: "hidden" }}>

            {/* Mobile: watchlist + analyze button at top */}
            <div style={{ display: "none" }} className="mobile-watchlist-wrapper">
              <WatchlistInput symbols={symbols} onChange={s => { setSymbols(s); syncWatchlist(s); setAnalysis(null); setMobileView("market"); if (s.length === 0) setSelectedSymbol(""); }} onSchedule={() => setShowDigestSetup(true)} scheduleLabel={digestPrefs?.enabled ? digestPrefs.frequencyLabel : undefined} />
            </div>
            <div className="mobile-analyze">
              <AnalyzeButton onClick={handleBtnClick} loading={loadingAnalysis} disabled={quotes.length === 0} />
            </div>

            {/* Toggle button — shown whenever analysis is available */}
            {analysis && !loadingAnalysis && (
              <button onClick={() => setMobileView(v => v === "analysis" ? "market" : "analysis")}
                style={{ width: "100%", background: "transparent", border: "1px solid #1a1a1a", color: "#555", padding: "10px 16px", fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", letterSpacing: "1px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{mobileView === "analysis" ? "← Market Data" : "→ Analysis Results"}</span>
                <span style={{ color: "#00ff88", fontSize: "0.60rem" }}>◈</span>
              </button>
            )}

            {/* Market data — hidden when viewing analysis */}
            <div style={{ display: mobileView === "analysis" && !!analysis ? "none" : "block" }}>
              {/* Quote grid */}
              {symbols.length === 0 ? (
                <div style={{ border: "1px solid #0d0d0d", background: "#070707", padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", color: "#1a1a1a", letterSpacing: "3px", marginBottom: "8px" }}>No tickers added</div>
                  <div style={{ fontSize: "0.72rem", color: "#111" }}>Add stocks or ETFs using the watchlist on the left</div>
                </div>
              ) : loadingQuotes && quotes.length === 0 ? (
                <Spinner text="Fetching market data" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div className="quote-grid">
                    {quotes.map(quote => (
                      <QuoteCard key={quote.symbol} quote={quote}
                        selected={selectedSymbol === quote.symbol}
                        onClick={() => setSelectedSymbol(quote.symbol)}
                        inWatchlist={symbols.includes(quote.symbol)}
                        onAddToWatchlist={sym => setSymbols(prev => prev.includes(sym) ? prev : [...prev, sym])}
                      />
                    ))}
                  </div>

                  {/* Mobile: top movers collapsible */}
                  {quotes.length > 0 && (
                    <div className="movers-toggle">
                      <button onClick={() => setMoversOpen(o => !o)}
                        style={{ width: "100%", background: "transparent", border: "1px solid #1a1a1a", color: "#555", padding: "10px 16px", fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", letterSpacing: "1px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>◈ Top Movers</span>
                        <span>{moversOpen ? "▲" : "▼"}</span>
                      </button>
                      {moversOpen && (
                        <div style={{ border: "1px solid #1a1a1a", borderTop: "none", background: "#080808", padding: "12px 16px" }}>
                          {[...gainers, ...losers].map(q => (
                            <div key={q.symbol} onClick={() => { setSelectedSymbol(q.symbol); setMoversOpen(false); }}
                              style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #0d0d0d", cursor: "pointer" }}>
                              <span style={{ fontSize: "0.8rem", color: "#999" }}>{q.symbol}</span>
                              <span style={{ fontSize: "0.8rem", color: q.changePercent > 0 ? "#00ff88" : "#ff4444" }}>
                                {q.changePercent > 0 ? "+" : ""}{q.changePercent.toFixed(2)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price chart */}
                  {selectedSymbol && <PriceChart symbol={selectedSymbol} />}
                </div>
              )}
            </div>

            {/* Analysis spinner */}
            {loadingAnalysis && <Spinner text={analysisStage} />}

            {/* Analysis results — hidden when viewing market data */}
            {analysis && !loadingAnalysis && mobileView === "analysis" && (
              <div style={{ animation: "fadeIn 0.5s ease" }}>
                <div style={{ border: "1px solid #00ff8820", background: "#001a0d", padding: "20px", marginBottom: "16px", borderLeft: "3px solid #00ff88" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "0.72rem", color: "#00ff8877", letterSpacing: "1px" }}>◈ Market Outlook</div>
                    <div style={{ fontSize: "0.62rem", padding: "2px 8px", border: `1px solid ${analysis.usedAI ? "#00ff8830" : "#1a1a1a"}`, color: analysis.usedAI ? "#00ff8899" : "#333" }}>
                      {analysis.usedAI ? "Claude AI" : "Rule-based"}
                    </div>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "#ccc", lineHeight: 1.8, margin: 0 }}>{analysis.marketOutlook}</p>
                  <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
                    <div style={{ fontSize: "0.65rem", color: "#1f4a2e" }}>
                      Computed {new Date(analysis.generatedAt).toLocaleString()}
                    </div>
                    {analysis.usage && (
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.65rem", color: "#1a3a2a" }}>↑ {analysis.usage.inputTokens.toLocaleString()} in</span>
                        <span style={{ fontSize: "0.65rem", color: "#1a3a2a" }}>↓ {analysis.usage.outputTokens.toLocaleString()} out</span>
                        <span style={{ fontSize: "0.65rem", color: "#00ff8844", fontWeight: "700" }}>${analysis.usage.costUsd.toFixed(4)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: "0.72rem", color: "#555", letterSpacing: "1px", marginBottom: "12px" }}>◈ Where to add money</div>
                <div className="suggestion-grid">
                  {analysis.suggestions.map(s => <SuggestionCard key={s.symbol} suggestion={s} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      </div>

      <footer style={{ borderTop: "1px solid #0d0d0d", padding: "12px 20px", flexShrink: 0 }}>
        <p style={{ textAlign: "center", fontSize: "0.62rem", color: "#1a1a1a", letterSpacing: "1px", margin: 0 }}>
          Not financial advice · Data from Yahoo Finance
        </p>
      </footer>
    </div>
  );
}
