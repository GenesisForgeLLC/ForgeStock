import { createClient } from "@/lib/supabase/server";

/**
 * Compute the start-of-day and start-of-month (as UTC instants) for "now"
 * interpreted in the given IANA timezone.
 */
function boundaries(timezone: string) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "01";
  const y = get("year");
  const m = get("month");
  const d = get("day");
  // Midnight local -> approximate UTC instant (good enough for reporting buckets).
  const startOfDay = new Date(`${y}-${m}-${d}T00:00:00`);
  const startOfMonth = new Date(`${y}-${m}-01T00:00:00`);
  return { startOfDay, startOfMonth };
}

export async function getDashboardData(timezone: string) {
  const supabase = await createClient();
  const { startOfDay, startOfMonth } = boundaries(timezone);

  const [{ data: inventory }, { data: monthSales }, { data: activeEvent }] = await Promise.all([
    supabase.from("v_product_inventory").select("*").eq("is_archived", false),
    supabase
      .from("sales")
      .select("total_cents, tax_cents, sold_at, status")
      .eq("status", "completed")
      .gte("sold_at", startOfMonth.toISOString()),
    supabase
      .from("events")
      .select("*")
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const inv = inventory ?? [];
  const unitsOnHand = inv.reduce((s, r) => s + r.on_hand, 0);
  const activeProducts = inv.length;
  const lowStock = inv.filter((r) => r.is_low_stock && r.on_hand > 0).length;
  const inventoryCost = inv.reduce((s, r) => s + r.inventory_value_cents, 0);
  const retailValue = inv.reduce((s, r) => s + r.retail_value_cents, 0);

  const sales = monthSales ?? [];
  const monthTotal = sales.reduce((s, r) => s + r.total_cents, 0);
  const monthTax = sales.reduce((s, r) => s + r.tax_cents, 0);
  const todayTotal = sales
    .filter((r) => new Date(r.sold_at) >= startOfDay)
    .reduce((s, r) => s + r.total_cents, 0);

  return {
    unitsOnHand,
    activeProducts,
    lowStock,
    inventoryCost,
    retailValue,
    monthTotal,
    monthTax,
    todayTotal,
    activeEvent,
  };
}
