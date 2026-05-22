export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  pe?: number;
  dividendYield?: number;
  type: "stock" | "etf";
  currency: string;
}

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number;
  sma20: number;
  sma50: number;
  sma200: number;
  macd: number;
  macdSignal: number;
  bollingerUpper: number;
  bollingerLower: number;
  bollingerMiddle: number;
}

export interface WatchlistItem {
  symbol: string;
  addedAt: string;
  targetPrice?: number;
  notes?: string;
}

export interface MarketSummary {
  quotes: Quote[];
  lastUpdated: string;
}

export type Sentiment = "bullish" | "bearish" | "neutral";
export type Action = "buy" | "hold" | "sell" | "watch";

export interface Suggestion {
  symbol: string;
  name: string;
  action: Action;
  sentiment: Sentiment;
  confidence: number;
  reasoning: string;
  keyPoints: string[];
  risks: string[];
  targetPrice?: number;
  currentPrice: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface AnalysisResult {
  suggestions: Suggestion[];
  marketOutlook: string;
  generatedAt: string;
  usage?: TokenUsage;
}
