import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { WatchlistItem } from "@/types/market";
import { fetchQuotes } from "@/lib/marketData";
import { sendAlertEmail } from "@/lib/emailService";
import { buildAlertEmailHtml, type AlertTrigger } from "@/lib/alertEmailTemplate";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

function coerceItems(raw: unknown): WatchlistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) =>
    typeof entry === "string"
      ? { symbol: entry, addedAt: new Date().toISOString() }
      : (entry as WatchlistItem)
  );
}

export async function POST(request: NextRequest) {
  const qstashSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const qstashNextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (qstashSigningKey && qstashNextSigningKey) {
    const receiver = new Receiver({ currentSigningKey: qstashSigningKey, nextSigningKey: qstashNextSigningKey });
    const body = await request.text();
    const isValid = await receiver.verify({ signature: request.headers.get("upstash-signature") ?? "", body }).catch(() => false);
    if (!isValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } else {
    // fallback for non-QStash callers (e.g. manual curl with secret header)
    const secret = process.env.ALERT_SERVICE_SECRET;
    if (secret) {
      const authHeader = request.headers.get("x-alert-secret") ?? request.headers.get("authorization");
      const provided = authHeader?.replace(/^Bearer\s+/i, "");
      if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = getServiceClient();

  // Fetch all watchlist rows
  const { data: rows, error } = await admin
    .from("market_watchlists")
    .select("user_id, symbols");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { userId: string; triggered: number; emailed: boolean }[] = [];

  for (const row of rows ?? []) {
    const items = coerceItems(row.symbols);
    const itemsWithTarget = items.filter((i) => i.targetPrice != null);
    if (itemsWithTarget.length === 0) continue;

    // Look up the user's email from auth.users
    const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
    const email = userData?.user?.email;
    if (!email) continue;

    // Fetch current quotes for symbols with targets
    const symbols = itemsWithTarget.map((i) => i.symbol);
    let quotes;
    try {
      quotes = await fetchQuotes(symbols);
    } catch {
      continue;
    }

    // Find triggered alerts
    const triggers: AlertTrigger[] = [];
    for (const item of itemsWithTarget) {
      const quote = quotes.find((q) => q.symbol === item.symbol);
      if (!quote || item.targetPrice == null) continue;
      // Alert if current price has reached or crossed the target (in either direction within 2% or fully crossed)
      const isBelow = item.targetDirection === "below";
      const crossed = isBelow
        ? quote.price <= item.targetPrice
        : quote.price >= item.targetPrice;
      if (crossed) {
        triggers.push({
          symbol: item.symbol,
          currentPrice: quote.price,
          targetPrice: item.targetPrice,
          currency: quote.currency,
        });
      }
    }

    if (triggers.length === 0) continue;

    // Send alert email
    try {
      const html = buildAlertEmailHtml(triggers);
      const hitSymbols = triggers.map((t) => t.symbol).join(", ");
      await sendAlertEmail({
        to: email,
        subject: `Price alert: ${hitSymbols} hit target`,
        html,
      });
    } catch {
      results.push({ userId: row.user_id, triggered: triggers.length, emailed: false });
      continue;
    }

    // Clear targetPrice on triggered items in DB
    const triggeredSymbols = new Set(triggers.map((t) => t.symbol));
    const updatedItems = items.map((item) =>
      triggeredSymbols.has(item.symbol)
        ? { ...item, targetPrice: undefined }
        : item
    );
    // Remove undefined targetPrice to keep JSON clean
    const cleanedItems = updatedItems.map(({ targetPrice, ...rest }) =>
      targetPrice != null ? { ...rest, targetPrice } : rest
    );

    await admin
      .from("market_watchlists")
      .update({ symbols: cleanedItems, updated_at: new Date().toISOString() })
      .eq("user_id", row.user_id);

    results.push({ userId: row.user_id, triggered: triggers.length, emailed: true });
  }

  return NextResponse.json({ ok: true, results });
}
