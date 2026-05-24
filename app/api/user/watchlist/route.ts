import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { WatchlistItem } from "@/types/market";

function coerceToItems(raw: unknown): WatchlistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    if (typeof entry === "string") {
      return { symbol: entry, addedAt: new Date().toISOString() };
    }
    return entry as WatchlistItem;
  });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("market_watchlists")
    .select("symbols")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = coerceToItems(data?.symbols ?? []);
  return NextResponse.json({ items, symbols: items.map((i) => i.symbol) });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  let items: WatchlistItem[];
  if (Array.isArray(body.items)) {
    items = body.items as WatchlistItem[];
  } else if (Array.isArray(body.symbols)) {
    // backward-compat: plain string[] → wrap to items
    items = (body.symbols as string[]).map((s) => ({ symbol: s, addedAt: new Date().toISOString() }));
  } else {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { error } = await supabase
    .from("market_watchlists")
    .upsert({ user_id: user.id, symbols: items, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
