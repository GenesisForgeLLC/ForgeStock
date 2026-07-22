import { createClient } from "@/lib/supabase/server";
import { toCsv, centsToCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data } = await supabase
    .from("sales")
    .select("*, events(name)")
    .order("sold_at", { ascending: false });

  const rows = (data ?? []).map((s) => [
    s.sold_at,
    (s.events as unknown as { name: string } | null)?.name ?? "",
    s.status,
    s.payment_method,
    centsToCsv(s.subtotal_cents),
    centsToCsv(s.discount_cents),
    centsToCsv(s.tax_cents),
    centsToCsv(s.total_cents),
    s.tax_rate_bps,
    s.tax_mode,
  ]);

  const csv = toCsv(
    ["Sold at", "Event", "Status", "Payment", "Subtotal", "Discount", "Tax", "Total", "Tax bps", "Tax mode"],
    rows,
  );
  return csvResponse("forgestock-sales.csv", csv);
}
