import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encrypt";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Column-level grant hides access_token from authenticated role — safe to query
  const { data, error } = await supabase
    .from("market_plaid_items")
    .select("id, item_id, institution_name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { item_id } = await request.json();
  if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 });

  // Fetch access_token via service client to call Plaid item/remove
  const serviceClient = createServiceClient();
  const { data: row, error: fetchError } = await serviceClient
    .from("market_plaid_items")
    .select("access_token")
    .eq("item_id", item_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await plaidClient.itemRemove({ access_token: decrypt(row.access_token) });
  } catch {
    // best-effort — proceed with local deletion even if Plaid call fails
  }

  const { error: delError } = await serviceClient
    .from("market_plaid_items")
    .delete()
    .eq("item_id", item_id)
    .eq("user_id", user.id);

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
