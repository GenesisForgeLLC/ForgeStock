"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { setProductArchived } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";

export function ProductArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setProductArchived(id, !archived);
          toast.success(archived ? "Product restored" : "Product archived");
        })
      }
    >
      {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
      {archived ? "Restore" : "Archive"}
    </Button>
  );
}
