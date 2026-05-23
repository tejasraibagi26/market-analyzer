"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const mono = "'Space Mono', monospace";
const bebas = "'Bebas Neue', sans-serif";

const DIGEST_PREFS_KEY = "ma_digest";

interface DigestPrefs {
  enabled: boolean;
  frequency: string;
  frequencyLabel: string;
  timezone?: string;
  sameOnChange: boolean;
  watchlist: string[];
}

function loadDigestPrefs(): DigestPrefs | null {
  try { const v = localStorage.getItem(DIGEST_PREFS_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}
function clearDigestPrefs() {
  try { localStorage.removeItem(DIGEST_PREFS_KEY); } catch {}
}

export default function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [apiKey, setApiKey] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"rule-based" | "ai">("rule-based");
  const [digestPrefs, setDigestPrefs] = useState<DigestPrefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/user/settings").then(r => r.json()).then(data => {
      if (data.anthropicKey) setApiKey(data.anthropicKey);
      if (data.analysisMode) setAnalysisMode(data.analysisMode);
      setSettingsLoaded(true);
    }).catch(() => setSettingsLoaded(true));
    setDigestPrefs(loadDigestPrefs());
  }, [user]);

  const saveSettings = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropicKey: apiKey, analysisMode }),
      });
      if (!res.ok) throw new Error();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const clearSchedule = () => {
    clearDigestPrefs();
    setDigestPrefs(null);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", background: "#0d0d0d",
    border: "1px solid #1a1a1a", color: "#ccc", fontFamily: mono,
    fontSize: "0.78rem", outline: "none", boxSizing: "border-box", letterSpacing: "0.5px",
  };
  const labelStyle: React.CSSProperties = { fontSize: "0.60rem", color: "#333", letterSpacing: "2px", marginBottom: "8px", display: "block" };
  const sectionLabel: React.CSSProperties = { fontSize: "0.60rem", color: "#00ff88", letterSpacing: "3px", marginBottom: "6px" };
  const sectionTitle: React.CSSProperties = { fontFamily: bebas, fontSize: "1.3rem", letterSpacing: "3px", color: "#fff", marginBottom: "20px" };
  const divider: React.CSSProperties = { borderTop: "1px solid #0e0e0e", margin: "32px 0" };

  if (authLoading || !user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#eee", fontFamily: mono }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&display=swap'); *, *::before, *::after { box-sizing: border-box; }`}</style>

      {/* Header */}
      <header style={{ borderBottom: "1px solid #0e0e0e" }}>
        <div style={{ maxWidth: "75vw", margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button onClick={() => router.push("/app")}
              style={{ background: "transparent", border: "none", color: "#333", fontFamily: mono, fontSize: "0.72rem", cursor: "pointer", letterSpacing: "1px", padding: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#555"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#333"; }}>
              ← back
            </button>
            <div>
              <div style={{ fontSize: "0.60rem", color: "#00ff8866", letterSpacing: "3px", marginBottom: "3px" }}>MARKET ANALYTICS</div>
              <h1 style={{ fontFamily: bebas, fontSize: "1.6rem", margin: 0, lineHeight: 1, letterSpacing: "4px", color: "#fff" }}>SETTINGS</h1>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {user.user_metadata?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.user_metadata.avatar_url} alt="avatar"
                style={{ width: "24px", height: "24px", borderRadius: "50%", border: "1px solid #1a1a1a" }} />
            ) : (
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#001a0d", border: "1px solid #00ff8820", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "#00ff88" }}>
                {(user.email ?? "?")[0].toUpperCase()}
              </div>
            )}
            <button onClick={signOut}
              style={{ fontSize: "0.6rem", color: "#282828", background: "transparent", border: "none", padding: "4px 0", fontFamily: mono, letterSpacing: "1px", cursor: "pointer" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#555"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#282828"; }}>
              sign out
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "75vw", margin: "0 auto", padding: "32px 24px" }}>

        {/* Account */}
        <section>
          <div style={sectionLabel}>◈ ACCOUNT</div>
          <div style={sectionTitle}>YOUR PROFILE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={labelStyle}>EMAIL</span>
            <div style={{ ...inputStyle, color: "#333", cursor: "default", border: "1px solid #111" }}>{user.email}</div>
          </div>
        </section>

        <div style={divider} />

        {/* AI / API key */}
        <section>
          <div style={sectionLabel}>◈ AI ANALYSIS</div>
          <div style={sectionTitle}>CLAUDE API KEY</div>
          <p style={{ fontSize: "0.75rem", color: "#333", lineHeight: 1.8, marginBottom: "20px" }}>
            Add your Anthropic API key to enable Claude-powered market analysis. Stored encrypted.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <span style={labelStyle}>ANTHROPIC API KEY</span>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                style={inputStyle}
                autoComplete="off"
              />
            </div>
            <div>
              <span style={labelStyle}>ANALYSIS MODE</span>
              <div style={{ display: "flex", gap: "8px" }}>
                {(["rule-based", "ai"] as const).map(m => (
                  <button key={m} onClick={() => setAnalysisMode(m)}
                    style={{ flex: 1, padding: "10px 14px", background: analysisMode === m ? "#001a0d" : "transparent", border: `1px solid ${analysisMode === m ? "#00ff88" : "#1a1a1a"}`, color: analysisMode === m ? "#00ff88" : "#444", fontFamily: mono, fontSize: "0.72rem", letterSpacing: "1px", cursor: "pointer" }}>
                    {m === "rule-based" ? "Rule-based" : "Claude AI"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div style={divider} />

        {/* Email digest */}
        <section>
          <div style={sectionLabel}>◈ EMAIL DIGEST</div>
          <div style={sectionTitle}>SCHEDULED REPORTS</div>
          {digestPrefs?.enabled ? (
            <div style={{ border: "1px solid #0e0e0e", background: "#080808", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: "0.60rem", color: "#00ff88", letterSpacing: "2px" }}>◈ ACTIVE</div>
                  <div style={{ fontSize: "0.82rem", color: "#ccc" }}>{digestPrefs.frequencyLabel}</div>
                  <div style={{ fontSize: "0.65rem", color: "#333" }}>{digestPrefs.frequency}</div>
                  {digestPrefs.watchlist?.length > 0 && (
                    <div style={{ fontSize: "0.65rem", color: "#333" }}>
                      {digestPrefs.watchlist.join(", ")}
                    </div>
                  )}
                </div>
                <button onClick={clearSchedule}
                  style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#444", fontFamily: mono, fontSize: "0.65rem", letterSpacing: "1px", padding: "6px 12px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#ff444433"; (e.currentTarget as HTMLElement).style.color = "#ff4444"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a"; (e.currentTarget as HTMLElement).style.color = "#444"; }}>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div style={{ border: "1px solid #0e0e0e", background: "#080808", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <p style={{ fontSize: "0.75rem", color: "#333", lineHeight: 1.7, margin: 0 }}>
                No schedule set. Configure one from the dashboard.
              </p>
              <button onClick={() => router.push("/app")}
                style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#444", fontFamily: mono, fontSize: "0.65rem", letterSpacing: "1px", padding: "6px 12px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                Go to dashboard →
              </button>
            </div>
          )}
        </section>

        <div style={divider} />

        {/* Save */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={saveSettings}
            disabled={saving || !settingsLoaded}
            style={{ background: saving ? "#111" : "#00ff88", color: saving ? "#555" : "#001a0d", border: "none", padding: "13px 28px", fontFamily: mono, fontWeight: "700", fontSize: "0.78rem", letterSpacing: "1px", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
            <span>{saving ? "Saving..." : "Save Changes"}</span>
            {!saving && <span>→</span>}
          </button>
          {saveStatus === "saved" && <span style={{ fontSize: "0.65rem", color: "#00ff88", letterSpacing: "1px" }}>✓ Saved</span>}
          {saveStatus === "error" && <span style={{ fontSize: "0.65rem", color: "#ff4444", letterSpacing: "1px" }}>✗ Failed to save</span>}
        </div>

      </main>
    </div>
  );
}
