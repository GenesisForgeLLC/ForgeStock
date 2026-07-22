"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, Unlock } from "lucide-react";
import { closeEvent, reopenEvent } from "@/lib/actions/events";
import { useSync } from "@/components/pwa/sync-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

export function EventCloseControls({
  eventId,
  status,
}: {
  eventId: string;
  status: "draft" | "open" | "closed";
}) {
  const router = useRouter();
  const { pendingCount } = useSync();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  if (status === "closed") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Unlock className="h-4 w-4" /> Reopen event
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen this event?</DialogTitle>
            <DialogDescription>
              Reopening lets you record more sales. Existing records are preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await reopenEvent(eventId);
                  if (r?.error) toast.error(r.error);
                  else {
                    toast.success("Event reopened");
                    setOpen(false);
                    router.refresh();
                  }
                })
              }
            >
              Reopen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (status !== "open") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Lock className="h-4 w-4" /> Close event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close this event?</DialogTitle>
          <DialogDescription>
            {pendingCount > 0
              ? `${pendingCount} sale(s) are still waiting to sync. Reconnect and let them finish before closing so your totals are complete.`
              : "This finalizes the event summary. Unsold products stay in your on-hand inventory. You can reopen later if needed."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending || pendingCount > 0}
            onClick={() =>
              start(async () => {
                const r = await closeEvent(eventId);
                if (r?.error) toast.error(r.error);
                else {
                  toast.success("Event closed");
                  setOpen(false);
                  router.refresh();
                }
              })
            }
          >
            {pendingCount > 0 ? "Waiting for sync…" : "Close event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
