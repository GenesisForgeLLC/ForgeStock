import Link from "next/link";
import { Store, Plus, CalendarClock } from "lucide-react";
import { getEvents } from "@/lib/data/queries";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EventDate } from "@/components/events/event-date";

export const metadata = { title: "Events" };

const statusVariant = {
  draft: "secondary",
  open: "success",
  closed: "outline",
} as const;

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div>
      <PageHeader
        title="Events"
        description="Vendor markets and shows."
        action={
          <Button asChild size="sm">
            <Link href="/events/new">
              <Plus className="h-4 w-4" /> New event
            </Link>
          </Button>
        }
      />

      {events.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No events yet"
          description="Create an event, allocate inventory, then open Event Mode to sell."
          action={
            <Button asChild>
              <Link href="/events/new">
                <Plus className="h-4 w-4" /> New event
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id}>
              <Link
                href={e.status === "open" ? `/events/${e.id}/mode` : `/events/${e.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{e.name}</span>
                    <Badge variant={statusVariant[e.status]}>{e.status}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[e.venue, e.location].filter(Boolean).join(" · ") || "No venue set"}
                    {e.starts_at && (
                      <>
                        {" · "}
                        <EventDate value={e.starts_at} />
                      </>
                    )}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
