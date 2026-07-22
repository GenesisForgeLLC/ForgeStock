import { requireProfile } from "@/lib/auth";
import { createEvent } from "@/lib/actions/events";
import { PageHeader } from "@/components/page-header";
import { EventForm } from "@/components/events/event-form";

export const metadata = { title: "New event" };

export default async function NewEventPage() {
  const { profile } = await requireProfile();
  return (
    <div>
      <PageHeader title="New event" description="Set up a vendor event. Defaults come from your settings." />
      <EventForm
        action={createEvent}
        submitLabel="Create event"
        values={{
          name: "",
          venue: null,
          location: null,
          starts_at: null,
          ends_at: null,
          notes: null,
          tax_rate_bps: profile.default_tax_rate_bps,
          tax_mode: profile.default_tax_mode,
          default_payment_method: profile.default_payment_method,
        }}
      />
    </div>
  );
}
