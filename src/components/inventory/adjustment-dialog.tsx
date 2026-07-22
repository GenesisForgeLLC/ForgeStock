"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { recordAdjustment } from "@/lib/actions/inventory";
import type { ActionState } from "@/lib/actions/util";
import { useActionToast } from "@/components/forms/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPES = [
  { value: "gifted", label: "Gift (−)" },
  { value: "damaged", label: "Mark damaged (−)" },
  { value: "returned", label: "Customer return (+)" },
  { value: "manual_increase", label: "Manual increase (+)" },
  { value: "manual_decrease", label: "Manual decrease (−)" },
] as const;

export function AdjustmentDialog({
  productId,
  productName,
  onHand,
  open,
  onOpenChange,
  initialType = "gifted",
}: {
  productId: string;
  productName: string;
  onHand: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialType?: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState<ActionState, FormData>(recordAdjustment, null);
  const [type, setType] = useState(initialType);
  useActionToast(state, () => {
    onOpenChange(false);
    router.refresh();
  });

  const requiresNote = type === "manual_increase" || type === "manual_decrease";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust inventory</DialogTitle>
          <DialogDescription>
            {productName} — {onHand} on hand. This creates an immutable ledger entry.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="transaction_type" value={type} />
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              defaultValue={1}
              required
              className="tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">
              Note {requiresNote && <span className="text-destructive">*</span>}
            </Label>
            <Textarea id="note" name="note" rows={2} required={requiresNote} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton>Apply</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
