export interface AlertTrigger {
  symbol: string;
  currentPrice: number;
  targetPrice: number;
  currency: string;
}

function fmtPrice(n: number, currency: string) {
  return `${currency === "CAD" ? "C$" : "$"}${n.toFixed(2)}`;
}

export function buildAlertEmailHtml(triggers: AlertTrigger[]): string {
  const rows = triggers
    .map(({ symbol, currentPrice, targetPrice, currency }) => {
      const hit = currentPrice >= targetPrice ? "reached" : "dropped to";
      const color = currentPrice >= targetPrice ? "#16a34a" : "#d97706";
      const upside = (((currentPrice - targetPrice) / targetPrice) * 100).toFixed(1);
      const upsideLabel = Number(upside) >= 0 ? `+${upside}%` : `${upside}%`;

      return `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:top;">
                <div style="font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:700;color:#111827;letter-spacing:1px;">${symbol.replace(/\./g, "&#8203;.")}</div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;margin-top:3px;">Price ${hit} your target</div>
              </td>
              <td style="text-align:right;vertical-align:top;">
                <div style="font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:700;color:${color};">${fmtPrice(currentPrice, currency)}</div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9ca3af;margin-top:3px;">
                  target ${fmtPrice(targetPrice, currency)} &nbsp;·&nbsp; ${upsideLabel}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:4px;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="padding:32px 32px 24px;border-bottom:1px solid #e5e7eb;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Markt by Uplift</div>
            <div style="font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:700;color:#111827;letter-spacing:2px;">Price Alert</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b7280;margin-top:8px;">
              ${triggers.length === 1 ? "A symbol" : `${triggers.length} symbols`} in your watchlist reached ${triggers.length === 1 ? "its" : "their"} target price.
            </div>
          </td>
        </tr>

        <!-- Alert rows -->
        <tr><td style="padding:0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${rows}
          </table>
        </td></tr>

        <!-- Note -->
        <tr>
          <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;line-height:1.6;">
              These targets have been cleared automatically. You can set new ones from the dashboard.
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9ca3af;text-align:center;">
              Markt by Uplift &nbsp;·&nbsp; Not financial advice &nbsp;·&nbsp; Data from Yahoo Finance
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
