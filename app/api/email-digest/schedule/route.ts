import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function computeNextRun(cronExpression: string): string | null {
  // Parse a 5-field cron expression and return the next UTC run time
  try {
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5) return null;
    const [minute, hour, , , dow] = parts;

    const now = new Date();
    const candidate = new Date(now);
    candidate.setUTCSeconds(0, 0);
    candidate.setUTCMinutes(Number(minute));
    candidate.setUTCHours(Number(hour));
    if (candidate <= now) candidate.setUTCDate(candidate.getUTCDate() + 1);

    // For weekly patterns walk forward up to 7 days to find the right weekday
    if (dow !== "*") {
      const targetDays = dow.includes("-")
        ? Array.from({ length: Number(dow.split("-")[1]) - Number(dow.split("-")[0]) + 1 }, (_, i) => Number(dow.split("-")[0]) + i)
        : dow.split(",").map(Number);
      for (let i = 0; i < 7; i++) {
        if (targetDays.includes(candidate.getUTCDay())) break;
        candidate.setUTCDate(candidate.getUTCDate() + 1);
      }
    }

    return candidate.toISOString();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { cronExpression, symbols } = body;

  if (!cronExpression) {
    return NextResponse.json({ error: "cronExpression is required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const digestUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://market-analyzer-ruby.vercel.app"}/api/email-digest`;
  const nextRunAt = computeNextRun(cronExpression);

  try {
    const admin = createServiceClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Remove any existing active digest job for this user first
    await admin
      .from("email_jobs")
      .update({ status: "completed" })
      .eq("recipient", user.email)
      .eq("status", "active")
      .contains("metadata", { type: "digest" });

    const { data: job, error } = await admin
      .from("email_jobs")
      .insert({
        name: "Market Analytics Digest",
        app_name: "Market Analytics",
        recipient: user.email,
        subject: "Market Analytics — Scheduled Digest",
        cron_expression: cronExpression,
        next_run_at: nextRunAt,
        metadata: {
          type: "digest",
          symbols: symbols ?? [],
          digestUrl,
        },
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error("Schedule error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to schedule" }, { status: 500 });
  }
}
