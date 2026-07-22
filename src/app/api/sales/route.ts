import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSaleSchema } from "@/lib/validation";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Create a sale. Used by online Event Mode AND by the offline sync engine.
 * The underlying DB function is idempotent on idempotency_key, so retries and
 * refreshes never create duplicate sales.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid sale" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc("create_sale", {
    payload: parsed.data as unknown as Json,
  });

  if (error) {
    // Business-rule violations (stock, event closed, ownership) are client errors.
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, result: data }, { status: 200 });
}
