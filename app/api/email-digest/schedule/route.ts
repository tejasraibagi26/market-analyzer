import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { cronExpression, symbols } = body;

  const emailServiceUrl = process.env.EMAIL_SERVICE_URL;
  const emailServiceKey = process.env.EMAIL_SERVICE_API_KEY;

  if (!emailServiceUrl || !emailServiceKey) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
  }

  if (!cronExpression) {
    return NextResponse.json({ error: "cronExpression is required" }, { status: 400 });
  }

  const digestUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://market-analytics.vercel.app"}/api/email-digest`;

  try {
    const res = await fetch(`${emailServiceUrl}/schedule`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${emailServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Market Analytics Digest",
        appName: "Market Analytics",
        to: user.email,
        subject: "Market Analytics — Scheduled Digest",
        cronExpression,
        metadata: {
          type: "digest",
          symbols: symbols ?? [],
          digestUrl,
        },
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
