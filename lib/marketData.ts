import "server-only";
import YahooFinance from "yahoo-finance2";
import type {
  Quote,
  HistoricalDataPoint,
  TechnicalIndicators,
} from "@/types/market";
export { DEFAULT_WATCHLIST } from "@/lib/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yahooFinance = new (YahooFinance as any)();

async function quoteSummaryWithFallback(symbol: string) {
  try {
    return await yahooFinance.quoteSummary(symbol, {
      modules: ["price", "summaryDetail", "defaultKeyStatistics"],
    });
  } catch {
    // Some tickers use dash instead of dot (e.g. BRK.B → BRK-B)
    if (symbol.includes(".") && !symbol.endsWith(".TO")) {
      return yahooFinance.quoteSummary(symbol.replace(/\./g, "-"), {
        modules: ["price", "summaryDetail", "defaultKeyStatistics"],
      });
    }
    throw new Error(`Quote not found for symbol: ${symbol}`);
  }
}

export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const results = await Promise.allSettled(
    symbols.map((symbol) => quoteSummaryWithFallback(symbol))
  );

  const quotes: Quote[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result.value as any;
    const price = data.price;
    const summary = data.summaryDetail;
    const stats = data.defaultKeyStatistics;

    if (!price || price.regularMarketPrice == null) continue;

    quotes.push({
      symbol: symbols[i],
      name: price.longName ?? price.shortName ?? symbols[i],
      price: price.regularMarketPrice,
      change: price.regularMarketChange ?? 0,
      changePercent: price.regularMarketChangePercent ?? 0,
      volume: price.regularMarketVolume ?? 0,
      marketCap: price.marketCap,
      fiftyTwoWeekHigh: summary?.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: summary?.fiftyTwoWeekLow ?? 0,
      pe: summary?.trailingPE,
      dividendYield: summary?.dividendYield
        ? summary.dividendYield * 100
        : undefined,
      type: stats?.fundInceptionDate != null ? "etf" : "stock",
      currency: price.currency ?? "USD",
    });
  }

  return quotes;
}

export async function fetchHistorical(
  symbol: string,
  period: "1mo" | "3mo" | "6mo" | "1y" | "2y" = "6mo"
): Promise<HistoricalDataPoint[]> {
  const daysMap: Record<typeof period, number> = {
    "1mo": 30,
    "3mo": 90,
    "6mo": 180,
    "1y": 365,
    "2y": 730,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any;
  try {
    result = await yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - daysMap[period] * 86400000),
      period2: new Date(),
      interval: "1d",
    });
  } catch {
    return [];
  }

  const rows = result?.quotes ?? [];
  return rows
    .filter((row: any) => row.close != null)
    .map((row: any) => ({
      date: new Date(row.date).toISOString().split("T")[0],
      open: row.open ?? 0,
      high: row.high ?? 0,
      low: row.low ?? 0,
      close: row.close ?? 0,
      volume: row.volume ?? 0,
    }));
}

export function calculateIndicators(
  data: HistoricalDataPoint[]
): TechnicalIndicators {
  const closes = data.map((d) => d.close);
  const n = closes.length;

  const sma = (period: number): number => {
    if (n < period) return closes[n - 1] ?? 0;
    const slice = closes.slice(n - period);
    return slice.reduce((a, b) => a + b, 0) / period;
  };

  // RSI (14-period)
  let gains = 0;
  let losses = 0;
  const rsiPeriod = Math.min(14, n - 1);
  for (let i = n - rsiPeriod; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / rsiPeriod;
  const avgLoss = losses / rsiPeriod;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  // Bollinger Bands (20-period)
  const sma20 = sma(20);
  const slice20 = closes.slice(Math.max(0, n - 20));
  const variance =
    slice20.reduce((acc, v) => acc + Math.pow(v - sma20, 2), 0) /
    slice20.length;
  const stdDev = Math.sqrt(variance);

  // MACD (12, 26 EMA difference — simplified)
  const ema = (p: number): number => {
    const k = 2 / (p + 1);
    let val = closes[0];
    for (let i = 1; i < n; i++) val = closes[i] * k + val * (1 - k);
    return val;
  };
  const macd = ema(12) - ema(26);
  const macdSignal = macd * 0.9;

  return {
    rsi: Math.round(rsi * 100) / 100,
    sma20: Math.round(sma20 * 100) / 100,
    sma50: Math.round(sma(50) * 100) / 100,
    sma200: Math.round(sma(200) * 100) / 100,
    macd: Math.round(macd * 100) / 100,
    macdSignal: Math.round(macdSignal * 100) / 100,
    bollingerUpper: Math.round((sma20 + 2 * stdDev) * 100) / 100,
    bollingerMiddle: Math.round(sma20 * 100) / 100,
    bollingerLower: Math.round((sma20 - 2 * stdDev) * 100) / 100,
  };
}
