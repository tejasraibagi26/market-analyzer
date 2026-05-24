import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const ALERT_CRON = "*/15 13-21 * * 1-5"; // every 15min Mon-Fri, 9am-5pm ET (UTC)
const ALERT_TYPE = "alert";

function computeNextRun(cronExpression: string): string | null {
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

    if (dow !== "*") {
      const targetDays = dow.includes("-")
        ? Array.from(
            { length: Number(dow.split("-")[1]) - Number(dow.split("-")[0]) + 1 },
            (_, i) => Number(dow.split("-")[0]) + i
          )
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

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const admin = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Idempotent: skip if an active alert job already exists for this user
  const { data: existing } = await admin
    .from("email_jobs")
    .select("id")
    .eq("recipient", user.email)
    .eq("status", "active")
    .contains("metadata", { type: ALERT_TYPE })
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, alreadyScheduled: true });
  }

  const alertUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://market-analyzer-ruby.vercel.app"}/api/alerts/check`;
  const nextRunAt = computeNextRun(ALERT_CRON);

  const { data: job, error } = await admin
    .from("email_jobs")
    .insert({
      name: "Market Analytics Price Alerts",
      app_name: "Market Analytics",
      recipient: user.email,
      subject: "Price Alert Check",
      cron_expression: ALERT_CRON,
      next_run_at: nextRunAt,
      metadata: {
        type: ALERT_TYPE,
        userId: user.id,
        callbackUrl: alertUrl,
      },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, job });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const admin = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  await admin
    .from("email_jobs")
    .update({ status: "completed" })
    .eq("recipient", user.email)
    .eq("status", "active")
    .contains("metadata", { type: ALERT_TYPE });

  return NextResponse.json({ ok: true });
}
