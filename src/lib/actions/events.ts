"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActionContext, num, str, type ActionState, toMessage } from "./util";
import { eventSchema } from "@/lib/validation";

function parseEvent(fd: FormData) {
  return eventSchema.safeParse({
    name: str(fd, "name") ?? "",
    venue: str(fd, "venue"),
    location: str(fd, "location"),
    starts_at: str(fd, "starts_at"),
    ends_at: str(fd, "ends_at"),
    notes: str(fd, "notes"),
    tax_rate_bps: num(fd, "tax_rate_bps"),
    tax_mode: str(fd, "tax_mode") ?? "add_on",
    default_payment_method: str(fd, "default_payment_method") ?? "cash",
  });
}

export async function createEvent(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id: string | null = null;
  try {
    const { supabase, user } = await getActionContext();
    const parsed = parseEvent(fd);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid event" };

    const { data, error } = await supabase
      .from("events")
      .insert({ user_id: user.id, status: "draft", ...parsed.data })
      .select("id")
      .single();
    if (error) return { error: toMessage(error) };
    id = data.id;
    revalidatePath("/events");
  } catch (err) {
    return { error: toMessage(err) };
  }
  if (id) redirect(`/events/${id}`);
  return { ok: true };
}

export async function updateEvent(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { supabase, user } = await getActionContext();
    const parsed = parseEvent(fd);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid event" };
    const { error } = await supabase
      .from("events")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: toMessage(error) };
    revalidatePath(`/events/${id}`);
    return { ok: true, message: "Event saved" };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

/** Add or update an allocation (quantity brought + optional event price). */
export async function upsertEventItem(
  eventId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await getActionContext();
    const productId = str(fd, "product_id");
    if (!productId) return { error: "Choose a product" };
    const quantity = num(fd, "quantity_brought");
    const priceRaw = fd.get("event_price_cents");
    const eventPrice = priceRaw === null || priceRaw === "" ? null : Number(priceRaw);

    const { error } = await supabase
      .from("event_items")
      .upsert(
        {
          user_id: user.id,
          event_id: eventId,
          product_id: productId,
          quantity_brought: quantity,
          event_price_cents: eventPrice,
        },
        { onConflict: "event_id,product_id" },
      );
    if (error) return { error: toMessage(error) };
    revalidatePath(`/events/${eventId}`);
    return { ok: true, message: "Allocation saved" };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

export async function removeEventItem(eventId: string, productId: string): Promise<void> {
  const { supabase, user } = await getActionContext();
  await supabase
    .from("event_items")
    .delete()
    .eq("event_id", eventId)
    .eq("product_id", productId)
    .eq("user_id", user.id);
  revalidatePath(`/events/${eventId}`);
}

export async function openEvent(eventId: string): Promise<ActionState> {
  try {
    const { supabase } = await getActionContext();
    const { error } = await supabase.rpc("open_event", { p_event_id: eventId });
    if (error) return { error: toMessage(error) };
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/dashboard");
    return { ok: true, message: "Event opened" };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

export async function closeEvent(eventId: string): Promise<ActionState> {
  try {
    const { supabase } = await getActionContext();
    const { error } = await supabase.rpc("close_event", { p_event_id: eventId });
    if (error) return { error: toMessage(error) };
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/summary`);
    revalidatePath("/events");
    revalidatePath("/dashboard");
    return { ok: true, message: "Event closed" };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

export async function reopenEvent(eventId: string): Promise<ActionState> {
  try {
    const { supabase } = await getActionContext();
    const { error } = await supabase.rpc("reopen_event", { p_event_id: eventId });
    if (error) return { error: toMessage(error) };
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    return { ok: true, message: "Event reopened" };
  } catch (err) {
    return { error: toMessage(err) };
  }
}
