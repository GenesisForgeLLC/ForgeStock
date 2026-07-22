"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Minus, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EventModeProduct, EventModeSettings } from "./types";

export interface CustomSalePayload {
  quantity: number;
  soldUnitPriceCents: number;
  paymentMethod: string;
  discountBps: number;
  discountFixedCents: number;
  note: string | null;
}

export function CustomSaleSheet({
  product,
  settings,
  open,
  onOpenChange,
  onConfirm,
}: {
  product: EventModeProduct | null;
  settings: EventModeSettings;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (p: CustomSalePayload) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState<number | null>(product?.price_cents ?? 0);
  const [payment, setPayment] = useState(settings.defaultPaymentMethod);
  const [discountPct, setDiscountPct] = useState("");
  const [discountFixed, setDiscountFixed] = useState<number | null>(null);
  const [note, setNote] = useState("");

  // Reset when a new product opens the sheet.
  const key = product?.product_id ?? "none";
  useMemo(() => {
    setQuantity(1);
    setPrice(product?.price_cents ?? 0);
    setPayment(settings.defaultPaymentMethod);
    setDiscountPct("");
    setDiscountFixed(null);
    setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const discountBps = parsePercentToBps(discountPct) ?? 0;

  const totals = useMemo(() => {
    if (!product) return null;
    return computeSale(
      [
        {
          quantity,
          listUnitPriceCents: product.price_cents,
          soldUnitPriceCents: price ?? 0,
          unitCostCents: product.unit_cost_cents,
        },
      ],
      { discountBps, discountFixedCents: discountFixed ?? 0 },
      settings.taxRateBps,
      settings.taxMode,
    );
  }, [product, quantity, price, discountBps, discountFixed, settings]);

  if (!product) return null;

  const maxQty = product.quantity_remaining;
  const effectiveUnit = quantity > 0 && totals ? Math.round((totals.subtotalCents - totals.discountCents) / quantity) : price ?? 0;
  const belowCost = effectiveUnit < product.unit_cost_cents;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{product.name}</SheetTitle>
          <SheetDescription>
            {product.quantity_remaining} remaining · list {formatCents(product.price_cents, settings.currency)}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label>Quantity</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center text-lg font-bold tabular-nums">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <Label>Price each</Label>
              <MoneyInput valueCents={price} onValueChange={setPrice} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="disc-pct">Discount %</Label>
              <Input
                id="disc-pct"
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

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {belowCost && (
            <div className="flex items-start gap-2 rounded-md bg-amber-500/15 px-3 py-2 text-sm text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Selling below estimated cost ({formatCents(product.unit_cost_cents, settings.currency)}).
                Allowed for haggling — just confirming you meant to.
              </span>
            </div>
          )}

          {totals && (
            <dl className="space-y-1 rounded-md border border-border p-3 text-sm">
              <Row label="Subtotal" value={formatCents(totals.subtotalCents, settings.currency)} />
              {totals.discountCents > 0 && (
                <Row label="Discount" value={`−${formatCents(totals.discountCents, settings.currency)}`} />
              )}
              <Row label="Tax" value={formatCents(totals.taxCents, settings.currency)} />
              <Row label="Total" value={formatCents(totals.totalCents, settings.currency)} bold />
            </dl>
          )}

          <Button
            size="xl"
            className="w-full"
            disabled={quantity < 1 || quantity > maxQty}
            onClick={() =>
              onConfirm({
                quantity,
                soldUnitPriceCents: price ?? 0,
                paymentMethod: payment,
                discountBps,
                discountFixedCents: discountFixed ?? 0,
                note: note.trim() || null,
              })
            }
          >
            Record sale · {totals ? formatCents(totals.totalCents, settings.currency) : ""}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</dt>
      <dd className={`tabular-nums ${bold ? "font-bold" : ""}`}>{value}</dd>
    </div>
  );
}
