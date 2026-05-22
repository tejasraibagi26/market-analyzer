import type { Suggestion, AnalysisResult, Quote } from "@/types/market";

const ACTION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  buy:   { bg: "#00c853", text: "#ffffff", border: "#00c853" },
  hold:  { bg: "#f9a825", text: "#ffffff", border: "#f9a825" },
  sell:  { bg: "#d32f2f", text: "#ffffff", border: "#d32f2f" },
  watch: { bg: "#757575", text: "#ffffff", border: "#757575" },
};

const SENTIMENT_COLOR: Record<string, string> = {
  bullish: "#00c853",
  bearish: "#d32f2f",
  neutral: "#757575",
};

function fmt(n: number, decimals = 2) {
  return n.toFixed(decimals);
}

function fmtPrice(n: number, currency: string) {
  return `${currency === "CAD" ? "C$" : "$"}${fmt(n)}`;
}

const FS = {
  xxs:  "11px",
  xs:   "12px",
  sm:   "13px",
  base: "15px",
  md:   "16px",
  lg:   "20px",
  xl:   "24px",
  xxl:  "36px",
};

function suggestionCard(s: Suggestion, currency = "USD") {
  const style = ACTION_STYLES[s.action] ?? ACTION_STYLES.watch;
  const sentimentColor = SENTIMENT_COLOR[s.sentiment] ?? "#757575";
  const upside = s.targetPrice
    ? (((s.targetPrice - s.currentPrice) / s.currentPrice) * 100).toFixed(1)
    : null;

  const keyPointsHtml = s.keyPoints
    .map((p) => `
      <tr>
        <td style="padding:4px 0;color:#444;font-size:${FS.sm};font-family:Arial,sans-serif;line-height:1.6;">
          <span style="color:${style.bg};margin-right:6px;font-weight:700;">›</span>${p}
        </td>
      </tr>`
    ).join("");

  const risksHtml = s.risks
    .map((r) => `
      <tr>
        <td style="padding:4px 0;color:#666;font-size:${FS.sm};font-family:Arial,sans-serif;line-height:1.6;">
          <span style="color:#d32f2f;margin-right:6px;font-weight:700;">›</span>${r}
        </td>
      </tr>`
    ).join("");

  const confidenceBar = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 4px;">
      <tr>
        <td bgcolor="#eeeeee" style="background-color:#eeeeee;height:4px;border-radius:2px;overflow:hidden;">
          <div style="width:${s.confidence}%;height:4px;background-color:${style.bg};"></div>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:${FS.xxs};color:#999;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Confidence</td>
        <td align="right" style="font-size:${FS.xxs};color:${style.bg};font-family:Arial,sans-serif;font-weight:700;">${s.confidence}%</td>
      </tr>
    </table>`;

  return `
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="margin-bottom:12px;background-color:#ffffff;border:1px solid #e0e0e0;border-left:4px solid ${style.bg};">
    <tr>
      <td bgcolor="#ffffff" style="padding:18px;background-color:#ffffff;">
        <!-- Header row -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="font-family:Arial,sans-serif;font-size:${FS.xl};font-weight:700;color:#111;letter-spacing:1px;">${s.symbol.replace(/\./g, "&#8203;.")}</div>
              <div style="font-size:${FS.xs};color:#999;font-family:Arial,sans-serif;margin-top:2px;">${s.name}</div>
            </td>
            <td align="right" valign="top">
              <span style="display:inline-block;background-color:${style.bg};color:${style.text};font-family:Arial,sans-serif;font-weight:700;font-size:${FS.xs};letter-spacing:1px;padding:5px 12px;text-transform:uppercase;border-radius:2px;">${s.action.toUpperCase()}</span>
              <div style="font-size:${FS.xxs};color:${sentimentColor};font-family:Arial,sans-serif;margin-top:5px;text-align:right;text-transform:uppercase;font-weight:700;">${s.sentiment}</div>
            </td>
          </tr>
        </table>

        <!-- Price row -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-top:1px solid #f0f0f0;padding-top:12px;">
          <tr>
            <td>
              <div style="font-size:${FS.xxs};color:#999;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Current</div>
              <div style="font-size:${FS.lg};color:#111;font-family:Arial,sans-serif;font-weight:700;margin-top:3px;">${fmtPrice(s.currentPrice, currency)}</div>
            </td>
            ${s.targetPrice ? `
            <td align="center">
              <div style="font-size:${FS.xxs};color:#999;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Target</div>
              <div style="font-size:${FS.lg};color:${style.bg};font-family:Arial,sans-serif;font-weight:700;margin-top:3px;">${fmtPrice(s.targetPrice, currency)}</div>
            </td>
            <td align="right">
              <div style="font-size:${FS.xxs};color:#999;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Upside</div>
              <div style="font-size:${FS.lg};color:${Number(upside) >= 0 ? "#00c853" : "#d32f2f"};font-family:Arial,sans-serif;font-weight:700;margin-top:3px;">${Number(upside) >= 0 ? "+" : ""}${upside}%</div>
            </td>` : ""}
          </tr>
        </table>

        ${confidenceBar}

        <!-- Reasoning -->
        <p style="font-size:${FS.base};color:#444;font-family:Arial,sans-serif;line-height:1.75;margin:14px 0 0;padding-left:12px;border-left:3px solid ${style.bg};">${s.reasoning}</p>

        <!-- Key Points -->
        ${s.keyPoints.length > 0 ? `
        <div style="margin-top:14px;">
          <div style="font-size:${FS.xxs};color:#bbb;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Key Points</div>
          <table width="100%" cellpadding="0" cellspacing="0">${keyPointsHtml}</table>
        </div>` : ""}

        <!-- Risks -->
        ${s.risks.length > 0 ? `
        <div style="margin-top:12px;">
          <div style="font-size:${FS.xxs};color:#bbb;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Risks</div>
          <table width="100%" cellpadding="0" cellspacing="0">${risksHtml}</table>
        </div>` : ""}
      </td>
    </tr>
  </table>`;
}

function quoteRow(q: Quote, index: number) {
  const changeColor = q.changePercent >= 0 ? "#00c853" : "#d32f2f";
  const sign = q.changePercent >= 0 ? "+" : "";
  const currency = q.currency === "CAD" ? "C$" : "$";
  const rowBg = index % 2 === 0 ? "#ffffff" : "#fafafa";

  return `
  <tr bgcolor="${rowBg}">
    <td bgcolor="${rowBg}" style="padding:10px 14px;border-bottom:1px solid #f0f0f0;background-color:${rowBg};">
      <span style="font-family:Arial,sans-serif;font-weight:700;font-size:${FS.md};color:#111;">${q.symbol.replace(/\./g, "&#8203;.")}</span>
      <div style="font-size:${FS.xs};color:#999;font-family:Arial,sans-serif;margin-top:1px;">${q.name}</div>
    </td>
    <td align="right" bgcolor="${rowBg}" style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:${FS.md};font-weight:600;color:#111;white-space:nowrap;background-color:${rowBg};">${currency}${fmt(q.price)}</td>
    <td align="right" bgcolor="${rowBg}" style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:${FS.sm};font-weight:700;color:${changeColor};white-space:nowrap;background-color:${rowBg};">${sign}${fmt(q.changePercent)}%</td>
  </tr>`;
}

export function buildEmailHtml({
  analysis,
  watchlistQuotes,
  generatedAt,
}: {
  analysis: AnalysisResult;
  watchlistQuotes: Quote[];
  generatedAt: string;
}) {
  const ACTION_ORDER: Record<string, number> = { buy: 0, hold: 1, watch: 2, sell: 3 };
  const sorted = [...analysis.suggestions].sort(
    (a, b) => (ACTION_ORDER[a.action] ?? 9) - (ACTION_ORDER[b.action] ?? 9)
  );
  const buys = sorted.filter((s) => s.action === "buy");
  const others = sorted.filter((s) => s.action !== "buy");
  const date = new Date(generatedAt).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const watchlistRows = watchlistQuotes.map((q, i) => quoteRow(q, i)).join("");
  const buyCards = buys.map((s) => {
    const q = watchlistQuotes.find((qt) => qt.symbol === s.symbol);
    return suggestionCard(s, q?.currency ?? "USD");
  }).join("");
  const otherCards = others.map((s) => {
    const q = watchlistQuotes.find((qt) => qt.symbol === s.symbol);
    return suggestionCard(s, q?.currency ?? "USD");
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Market Analytics Digest</title>
  <style>* { -webkit-text-size-adjust: none; }</style>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f5f5" style="background-color:#f5f5f5;">
  <tr>
    <td align="center" bgcolor="#f5f5f5" style="padding:24px 16px;background-color:#f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">

        <!-- HEADER -->
        <tr>
          <td bgcolor="#111111" style="padding:28px 28px 24px;background-color:#111111;border-radius:4px 4px 0 0;">
            <div style="font-size:${FS.xs};color:#00c853;font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Daily Digest &middot; ${date}</div>
            <div style="font-size:${FS.xxl};font-weight:700;color:#ffffff;letter-spacing:2px;line-height:1.1;">Market<span style="color:#00c853;"> Analytics</span></div>
            <div style="font-size:${FS.xs};color:#555;font-family:Arial,sans-serif;margin-top:8px;letter-spacing:1px;">RSI &middot; MACD &middot; Bollinger Bands &middot; Moving Averages</div>
          </td>
        </tr>

        <!-- MARKET OUTLOOK -->
        <tr>
          <td bgcolor="#1a2e1a" style="padding:20px 28px;background-color:#1a2e1a;border-left:4px solid #00c853;">
            <div style="font-size:${FS.xxs};color:#00c853;font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Market Outlook</div>
            <p style="font-size:${FS.base};color:#cccccc;font-family:Arial,sans-serif;line-height:1.8;margin:0;">${analysis.marketOutlook}</p>
          </td>
        </tr>

        <!-- WATCHLIST SNAPSHOT -->
        <tr>
          <td bgcolor="#ffffff" style="padding:24px 28px;background-color:#ffffff;">
            <div style="font-size:${FS.xxs};color:#bbb;font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">Watchlist Snapshot</div>
            <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="border:1px solid #e0e0e0;background-color:#ffffff;">
              <tr bgcolor="#f5f5f5">
                <td bgcolor="#f5f5f5" style="padding:8px 14px;font-size:${FS.xxs};color:#999;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #e0e0e0;background-color:#f5f5f5;">Symbol</td>
                <td align="right" bgcolor="#f5f5f5" style="padding:8px 14px;font-size:${FS.xxs};color:#999;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #e0e0e0;background-color:#f5f5f5;">Price</td>
                <td align="right" bgcolor="#f5f5f5" style="padding:8px 14px;font-size:${FS.xxs};color:#999;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #e0e0e0;background-color:#f5f5f5;">Change</td>
              </tr>
              ${watchlistRows}
            </table>
          </td>
        </tr>

        <!-- BUY SIGNALS -->
        ${buys.length > 0 ? `
        <tr>
          <td bgcolor="#ffffff" style="padding:0 28px 24px;background-color:#ffffff;border-top:1px solid #f0f0f0;">
            <div style="font-size:${FS.xxs};color:#00c853;font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;padding-top:24px;font-weight:700;">Buy Signals (${buys.length})</div>
            ${buyCards}
          </td>
        </tr>` : ""}

        <!-- OTHER SIGNALS -->
        ${others.length > 0 ? `
        <tr>
          <td bgcolor="#ffffff" style="padding:0 28px 24px;background-color:#ffffff;border-top:1px solid #f0f0f0;">
            <div style="font-size:${FS.xxs};color:#999;font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;padding-top:24px;">Other Signals</div>
            ${otherCards}
          </td>
        </tr>` : ""}

        <!-- FOOTER -->
        <tr>
          <td bgcolor="#f5f5f5" style="padding:20px 28px;background-color:#f5f5f5;border-top:1px solid #e0e0e0;border-radius:0 0 4px 4px;">
            <p style="font-size:${FS.xs};color:#bbb;font-family:Arial,sans-serif;line-height:1.8;margin:0;">
              This digest is for informational purposes only and does not constitute financial advice. Past performance is not indicative of future results. Data sourced from Yahoo Finance.
            </p>
            <div style="margin-top:8px;font-size:${FS.xxs};color:#ccc;font-family:Arial,sans-serif;">Market Analytics &middot; ${new Date(generatedAt).toUTCString()}</div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
