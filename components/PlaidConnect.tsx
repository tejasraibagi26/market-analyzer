"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";

const mono = "'Space Mono', monospace";
const bebas = "'Bebas Neue', sans-serif";

interface PlaidItem {
  id: string;
  item_id: string;
  institution_name: string;
  created_at: string;
}

interface Props {
  onWatchlistImport?: (tickers: string[]) => void;
}

export default function PlaidConnect({ onWatchlistImport }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [importedTickers, setImportedTickers] = useState<string[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const res = await fetch("/api/plaid/items");
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openLink = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const data = await res.json();
      if (data.link_token) setLinkToken(data.link_token);
    } catch {
      setConnecting(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess: async (public_token, metadata) => {
      const institution_name = metadata.institution?.name ?? "Unknown";
      try {
        await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token, institution_name }),
        });
        await fetchItems();
      } finally {
        setLinkToken(null);
        setConnecting(false);
      }
    },
    onExit: () => {
      setLinkToken(null);
      setConnecting(false);
    },
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  const removeItem = async (item: PlaidItem) => {
    setRemovingId(item.item_id);
    try {
      await fetch("/api/plaid/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.item_id }),
      });
      setItems(prev => prev.filter(i => i.item_id !== item.item_id));
    } finally {
      setRemovingId(null);
    }
  };

  const importToWatchlist = async () => {
    setImportStatus("loading");
    try {
      const holdingsRes = await fetch("/api/plaid/holdings");
      const { tickers } = await holdingsRes.json();
      if (!tickers?.length) { setImportStatus("done"); return; }

      const wlRes = await fetch("/api/user/watchlist");
      const { items: existingItems } = await wlRes.json();
      const existingSymbols: string[] = (existingItems ?? []).map((i: { symbol: string }) => i.symbol);

      const toAdd = (tickers as string[]).filter(t => !existingSymbols.includes(t));
      if (toAdd.length > 0) {
        const merged = [
          ...existingItems,
          ...toAdd.map((symbol: string) => ({ symbol, addedAt: new Date().toISOString() })),
        ];
        await fetch("/api/user/watchlist", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: merged }),
        });
        setImportedTickers(toAdd);
        onWatchlistImport?.(toAdd);
      } else {
        setImportedTickers([]);
      }
      setImportStatus("done");
    } catch {
      setImportStatus("error");
    }
  };

  const labelStyle: React.CSSProperties = { fontSize: "0.60rem", color: "#333", letterSpacing: "2px", marginBottom: "8px", display: "block" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Connected accounts list */}
      {loadingItems ? (
        <div style={{ fontSize: "0.70rem", color: "#222", letterSpacing: "1px" }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ border: "1px solid #0e0e0e", background: "#080808", padding: "20px" }}>
          <p style={{ fontSize: "0.75rem", color: "#333", lineHeight: 1.7, margin: 0 }}>
            No brokerage accounts connected yet.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "#111" }}>
          {items.map(item => (
            <div key={item.id} style={{ background: "#080808", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "0.78rem", color: "#bbb", letterSpacing: "0.5px" }}>{item.institution_name}</div>
                <div style={{ fontSize: "0.60rem", color: "#222", letterSpacing: "1px", marginTop: "3px" }}>
                  Connected {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => removeItem(item)}
                disabled={removingId === item.item_id}
                style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#333", fontFamily: mono, fontSize: "0.62rem", letterSpacing: "1px", padding: "5px 10px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, opacity: removingId === item.item_id ? 0.5 : 1 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#ff444433"; (e.currentTarget as HTMLElement).style.color = "#ff4444"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a"; (e.currentTarget as HTMLElement).style.color = "#333"; }}>
                {removingId === item.item_id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
        <button
          onClick={openLink}
          disabled={connecting}
          style={{ background: "transparent", border: "1px solid #1a1a1a", color: connecting ? "#333" : "#ccc", fontFamily: mono, fontSize: "0.72rem", letterSpacing: "1px", padding: "10px 18px", cursor: connecting ? "not-allowed" : "pointer" }}
          onMouseEnter={e => { if (!connecting) (e.currentTarget as HTMLElement).style.borderColor = "#00ff8844"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1a1a1a"; }}>
          {connecting ? "Opening..." : "+ Connect Brokerage"}
        </button>

        {items.length > 0 && (
          <button
            onClick={importToWatchlist}
            disabled={importStatus === "loading"}
            style={{ background: importStatus === "loading" ? "#111" : "#001a0d", border: `1px solid ${importStatus === "loading" ? "#111" : "#00ff8833"}`, color: importStatus === "loading" ? "#333" : "#00ff88", fontFamily: mono, fontSize: "0.72rem", letterSpacing: "1px", padding: "10px 18px", cursor: importStatus === "loading" ? "not-allowed" : "pointer" }}>
            {importStatus === "loading" ? "Importing..." : "Import Holdings → Watchlist"}
          </button>
        )}
      </div>

      {/* Import feedback */}
      {importStatus === "done" && (
        <div style={{ fontSize: "0.68rem", color: "#00ff88", letterSpacing: "1px" }}>
          {importedTickers.length > 0
            ? `✓ Added ${importedTickers.length} ticker${importedTickers.length > 1 ? "s" : ""}: ${importedTickers.join(", ")}`
            : "✓ All holdings already in watchlist"}
        </div>
      )}
      {importStatus === "error" && (
        <div style={{ fontSize: "0.68rem", color: "#ff4444", letterSpacing: "1px" }}>✗ Import failed — try again</div>
      )}

      {/* Help note */}
      <div style={{ fontSize: "0.62rem", color: "#1a1a1a", lineHeight: 1.7 }}>
        <span style={labelStyle}>◈ HOW IT WORKS</span>
        Connect via Plaid to read your investment holdings. Market Analytics only reads equity/ETF tickers — we never see account numbers or initiate transactions.
      </div>
    </div>
  );
}
