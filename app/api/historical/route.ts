import { NextRequest, NextResponse } from "next/server";
import { fetchHistorical } from "@/lib/marketData";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");
  const period = (searchParams.get("period") ?? "6mo") as
    | "1mo"
    | "3mo"
    | "6mo"
    | "1y"
    | "2y";

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  try {
    const data = await fetchHistorical(symbol.toUpperCase(), period);
    return NextResponse.json({ symbol: symbol.toUpperCase(), data });
  } catch (error) {
    console.error("Historical data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch historical data" },
      { status: 500 }
    );
  }
}
