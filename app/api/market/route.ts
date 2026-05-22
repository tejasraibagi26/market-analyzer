import { NextRequest, NextResponse } from "next/server";
import { fetchQuotes, DEFAULT_WATCHLIST } from "@/lib/marketData";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbolsParam = searchParams.get("symbols");
  const symbols = symbolsParam
    ? symbolsParam.split(",").map((s) => s.trim().toUpperCase())
    : DEFAULT_WATCHLIST;

  try {
    const quotes = await fetchQuotes(symbols);
    const returned = new Set(quotes.map((q) => q.symbol));

    // For any symbol that failed and doesn't already have .TO, retry with .TO
    const failed = symbols.filter((s) => !returned.has(s));
    const retryMap: Record<string, string> = {};
    const retrySymbols = failed
      .filter((s) => !s.endsWith(".TO"))
      .map((s) => { const candidate = `${s}.TO`; retryMap[candidate] = s; return candidate; });

    if (retrySymbols.length > 0) {
      const retried = await fetchQuotes(retrySymbols);
      for (const q of retried) {
        quotes.push(q);
        // Map original symbol → corrected symbol so client can update watchlist
        returned.add(q.symbol);
      }
    }

    // Build a resolved map: original → corrected (only for symbols that changed)
    const resolved: Record<string, string> = {};
    for (const [corrected, original] of Object.entries(retryMap)) {
      if (returned.has(corrected)) resolved[original] = corrected;
    }

    return NextResponse.json({
      quotes,
      resolved,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Market data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
