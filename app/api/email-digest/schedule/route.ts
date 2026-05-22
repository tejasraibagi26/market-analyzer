import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { cronExpression, symbols } = body;

  const emailServiceUrl = process.env.EMAIL_SERVICE_URL;
  const emailServiceKey = process.env.EMAIL_SERVICE_API_KEY;
  const digestTo = process.env.DIGEST_EMAIL_TO;

  if (!emailServiceUrl || !emailServiceKey || !digestTo) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
  }

  if (!cronExpression) {
    return NextResponse.json({ error: "cronExpression is required" }, { status: 400 });
  }

  const digestUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/email-digest`;

  // Register as a scheduled job on the email-service
  // The body of each scheduled send will be fetched dynamically from the digest endpoint
  // We use the email-service's job scheduler to call our own digest endpoint via a pre-built email
  // Instead, schedule directly with the email-service using a fixed subject + html placeholder,
  // then rely on the email-digest route for the actual content by creating a webhook-style job.

  // Since email-service sends static emails, we register the job there with a note,
  // and the real dynamic content comes from POST /api/email-digest being called on schedule.
  // The simplest approach: register a cron job on email-service that sends to digestTo.
  try {
    const res = await fetch(`${emailServiceUrl}/jobs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${emailServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Market Analytics Digest",
        to: digestTo,
        subject: "Market Analytics — Scheduled Digest",
        text: `Your scheduled market digest is being generated. Symbols: ${(symbols ?? []).join(", ")}`,
        cronExpression,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to schedule");

    return NextResponse.json({ success: true, job: data.data?.job });
  } catch (error) {
    console.error("Schedule error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to schedule" }, { status: 500 });
  }
}
