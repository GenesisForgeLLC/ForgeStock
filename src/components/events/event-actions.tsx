"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Play, Store, BarChart3 } from "lucide-react";
import { openEvent } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";

export function EventActions({
  eventId,
  status,
  hasAllocations,
}: {
  eventId: string;
  status: "draft" | "open" | "closed";
  hasAllocations: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (status === "open") {
    return (
      <div className="flex gap-2">
        <Button asChild size="lg" className="flex-1">
          <Link href={`/events/${eventId}/mode`}>
            <Store className="h-4 w-4" /> Enter Event Mode
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={`/events/${eventId}/summary`}>
            <BarChart3 className="h-4 w-4" /> Summary
          </Link>
        </Button>
      </div>
    );
  }

  if (status === "closed") {
    return (
      <Button asChild size="lg" variant="outline" className="w-full">
        <Link href={`/events/${eventId}/summary`}>
          <BarChart3 className="h-4 w-4" /> View summary
        </Link>
      </Button>
    );
  }

  // draft
  return (
    <Button
      size="lg"
      className="w-full"
      disabled={pending || !hasAllocations}
      onClick={() =>
        start(async () => {
          const r = await openEvent(eventId);
          if (r?.error) toast.error(r.error);
          else {
            toast.success("Event opened");
            router.push(`/events/${eventId}/mode`);
          }
        })
      }
    >
      <Play className="h-4 w-4" />
      {hasAllocations ? "Open event & start selling" : "Allocate products first"}
    </Button>
  );
}
