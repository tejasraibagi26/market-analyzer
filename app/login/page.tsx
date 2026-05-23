"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/app");
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); }
      else router.replace("/app");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) { setError(error.message); setLoading(false); }
      else { setMessage("Check your email to confirm your account."); setLoading(false); }
    }
  };

  const mono = "'Space Mono', monospace";
  const bebas = "'Bebas Neue', sans-serif";

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", background: "#0d0d0d",
    border: "1px solid #1a1a1a", color: "#ccc", fontFamily: mono,
    fontSize: "0.78rem", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#050505", fontFamily: mono, padding: "16px",
      backgroundImage: "radial-gradient(ellipse at 10% 0%,#001a0d 0%,transparent 40%), radial-gradient(ellipse at 90% 100%,#0a0a1a 0%,transparent 40%)",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&display=swap'); input::placeholder { color: #333; }`}</style>

      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "0.65rem", color: "#00ff88", letterSpacing: "3px", marginBottom: "8px" }}>◈ Technical Analysis · Real-time Data</div>
          <h1 style={{ fontFamily: bebas, fontSize: "2.6rem", letterSpacing: "4px", margin: 0, background: "linear-gradient(135deg,#fff 0%,#555 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            MARKET<span style={{ WebkitTextFillColor: "#00ff88" }}> ANALYTICS</span>
          </h1>
        </div>

        {/* Card */}
        <div style={{ border: "1px solid #1a1a1a", background: "#080808", padding: "32px" }}>
          <div style={{ fontSize: "0.62rem", color: "#00ff88", letterSpacing: "3px", marginBottom: "6px" }}>
            ◈ {mode === "signin" ? "SIGN IN" : "REGISTER"}
          </div>
          <div style={{ fontFamily: bebas, fontSize: "1.8rem", letterSpacing: "3px", color: "#fff", marginBottom: "8px" }}>
            {mode === "signin" ? "WELCOME BACK" : "CREATE ACCOUNT"}
          </div>
          <p style={{ fontSize: "0.72rem", color: "#444", lineHeight: 1.7, marginBottom: "28px" }}>
            {mode === "signin"
              ? "Sign in to save your watchlist and settings across devices."
              : "Register to save your watchlist and settings across devices."}
          </p>

          {error && (
            <div style={{ border: "1px solid #ff444433", background: "#ff44440a", padding: "10px 14px", color: "#ff4444", fontSize: "0.72rem", marginBottom: "16px" }}>
              ⚠ {error}
            </div>
          )}

          {message && (
            <div style={{ border: "1px solid #00ff8833", background: "#00ff880a", padding: "10px 14px", color: "#00ff88", fontSize: "0.72rem", marginBottom: "16px" }}>
              ✓ {message}
            </div>
          )}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "14px 16px",
                background: loading ? "#111" : "#00ff88",
                color: loading ? "#555" : "#001a0d",
                border: "none", fontFamily: mono, fontWeight: "700",
                fontSize: "0.78rem", letterSpacing: "1px",
                cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s",
              }}
            >
              <span>{loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}</span>
              <span>→</span>
            </button>
          </form>

          <p style={{ fontSize: "0.65rem", color: "#333", marginTop: "20px", textAlign: "center" }}>
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}
              style={{ background: "none", border: "none", color: "#00ff88", fontFamily: mono, fontSize: "0.65rem", cursor: "pointer", padding: 0 }}
            >
              {mode === "signin" ? "Register" : "Sign in"}
            </button>
          </p>

          <p style={{ fontSize: "0.60rem", color: "#222", marginTop: "12px", textAlign: "center", lineHeight: 1.6 }}>
            Your watchlist and API key are encrypted and stored securely.
          </p>
        </div>
      </div>
    </div>
  );
}
