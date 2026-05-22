import type { Quote, TechnicalIndicators, Suggestion, AnalysisResult, Action, Sentiment } from "@/types/market";
import { TOP_PICKS } from "@/lib/constants";

const TOP_PICK_THESIS: Record<string, string> = {
  NVDA:    "Dominant AI chip supplier — CUDA moat, data center demand compounding. Pull-backs are historically strong entry points.",
  AMZN:    "AWS cloud growth re-accelerating + retail margin expansion. Trading at a discount to peers on free cash flow.",
  VTI:     "Broadest US market exposure — 3,700+ stocks, low cost. Core long-term hold for any portfolio.",
  "ENB.TO":"7%+ dividend yield backed by regulated pipeline cash flows. Defensive income with inflation protection.",
  "BAM.TO":"Brookfield's global alternative asset platform — infrastructure, renewables, real estate. Decades of compounding ahead.",
};

interface AssetInput {
  quote: Quote;
  indicators: TechnicalIndicators;
  historicalSummary: { periodReturn: number; volatility: number; avgVolume: number };
}

interface SignalScore {
  score: number; // -100 to +100, positive = bullish
  signals: { label: string; bullish: boolean; weight: number }[];
}

function scoreAsset(asset: AssetInput): SignalScore {
  const { quote, indicators } = asset;
  const { rsi, sma20, sma50, sma200, macd, macdSignal, bollingerUpper, bollingerLower, bollingerMiddle } = indicators;
  const price = quote.price;
  const signals: SignalScore["signals"] = [];

  // RSI signals (weight: 20)
  if (rsi < 30) {
    signals.push({ label: `RSI ${rsi} — oversold, potential reversal`, bullish: true, weight: 20 });
  } else if (rsi < 45) {
    signals.push({ label: `RSI ${rsi} — approaching oversold`, bullish: true, weight: 8 });
  } else if (rsi > 70) {
    signals.push({ label: `RSI ${rsi} — overbought, momentum extended`, bullish: false, weight: 20 });
  } else if (rsi > 60) {
    signals.push({ label: `RSI ${rsi} — elevated, watch for exhaustion`, bullish: false, weight: 8 });
  } else {
    signals.push({ label: `RSI ${rsi} — neutral range`, bullish: true, weight: 4 });
  }

  // Price vs moving averages (weight: 25 total)
  if (price > sma200) {
    signals.push({ label: `Price above 200 SMA ($${sma200}) — long-term uptrend`, bullish: true, weight: 12 });
  } else {
    signals.push({ label: `Price below 200 SMA ($${sma200}) — long-term downtrend`, bullish: false, weight: 12 });
  }

  if (price > sma50) {
    signals.push({ label: `Price above 50 SMA ($${sma50}) — medium-term bullish`, bullish: true, weight: 8 });
  } else {
    signals.push({ label: `Price below 50 SMA ($${sma50}) — medium-term bearish`, bullish: false, weight: 8 });
  }

  if (sma20 > sma50 && sma50 > sma200) {
    signals.push({ label: "Moving averages aligned bullishly (20 > 50 > 200)", bullish: true, weight: 10 });
  } else if (sma20 < sma50 && sma50 < sma200) {
    signals.push({ label: "Moving averages aligned bearishly (20 < 50 < 200)", bullish: false, weight: 10 });
  }

  // MACD (weight: 15)
  if (macd > macdSignal && macd > 0) {
    signals.push({ label: `MACD ${macd} above signal — bullish momentum`, bullish: true, weight: 15 });
  } else if (macd > macdSignal && macd < 0) {
    signals.push({ label: `MACD crossing up from below zero — early bullish`, bullish: true, weight: 8 });
  } else if (macd < macdSignal && macd < 0) {
    signals.push({ label: `MACD ${macd} below signal — bearish momentum`, bullish: false, weight: 15 });
  } else {
    signals.push({ label: "MACD diverging from signal — weakening trend", bullish: false, weight: 6 });
  }

  // Bollinger Band position (weight: 15)
  const bbRange = bollingerUpper - bollingerLower;
  const bbPosition = bbRange > 0 ? (price - bollingerLower) / bbRange : 0.5;
  if (bbPosition < 0.2) {
    signals.push({ label: `Near lower Bollinger Band ($${bollingerLower}) — oversold`, bullish: true, weight: 15 });
  } else if (bbPosition > 0.8) {
    signals.push({ label: `Near upper Bollinger Band ($${bollingerUpper}) — overbought`, bullish: false, weight: 15 });
  } else if (bbPosition < 0.4) {
    signals.push({ label: "Price in lower half of Bollinger Bands", bullish: true, weight: 6 });
  } else {
    signals.push({ label: "Price in upper half of Bollinger Bands", bullish: false, weight: 4 });
  }

  // 52-week range position (weight: 10)
  const weekRange = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow;
  const weekPosition = weekRange > 0 ? (price - quote.fiftyTwoWeekLow) / weekRange : 0.5;
  if (weekPosition < 0.3) {
    signals.push({ label: `Near 52-week low — potential value entry`, bullish: true, weight: 10 });
  } else if (weekPosition > 0.85) {
    signals.push({ label: `Near 52-week high ($${quote.fiftyTwoWeekHigh}) — extended`, bullish: false, weight: 10 });
  }

  // Period return momentum (weight: 10)
  const { periodReturn } = asset.historicalSummary;
  if (periodReturn > 20) {
    signals.push({ label: `+${periodReturn.toFixed(1)}% 6-month return — strong momentum`, bullish: true, weight: 6 });
  } else if (periodReturn < -15) {
    signals.push({ label: `${periodReturn.toFixed(1)}% 6-month return — significant drawdown`, bullish: true, weight: 10 }); // contrarian buy
  } else if (periodReturn < -5) {
    signals.push({ label: `${periodReturn.toFixed(1)}% 6-month decline — weak trend`, bullish: false, weight: 6 });
  }

  // Compute weighted score
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const bullishWeight = signals.filter(s => s.bullish).reduce((sum, s) => sum + s.weight, 0);
  const score = totalWeight > 0 ? ((bullishWeight / totalWeight) * 2 - 1) * 100 : 0;

  return { score, signals };
}

function buildSuggestion(asset: AssetInput, { score, signals }: SignalScore): Suggestion {
  const { quote, indicators } = asset;

  let action: Action;
  let sentiment: Sentiment;
  const confidence = Math.round(Math.min(Math.abs(score), 95));

  if (score >= 40) { action = "buy"; sentiment = "bullish"; }
  else if (score >= 15) { action = "watch"; sentiment = "bullish"; }
  else if (score >= -15) { action = "hold"; sentiment = "neutral"; }
  else if (score >= -40) { action = "watch"; sentiment = "bearish"; }
  else { action = "sell"; sentiment = "bearish"; }

  const bullishSignals = signals.filter(s => s.bullish).sort((a, b) => b.weight - a.weight);
  const bearishSignals = signals.filter(s => !s.bullish).sort((a, b) => b.weight - a.weight);

  const keyPoints = bullishSignals.slice(0, 3).map(s => s.label);
  const risks = bearishSignals.slice(0, 2).map(s => s.label);

  // Target price: SMA50 for sells, SMA200 resistance for buys, or Bollinger middle
  let targetPrice: number | undefined;
  if (action === "buy") {
    targetPrice = Math.max(indicators.sma50, indicators.bollingerMiddle) * 1.05;
  } else if (action === "sell") {
    targetPrice = Math.min(indicators.sma50, indicators.bollingerMiddle) * 0.95;
  }

  const isTopPick = TOP_PICKS.includes(quote.symbol);
  const reasoning = isTopPick && TOP_PICK_THESIS[quote.symbol]
    ? TOP_PICK_THESIS[quote.symbol]
    : buildReasoning(action, score, asset);

  if (isTopPick) {
    keyPoints.unshift("⭐ Curated top pick — high-conviction long-term hold");
  }

  return {
    symbol: quote.symbol,
    name: quote.name,
    action,
    sentiment,
    confidence,
    reasoning,
    keyPoints,
    risks,
    targetPrice: targetPrice ? Math.round(targetPrice * 100) / 100 : undefined,
    currentPrice: quote.price,
  };
}

function buildReasoning(action: Action, score: number, asset: AssetInput): string {
  const { quote, indicators, historicalSummary } = asset;
  const trendWord = score > 0 ? "bullish" : "bearish";

  const trendContext = indicators.sma20 > indicators.sma200
    ? "above its 200-day moving average, indicating a long-term uptrend"
    : "below its 200-day moving average, suggesting long-term weakness";

  const rsiContext = indicators.rsi < 35 ? "oversold RSI" : indicators.rsi > 65 ? "overbought RSI" : `neutral RSI of ${indicators.rsi}`;

  const returnContext = historicalSummary.periodReturn >= 0
    ? `up ${historicalSummary.periodReturn.toFixed(1)}% over 6 months`
    : `down ${Math.abs(historicalSummary.periodReturn).toFixed(1)}% over 6 months`;

  const actionPhrases: Record<Action, string> = {
    buy: `Technical signals are ${trendWord} with ${rsiContext}. Price is ${trendContext} and ${returnContext}. Current levels present a favorable entry point.`,
    watch: `Mixed signals with ${rsiContext}. Price is ${trendContext} and ${returnContext}. Wait for a clearer breakout or pullback before committing.`,
    hold: `Neutral technical setup with ${rsiContext}. Price is ${trendContext} and ${returnContext}. No strong signal to add or reduce position.`,
    sell: `Technical signals are ${trendWord} with ${rsiContext}. Price is ${trendContext} and ${returnContext}. Consider reducing exposure or waiting for a reversal signal.`,
  };

  return actionPhrases[action];
}

function buildMarketOutlook(assets: AssetInput[]): string {
  const spyAsset = assets.find(a => a.quote.symbol === "SPY");
  const qqqAsset = assets.find(a => a.quote.symbol === "QQQ");
  const xiuAsset = assets.find(a => a.quote.symbol === "XIU.TO");
  const isCanadianFocused = assets.filter(a => a.quote.currency === "CAD").length > assets.length / 2;

  const scores = assets.map(a => scoreAsset(a).score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const bullishCount = scores.filter(s => s > 15).length;
  const bearishCount = scores.filter(s => s < -15).length;
  const overallBias = avgScore > 20 ? "bullish" : avgScore < -20 ? "bearish" : "mixed";

  let outlook = `Technical analysis across ${assets.length} assets shows a ${overallBias} tilt — ${bullishCount} with buy signals, ${bearishCount} with sell signals. `;

  if (isCanadianFocused && xiuAsset) {
    const r = xiuAsset.historicalSummary.periodReturn;
    outlook += `TSX benchmark (XIU) is ${r >= 0 ? "up" : "down"} ${Math.abs(r).toFixed(1)}% over 6 months. `;
    const divAssets = assets.filter(a => (a.quote.dividendYield ?? 0) > 3);
    if (divAssets.length > 0) {
      outlook += `${divAssets.length} holding${divAssets.length > 1 ? "s" : ""} offer 3%+ dividend yield — strong income component for Canadian portfolios.`;
    }
  } else if (spyAsset) {
    const spyReturn = spyAsset.historicalSummary.periodReturn;
    outlook += `S&P 500 (SPY) is ${spyReturn >= 0 ? "up" : "down"} ${Math.abs(spyReturn).toFixed(1)}% over 6 months. `;
    if (qqqAsset) {
      const rsi = qqqAsset.indicators.rsi;
      outlook += `Nasdaq RSI at ${rsi} — ${rsi > 65 ? "stretched, consider waiting for pullbacks" : rsi < 40 ? "oversold, may present opportunity" : "in neutral range"}.`;
    }
  } else {
    outlook += overallBias === "bullish"
      ? "Focus on assets showing strength above key moving averages with improving momentum."
      : overallBias === "bearish"
      ? "Caution warranted — wait for stabilization before adding new positions."
      : "Selective positioning recommended — prioritize assets with the strongest technical setups.";
  }

  return outlook;
}

export function analyzeAssets(assets: AssetInput[]): AnalysisResult {
  const scored = assets.map(asset => ({
    asset,
    result: scoreAsset(asset),
  }));

  const suggestions = scored
    .map(({ asset, result }) => buildSuggestion(asset, result))
    .sort((a, b) => {
      const order: Record<Action, number> = { buy: 0, watch: 1, hold: 2, sell: 3 };
      if (order[a.action] !== order[b.action]) return order[a.action] - order[b.action];
      return b.confidence - a.confidence;
    });

  return {
    suggestions,
    marketOutlook: buildMarketOutlook(assets),
    generatedAt: new Date().toISOString(),
  };
}
