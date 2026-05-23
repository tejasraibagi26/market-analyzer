import { NextRequest, NextResponse } from "next/server";
import { fetchQuotes, fetchHistorical, calculateIndicators } from "@/lib/marketData";
import { analyzeAssets } from "@/lib/signals";
import { generateSuggestionsWithClaude } from "@/lib/claude";
import { DEFAULT_WATCHLIST } from "@/lib/constants";
import { buildEmailHtml } from "@/lib/emailTemplate";
import { sendEmailDigest } from "@/lib/emailService";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const symbols: string[] = body.symbols ?? DEFAULT_WATCHLIST;
  const to: string = body.to ?? process.env.DIGEST_EMAIL_TO ?? "";
  const dryRun: boolean = body.dryRun === true;
  const apiKey = request.headers.get("x-anthropic-key") ?? "";

  if (!to) {
    return NextResponse.json({ error: "Recipient email required. Pass 'to' in the body or set DIGEST_EMAIL_TO env var." }, { status: 400 });
  }

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

    if (apiKey && analysis.usage) {
      const u = analysis.usage;
      console.log("[email-digest] Claude usage:");
      console.log(`  Model       : claude-sonnet-4-6`);
      console.log(`  Input tokens: ${u.inputTokens.toLocaleString()}`);
      console.log(`  Output tokens: ${u.outputTokens.toLocaleString()}`);
      console.log(`  Total tokens: ${u.totalTokens.toLocaleString()}`);
      console.log(`  Cost        : $${u.costUsd.toFixed(6)}`);
    } else if (!apiKey) {
      console.log("[email-digest] Using rule-based analysis (no Claude key)");
    }

    const generatedAt = new Date().toISOString();
    const html = buildEmailHtml({ analysis, watchlistQuotes: quotes, generatedAt });

    const buySuggestions = analysis.suggestions.filter((s) => s.action === "buy");
    const dateStr = new Date(generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const subject =
      buySuggestions.length > 0
        ? `Market Digest - ${buySuggestions.length} Buy Signal${buySuggestions.length > 1 ? "s" : ""}: ${buySuggestions.map((s) => s.symbol).join(", ")} - ${dateStr}`
        : `Market Digest - ${dateStr}`;

    if (dryRun) {
      return NextResponse.json({ subject, html, symbols, usedAI: !!apiKey });
    }

    await sendEmailDigest({ to, subject, html });
    console.log(`[email-digest] Sent to ${to} — subject: "${subject}"`);

    return NextResponse.json({
      success: true,
      recipient: to,
      symbols,
      buySuggestions: buySuggestions.map((s) => s.symbol),
      usedAI: !!apiKey,
      ...(analysis.usage ? { claudeUsage: analysis.usage } : {}),
    });
  } catch (error) {
    console.error("Email digest error:", error);
    const msg = error instanceof Error ? error.message : "Failed to send digest";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
