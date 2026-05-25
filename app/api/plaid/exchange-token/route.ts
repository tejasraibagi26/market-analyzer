import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encrypt";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { public_token, institution_name } = await request.json();

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchangeResponse.data;

    // Service client required: access_token column is hidden from authenticated role
    const serviceClient = createServiceClient();
    const { error: dbError } = await serviceClient
      .from("market_plaid_items")
      .upsert(
        {
          user_id: user.id,
          item_id,
          access_token: encrypt(access_token),
          institution_name: institution_name ?? "Unknown",
        },
        { onConflict: "item_id" }
      );

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to exchange token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
