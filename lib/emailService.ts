const APP_NAME = 'Markt'

async function callEmailService(payload: Record<string, unknown>): Promise<unknown> {
  const url = process.env.EMAIL_SERVICE_URL;
  const apiKey = process.env.EMAIL_SERVICE_API_KEY;

  if (!url || !apiKey) {
    throw new Error("EMAIL_SERVICE_URL and EMAIL_SERVICE_API_KEY must be set");
  }

  const res = await fetch(`${url}/send`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ appName: APP_NAME, ...payload }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Email service returned ${res.status}`);
  }

  return res.json();
}

export async function sendEmailDigest({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  return callEmailService({ to, subject, html, type: "digest" });
}

export async function sendAlertEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  return callEmailService({ to, subject, html, type: "alert" });
}
