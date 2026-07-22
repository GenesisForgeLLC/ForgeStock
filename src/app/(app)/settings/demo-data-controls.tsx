"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FlaskConical, Trash2 } from "lucide-react";
import { seedDemoData, deleteDemoData } from "@/lib/actions/demo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function DemoDataControls() {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo data</CardTitle>
        <CardDescription>
          Optional sample products, inventory, and an event so you can explore the app. Clearly
          labelled and safe to remove — it never mixes with your real records.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await seedDemoData();
              if (r?.error) toast.error(r.error);
              else toast.success(r?.message ?? "Demo data added");
            })
          }
        >
          <FlaskConical className="h-4 w-4" /> Add demo data
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Trash2 className="h-4 w-4" /> Delete demo data
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete demo data?</DialogTitle>
              <DialogDescription>
                This removes all products tagged “ForgeStock Demo” and their demo transactions. Your
                real products and sales are untouched.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await deleteDemoData();
                    if (r?.error) toast.error(r.error);
                    else {
                      toast.success(r?.message ?? "Demo data removed");
                      setOpen(false);
                    }
                  })
                }
              >
                Delete demo data
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
