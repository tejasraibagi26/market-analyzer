import { NextRequest, NextResponse } from "next/server";
import { fetchQuotes, fetchHistorical, calculateIndicators } from "@/lib/marketData";
import { analyzeAssets } from "@/lib/signals";
import { generateSuggestionsWithClaude } from "@/lib/claude";
import { DEFAULT_WATCHLIST } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const symbols: string[] = body.symbols ?? DEFAULT_WATCHLIST;
  const apiKey = request.headers.get("x-anthropic-key") ?? "";

  try {
    const [quotes, historicalResults] = await Promise.all([
      fetchQuotes(symbols),
      Promise.allSettled(symbols.map((s) => fetchHistorical(s, "6mo"))),
    ]);

    const assets = quotes.map((quote, i) => {
      const settled = historicalResults[i];
      const history = settled?.status === "fulfilled" ? settled.value : [];
      const indicators = calculateIndicators(history);
      const closes = history.map((d) => d.close);

      const periodReturn =
        closes.length > 1
          ? ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100
          : 0;

      const dailyReturns = closes.slice(1).map((c, j) => Math.log(c / closes[j]));
      const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / (dailyReturns.length || 1);
      const variance =
        dailyReturns.reduce((a, r) => a + Math.pow(r - avgReturn, 2), 0) /
        (dailyReturns.length || 1);
      const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
      const avgVolume = history.reduce((a, d) => a + d.volume, 0) / (history.length || 1);

      return { quote, indicators, historicalSummary: { periodReturn, volatility, avgVolume } };
    });

    const analysis = apiKey
      ? await generateSuggestionsWithClaude(apiKey, assets)
      : analyzeAssets(assets);

    return NextResponse.json({ ...analysis, usedAI: !!apiKey });
  } catch (error) {
    console.error("Analysis error:", error);
    const msg = error instanceof Error ? error.message : "Failed to analyze";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
