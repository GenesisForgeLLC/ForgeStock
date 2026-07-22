"use client";

import { useMemo, useState } from "react";
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { computeSale } from "@/lib/calc";
import { formatCents, parsePercentToBps } from "@/lib/money";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/config/app";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EventModeProduct, EventModeSettings, CartLine } from "./types";

export interface CartCompletePayload {
  lines: CartLine[];
  discountBps: number;
  discountFixedCents: number;
  paymentMethod: string;
}

export function CartSheet({
  products,
  settings,
  open,
  onOpenChange,
  onComplete,
}: {
  products: EventModeProduct[];
  settings: EventModeSettings;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onComplete: (p: CartCompletePayload) => void;
}) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [addId, setAddId] = useState("");
  const [discountPct, setDiscountPct] = useState("");
  const [discountFixed, setDiscountFixed] = useState<number | null>(null);
  const [payment, setPayment] = useState(settings.defaultPaymentMethod);

  const available = products.filter((p) => p.quantity_remaining > 0);
  const discountBps = parsePercentToBps(discountPct) ?? 0;

  function addLine(id: string) {
    const p = products.find((x) => x.product_id === id);
    if (!p) return;
    setLines((prev) => {
      const existing = prev.find((l) => l.product_id === id);
      if (existing) {
        return prev.map((l) =>
          l.product_id === id ? { ...l, quantity: Math.min(p.quantity_remaining, l.quantity + 1) } : l,
        );
      }
      return [
        ...prev,
        {
          product_id: p.product_id,
          name: p.name,
          quantity: 1,
          sold_unit_price_cents: p.price_cents,
          list_unit_price_cents: p.price_cents,
          unit_cost_cents: p.unit_cost_cents,
        },
      ];
    });
    setAddId("");
  }

  function updateLine(id: string, patch: Partial<CartLine>) {
    setLines((prev) => prev.map((l) => (l.product_id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.product_id !== id));
  }

  const totals = useMemo(
    () =>
      computeSale(
        lines.map((l) => ({
          quantity: l.quantity,
          listUnitPriceCents: l.list_unit_price_cents,
          soldUnitPriceCents: l.sold_unit_price_cents,
          unitCostCents: l.unit_cost_cents,
        })),
        { discountBps, discountFixedCents: discountFixed ?? 0 },
        settings.taxRateBps,
        settings.taxMode,
      ),
    [lines, discountBps, discountFixed, settings],
  );

  function reset() {
    setLines([]);
    setDiscountPct("");
    setDiscountFixed(null);
    setPayment(settings.defaultPaymentMethod);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Cart</SheetTitle>
          <SheetDescription>Build a multi-item sale with one shared discount.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Add product</Label>
            <Select value={addId} onValueChange={addLine}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent>
                {available.map((p) => (
                  <SelectItem key={p.product_id} value={p.product_id}>
                    {p.name} ({p.quantity_remaining} left)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-6 text-muted-foreground">
              <ShoppingCart className="h-6 w-6" />
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {lines.map((l) => {
                const max = products.find((p) => p.product_id === l.product_id)?.quantity_remaining ?? l.quantity;
                return (
                  <li key={l.product_id} className="rounded-md border border-border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.name}</span>
                      <button
                        type="button"
                        onClick={() => removeLine(l.product_id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${l.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => updateLine(l.product_id, { quantity: Math.max(1, l.quantity - 1) })}
                        aria-label="Decrease"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-bold tabular-nums">{l.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => updateLine(l.product_id, { quantity: Math.min(max, l.quantity + 1) })}
                        aria-label="Increase"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <div className="flex-1">
                        <MoneyInput
                          valueCents={l.sold_unit_price_cents}
                          onValueChange={(c) => updateLine(l.product_id, { sold_unit_price_cents: c ?? 0 })}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cart-disc-pct">Discount %</Label>
              <Input
                id="cart-disc-pct"
                inputMode="decimal"
                placeholder="0"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                className="tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label>Discount $</Label>
              <MoneyInput valueCents={discountFixed} onValueChange={setDiscountFixed} placeholder="0.00" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <dl className="space-y-1 rounded-md border border-border p-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatCents(totals.subtotalCents, settings.currency)}</dd>
            </div>
            {totals.discountCents > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="tabular-nums">−{formatCents(totals.discountCents, settings.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="tabular-nums">{formatCents(totals.taxCents, settings.currency)}</dd>
            </div>
            <div className="flex justify-between font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatCents(totals.totalCents, settings.currency)}</dd>
            </div>
          </dl>

          <Button
            size="xl"
            className="w-full"
            disabled={lines.length === 0}
            onClick={() => {
              onComplete({
                lines,
                discountBps,
                discountFixedCents: discountFixed ?? 0,
                paymentMethod: payment,
              });
              reset();
            }}
          >
            Complete sale · {formatCents(totals.totalCents, settings.currency)}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
