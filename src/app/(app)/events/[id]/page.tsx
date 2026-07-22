import { notFound } from "next/navigation";
import { getEvent, getEventItemSummary, getInventory } from "@/lib/data/queries";
import { updateEvent } from "@/lib/actions/events";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { EventForm } from "@/components/events/event-form";
import { AllocationManager, type AllocationRow } from "@/components/events/allocation-manager";
import { EventActions } from "@/components/events/event-actions";
import type { InventoryRow } from "@/components/inventory/inventory-item";

export const metadata = { title: "Event" };

const statusVariant = { draft: "secondary", open: "success", closed: "outline" } as const;

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const [items, inventory] = await Promise.all([
    getEventItemSummary(id),
    getInventory(),
  ]);

  const allocations: AllocationRow[] = items.map((i) => ({
    product_id: i.product_id,
    product_name: i.product_name,
    quantity_brought: i.quantity_brought,
    quantity_sold: i.quantity_sold,
    quantity_remaining: i.quantity_remaining,
    effective_price_cents: i.effective_price_cents,
    unit_cost_cents: i.unit_cost_cents,
  }));

  const products = (inventory as InventoryRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    on_hand: r.on_hand,
    default_price_cents: r.default_price_cents,
  }));

  const editable = event.status === "draft";
  const boundUpdate = updateEvent.bind(null, id);

  return (
    <div>
      <PageHeader
        title={event.name}
        description={[event.venue, event.location].filter(Boolean).join(" · ") || undefined}
        action={<Badge variant={statusVariant[event.status]}>{event.status}</Badge>}
      />

      <div className="mb-5">
        <EventActions eventId={id} status={event.status} hasAllocations={allocations.length > 0} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AllocationManager
          eventId={id}
          editable={editable}
          allocations={allocations}
          products={products}
        />

        {editable ? (
          <EventForm
            action={boundUpdate}
            submitLabel="Save event"
            values={{
              name: event.name,
              venue: event.venue,
              location: event.location,
              starts_at: event.starts_at,
              ends_at: event.ends_at,
              notes: event.notes,
              tax_rate_bps: event.tax_rate_bps,
              tax_mode: event.tax_mode,
              default_payment_method: event.default_payment_method,
            }}
          />
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            This event is {event.status}. Allocations are locked. Use Event Mode to sell, or view the
            summary for results.
          </div>
        )}
      </div>
    </div>
  );
}
