import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGO = "aes-256-cbc";

function getEncKey(): Buffer {
  const secret = process.env.SETTINGS_ENCRYPTION_SECRET;
  if (!secret) throw new Error("SETTINGS_ENCRYPTION_SECRET not set");
  // Derive a 32-byte key from the secret
  return createHash("sha256").update(secret).digest();
}

function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, getEncKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGO, getEncKey(), iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("market_user_settings")
    .select("anthropic_key_enc, analysis_mode, digest_prefs")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let anthropicKey = "";
  if (data?.anthropic_key_enc) {
    try { anthropicKey = decrypt(data.anthropic_key_enc); } catch {}
  }

  return NextResponse.json({
    anthropicKey,
    analysisMode: data?.analysis_mode ?? "rule-based",
    digestPrefs: data?.digest_prefs ?? null,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const updates: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (typeof body.anthropicKey === "string") {
    updates.anthropic_key_enc = body.anthropicKey ? encrypt(body.anthropicKey) : null;
  }
  if (typeof body.analysisMode === "string") {
    updates.analysis_mode = body.analysisMode;
  }
  if ("digestPrefs" in body) {
    updates.digest_prefs = body.digestPrefs ?? null;
  }

  const { error } = await supabase
    .from("market_user_settings")
    .upsert(updates, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
