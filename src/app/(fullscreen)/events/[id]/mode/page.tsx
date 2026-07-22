import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getEvent, getEventItemSummary, getProducts } from "@/lib/data/queries";
import { getSignedImageUrls } from "@/lib/storage";
import { EventMode } from "@/components/events/mode/event-mode";
import type { EventModeProduct } from "@/components/events/mode/types";

export const metadata = { title: "Event Mode" };

export default async function EventModePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, profile } = await requireProfile();
  const event = await getEvent(id);
  if (!event) notFound();
  if (event.status !== "open") redirect(`/events/${id}`);

  const [items, products] = await Promise.all([getEventItemSummary(id), getProducts()]);
  const favoriteMap = new Map(products.map((p) => [p.id, p.is_favorite]));
  const categoryMap = new Map(
    products.map((p) => [p.id, (p.categories as unknown as { name: string } | null)?.name ?? null]),
  );
  const urls = await getSignedImageUrls(items.map((i) => i.image_path));

  const modeProducts: EventModeProduct[] = items.map((i) => ({
    product_id: i.product_id,
    name: i.product_name,
    sku: i.sku,
    image_url: i.image_path ? urls[i.image_path] ?? null : null,
    category_name: categoryMap.get(i.product_id) ?? null,
    price_cents: i.effective_price_cents,
    unit_cost_cents: i.unit_cost_cents,
    quantity_remaining: i.quantity_remaining,
    is_favorite: favoriteMap.get(i.product_id) ?? false,
  }));

  return (
    <EventMode
      settings={{
        eventId: id,
        eventName: event.name,
        taxRateBps: event.tax_rate_bps,
        taxMode: event.tax_mode,
        defaultPaymentMethod: event.default_payment_method,
        currency: profile?.currency ?? "USD",
        userId: user.id,
      }}
      initialProducts={modeProducts}
    />
  );
}
