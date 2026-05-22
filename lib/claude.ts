import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Quote, TechnicalIndicators, AnalysisResult, Suggestion, TokenUsage } from "@/types/market";
import { TOP_PICKS } from "@/lib/constants";

interface AssetInput {
  quote: Quote;
  indicators: TechnicalIndicators;
  historicalSummary: { periodReturn: number; volatility: number; avgVolume: number };
}

// claude-sonnet-4-6 pricing per million tokens
const PRICE_INPUT  = 3.00;
const PRICE_OUTPUT = 15.00;

function calcUsage(raw: { input_tokens: number; output_tokens: number }): TokenUsage {
  const costUsd =
    (raw.input_tokens  / 1_000_000) * PRICE_INPUT +
    (raw.output_tokens / 1_000_000) * PRICE_OUTPUT;
  return {
    inputTokens:  raw.input_tokens,
    outputTokens: raw.output_tokens,
    totalTokens:  raw.input_tokens + raw.output_tokens,
    costUsd,
  };
}

function logUsage(u: TokenUsage, model: string) {
  console.log(
    `\n┌─ Claude API Usage ──────────────────────────\n` +
    `│  Model:         ${model}\n` +
    `│  Input tokens:  ${u.inputTokens.toLocaleString().padStart(7)}   ($${((u.inputTokens / 1_000_000) * PRICE_INPUT).toFixed(5)})\n` +
    `│  Output tokens: ${u.outputTokens.toLocaleString().padStart(7)}   ($${((u.outputTokens / 1_000_000) * PRICE_OUTPUT).toFixed(5)})\n` +
    `│  Total tokens:  ${u.totalTokens.toLocaleString().padStart(7)}\n` +
    `│  Cost:          $${u.costUsd.toFixed(5)}\n` +
    `└─────────────────────────────────────────────\n`
  );
}

// Compact prompt — only the data Claude actually needs, no fluff
function buildPrompt(assets: AssetInput[]): string {
  const topPickSet = new Set(TOP_PICKS);

  const rows = assets.map(({ quote: q, indicators: i, historicalSummary: h }) =>
    `${q.symbol}|${q.currency}|${q.type}|${q.price.toFixed(2)}|` +
    `${q.changePercent.toFixed(2)}%|` +
    `52W:${q.fiftyTwoWeekLow.toFixed(0)}-${q.fiftyTwoWeekHigh.toFixed(0)}|` +
    `PE:${q.pe?.toFixed(1) ?? "N/A"}|DIV:${q.dividendYield?.toFixed(2) ?? "0"}%|` +
    `RSI:${i.rsi}|SMA:${i.sma20}/${i.sma50}/${i.sma200}|` +
    `MACD:${i.macd}/${i.macdSignal}|BB:${i.bollingerLower}/${i.bollingerMiddle}/${i.bollingerUpper}|` +
    `6moRet:${h.periodReturn.toFixed(1)}%|Vol:${h.volatility.toFixed(1)}%` +
    (topPickSet.has(q.symbol) ? "|TOP_PICK" : "")
  ).join("\n");

  return `You are a concise market analyst. Given this pipe-delimited data, output ONLY a JSON object.

${rows}

JSON schema (no markdown, no backticks):
{"marketOutlook":"2 sentences","suggestions":[{"symbol":"","action":"buy|hold|sell|watch","sentiment":"bullish|bearish|neutral","confidence":0-100,"reasoning":"2 sentences using specific numbers","keyPoints":["max 3"],"risks":["max 2"],"targetPrice":null}]}

Rules: rank by conviction (buy first), reference actual indicator values, TOP_PICK assets get extra weight.`;
}

export async function generateSuggestionsWithClaude(
  apiKey: string,
  assets: AssetInput[]
): Promise<AnalysisResult> {
  const model = "claude-sonnet-4-6";
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: buildPrompt(assets) }],
  });

  const usage = calcUsage(message.usage);
  logUsage(usage, model);

  if (message.stop_reason === "max_tokens") {
    throw new Error("Claude response was truncated — increase max_tokens or reduce the number of symbols");
  }

  const block = message.content.find(b => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text response from Claude");

  const raw = block.text.trim().replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(raw);

  const suggestions: Suggestion[] = parsed.suggestions.map(
    (s: Omit<Suggestion, "currentPrice" | "name">) => {
      const asset = assets.find(a => a.quote.symbol === s.symbol);
      const keyPoints = [...(s.keyPoints ?? [])];
      if (TOP_PICKS.includes(s.symbol)) keyPoints.unshift("⭐ Curated top pick");
      return {
        ...s,
        name: asset?.quote.name ?? s.symbol,
        currentPrice: asset?.quote.price ?? 0,
        targetPrice: s.targetPrice ?? undefined,
        keyPoints,
      };
    }
  );

  return {
    suggestions,
    marketOutlook: parsed.marketOutlook,
    generatedAt: new Date().toISOString(),
    usage,
  };
}
