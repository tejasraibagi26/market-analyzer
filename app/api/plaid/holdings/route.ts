import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encrypt";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();
  const { data: items, error: dbError } = await serviceClient
    .from("market_plaid_items")
    .select("access_token, item_id, institution_name")
    .eq("user_id", user.id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  if (!items || items.length === 0) return NextResponse.json({ tickers: [] });

  const tickerSet = new Set<string>();

  for (const item of items) {
    try {
      const res = await plaidClient.investmentsHoldingsGet({
        access_token: decrypt(item.access_token),
      });

      for (const sec of res.data.securities) {
        // Only include equity/ETF tickers — skip MFs, bonds, options, cash
        if (
          sec.ticker_symbol &&
          sec.type &&
          ["equity", "etf"].includes(sec.type.toLowerCase())
        ) {
          tickerSet.add(sec.ticker_symbol.toUpperCase());
        }
      }
    } catch (err) {
      const plaidErr = err as { response?: { data?: { error_code?: string } } };
      const errCode = plaidErr.response?.data?.error_code ?? "";
      // NO_INVESTMENT_ACCOUNTS is expected for non-brokerage items
      if (!/NO_INVESTMENT_ACCOUNTS/i.test(errCode)) {
        console.error("[plaid/holdings] error", item.institution_name, errCode);
      }
    }
  }

  return NextResponse.json({ tickers: Array.from(tickerSet) });
}
