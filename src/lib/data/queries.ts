import { createClient } from "@/lib/supabase/server";

/** Product inventory rows (from the security-invoker view), active first. */
export async function getInventory(includeArchived = false) {
  const supabase = await createClient();
  let query = supabase.from("v_product_inventory").select("*");
  if (!includeArchived) query = query.eq("is_archived", false);
  const { data, error } = await query.order("is_favorite", { ascending: false }).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getProducts(includeArchived = false) {
  const supabase = await createClient();
  let query = supabase.from("products").select("*, categories(name)");
  if (!includeArchived) query = query.eq("is_archived", false);
  const { data, error } = await query.order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getProduct(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCategories(includeArchived = false) {
  const supabase = await createClient();
  let query = supabase.from("categories").select("*");
  if (!includeArchived) query = query.eq("is_archived", false);
  const { data, error } = await query.order("sort_order").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getEvent(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getActiveEvent() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getEventItemSummary(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_event_item_summary")
    .select("*")
    .eq("event_id", eventId)
    .order("product_name");
  if (error) throw error;
  return data ?? [];
}

export async function getEventFinancials(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_event_financials")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getEventPaymentBreakdown(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_event_payment_breakdown")
    .select("*")
    .eq("event_id", eventId);
  if (error) throw error;
  return data ?? [];
}

export async function getRecentLedger(limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_ledger")
    .select("*, products(name, sku)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getRecentSales(limit = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*, events(name)")
    .order("sold_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
