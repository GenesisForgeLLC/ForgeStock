"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Package } from "lucide-react";
import { upsertEventItem, removeEventItem } from "@/lib/actions/events";
import type { ActionState } from "@/lib/actions/util";
import { useActionToast } from "@/components/forms/use-action-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { MoneyInput } from "@/components/ui/money-input";
import { MoneyText } from "@/components/money-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductOpt {
  id: string;
  name: string;
  on_hand: number;
  default_price_cents: number;
}

export interface AllocationRow {
  product_id: string;
  product_name: string;
  quantity_brought: number;
  quantity_sold: number;
  quantity_remaining: number;
  effective_price_cents: number;
  unit_cost_cents: number;
}

export function AllocationManager({
  eventId,
  editable,
  allocations,
  products,
}: {
  eventId: string;
  editable: boolean;
  allocations: AllocationRow[];
  products: ProductOpt[];
}) {
  const router = useRouter();
  const boundAction = upsertEventItem.bind(null, eventId);
  const [state, action] = useActionState<ActionState, FormData>(boundAction, null);
  useActionToast(state, () => router.refresh());

  const allocatedIds = new Set(allocations.map((a) => a.product_id));
  const available = products.filter((p) => !allocatedIds.has(p.id));

  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState<number | null>(null);

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allocated products</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {allocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing allocated yet. Add products and the quantity you&apos;re bringing.
          </p>
        ) : (
          <ul className="space-y-2">
            {allocations.map((a) => (
              <li
                key={a.product_id}
                className="flex items-center gap-3 rounded-md border border-border p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                  <Package className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    <MoneyText cents={a.effective_price_cents} /> · cost{" "}
                    <MoneyText cents={a.unit_cost_cents} />
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {a.quantity_remaining}/{a.quantity_brought}
                  </p>
                  <p className="text-[11px] text-muted-foreground">remaining/brought</p>
                </div>
                {editable && (
                  <form
                    action={async () => {
                      await removeEventItem(eventId, a.product_id);
                      router.refresh();
                    }}
                  >
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${a.product_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {editable && available.length > 0 && (
          <form action={action} className="space-y-3 rounded-md border border-dashed border-border p-3">
            <input type="hidden" name="product_id" value={productId} />
            <input type="hidden" name="event_price_cents" value={price ?? ""} />
            <div className="space-y-2">
              <Label>Add product</Label>
              <Select
                value={productId}
                onValueChange={(v) => {
                  setProductId(v);
                  const p = products.find((x) => x.id === v);
                  setPrice(p?.default_price_cents ?? null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.on_hand} on hand)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantity_brought">Qty to bring</Label>
                <Input
                  id="quantity_brought"
                  name="quantity_brought"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={selectedProduct?.on_hand ?? undefined}
                  defaultValue={1}
                  className="tabular-nums"
                />
                {selectedProduct && (
                  <p className="text-xs text-muted-foreground">{selectedProduct.on_hand} available</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Event price</Label>
                <MoneyInput valueCents={price} onValueChange={setPrice} />
              </div>
            </div>
            <SubmitButton variant="secondary" disabled={!productId} className="w-full">
              <Plus className="h-4 w-4" /> Add allocation
            </SubmitButton>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
