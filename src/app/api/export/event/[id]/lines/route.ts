import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, centsToCsv, csvResponse } from "@/lib/csv";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Sales for this event, with their line items and product names.
  const { data: sales } = await supabase
    .from("sales")
    .select("id, sold_at, status, payment_method, sale_items(quantity, sold_unit_price_cents, list_unit_price_cents, line_subtotal_cents, line_discount_cents, unit_cost_cents_snapshot, cogs_cents, products(name, sku))")
    .eq("event_id", id)
    .order("sold_at", { ascending: false });

  const rows: (string | number | null)[][] = [];
  for (const s of sales ?? []) {
    const lines = (s.sale_items as unknown as Array<{
      quantity: number;
      sold_unit_price_cents: number;
      list_unit_price_cents: number;
      line_subtotal_cents: number;
      line_discount_cents: number;
      unit_cost_cents_snapshot: number;
      cogs_cents: number;
      products: { name: string; sku: string | null } | null;
    }>) ?? [];
    for (const l of lines) {
      rows.push([
        s.sold_at,
        s.status,
        s.payment_method,
        l.products?.name ?? "",
        l.products?.sku ?? "",
        l.quantity,
        centsToCsv(l.list_unit_price_cents),
        centsToCsv(l.sold_unit_price_cents),
        centsToCsv(l.line_subtotal_cents),
        centsToCsv(l.line_discount_cents),
        centsToCsv(l.unit_cost_cents_snapshot),
        centsToCsv(l.cogs_cents),
      ]);
    }
  }

  const csv = toCsv(
    ["Sold at", "Status", "Payment", "Product", "SKU", "Qty", "List price", "Sold price", "Line subtotal", "Line discount", "Unit cost", "COGS"],
    rows,
  );
  return csvResponse(`forgestock-event-${id}-lines.csv`, csv);
}
