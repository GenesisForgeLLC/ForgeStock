"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Search, ShoppingCart, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { uuid } from "@/lib/utils";
import type { CreateSaleInput } from "@/lib/validation";
import {
  recordSaleLocalFirst,
  voidSaleRemote,
  cancelQueuedSale,
  SaleValidationError,
} from "@/lib/offline/event-sales";
import { useSync } from "@/components/pwa/sync-provider";
import { SyncIndicator } from "@/components/pwa/sync-indicator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { CustomSaleSheet, type CustomSalePayload } from "./custom-sale-sheet";
import { CartSheet, type CartCompletePayload } from "./cart-sheet";
import type { EventModeProduct, EventModeSettings } from "./types";

export function EventMode({
  settings,
  initialProducts,
}: {
  settings: EventModeSettings;
  initialProducts: EventModeProduct[];
}) {
  const { refreshPending } = useSync();
  const [remaining, setRemaining] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialProducts.map((p) => [p.product_id, p.quantity_remaining])),
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [customProduct, setCustomProduct] = useState<EventModeProduct | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    initialProducts.forEach((p) => p.category_name && set.add(p.category_name));
    return Array.from(set).sort();
  }, [initialProducts]);

  const products = useMemo(
    () => initialProducts.map((p) => ({ ...p, quantity_remaining: remaining[p.product_id] ?? 0 })),
    [initialProducts, remaining],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => (category === "all" ? true : p.category_name === category))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q) : true))
      .sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [products, search, category]);

  function adjustRemaining(delta: Record<string, number>) {
    setRemaining((prev) => {
      const next = { ...prev };
      for (const [id, d] of Object.entries(delta)) next[id] = Math.max(0, (next[id] ?? 0) + d);
      return next;
    });
  }

  function buildPayload(
    lines: CreateSaleInput["lines"],
    opts: { discountBps?: number; discountFixedCents?: number; paymentMethod: string; notes?: string | null },
  ): CreateSaleInput {
    return {
      event_id: settings.eventId,
      idempotency_key: uuid(),
      lines,
      discount_bps: opts.discountBps ?? 0,
      discount_fixed_cents: opts.discountFixedCents ?? 0,
      tax_rate_bps: settings.taxRateBps,
      tax_mode: settings.taxMode,
      payment_method: opts.paymentMethod as CreateSaleInput["payment_method"],
      notes: opts.notes ?? null,
      sold_at: new Date().toISOString(),
    };
  }

  async function submit(payload: CreateSaleInput, undoDelta: Record<string, number>, label: string) {
    try {
      const result = await recordSaleLocalFirst(payload, {
        userId: settings.userId,
        eventId: settings.eventId,
      });
      await refreshPending();

      const undo = async () => {
        try {
          if (result.status === "synced" && result.saleId) {
            await voidSaleRemote(result.saleId);
          } else {
            await cancelQueuedSale(payload.idempotency_key);
          }
          adjustRemaining(undoDelta); // restore units
          await refreshPending();
          toast.success("Sale undone");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not undo");
        }
      };

      if (result.status === "queued") {
        toast.message(`${label} — queued (will sync)`, {
          action: { label: "Undo", onClick: () => void undo() },
          duration: 6000,
        });
      } else {
        toast.success(label, {
          action: { label: "Undo", onClick: () => void undo() },
          duration: 6000,
        });
      }
    } catch (err) {
      // Permanent rejection — roll back the optimistic decrement.
      adjustRemaining(undoDelta);
      await refreshPending();
      toast.error(err instanceof SaleValidationError ? err.message : "The sale was rejected");
    }
  }

  async function quickSell(product: EventModeProduct) {
    if ((remaining[product.product_id] ?? 0) <= 0) return;
    setBusyId(product.product_id);
    adjustRemaining({ [product.product_id]: -1 });
    const payload = buildPayload(
      [
        {
          product_id: product.product_id,
          quantity: 1,
          list_unit_price_cents: product.price_cents,
          sold_unit_price_cents: product.price_cents,
        },
      ],
      { paymentMethod: settings.defaultPaymentMethod },
    );
    await submit(payload, { [product.product_id]: 1 }, `Sold ${product.name}`);
    setBusyId(null);
  }

  async function customSell(product: EventModeProduct, p: CustomSalePayload) {
    setCustomOpen(false);
    adjustRemaining({ [product.product_id]: -p.quantity });
    const payload = buildPayload(
      [
        {
          product_id: product.product_id,
          quantity: p.quantity,
          list_unit_price_cents: product.price_cents,
          sold_unit_price_cents: p.soldUnitPriceCents,
        },
      ],
      {
        discountBps: p.discountBps,
        discountFixedCents: p.discountFixedCents,
        paymentMethod: p.paymentMethod,
        notes: p.note,
      },
    );
    await submit(payload, { [product.product_id]: p.quantity }, `Sold ${p.quantity}× ${product.name}`);
  }

  async function cartComplete(p: CartCompletePayload) {
    setCartOpen(false);
    const undoDelta: Record<string, number> = {};
    const decDelta: Record<string, number> = {};
    for (const l of p.lines) {
      undoDelta[l.product_id] = (undoDelta[l.product_id] ?? 0) + l.quantity;
      decDelta[l.product_id] = (decDelta[l.product_id] ?? 0) - l.quantity;
    }
    adjustRemaining(decDelta);
    const payload = buildPayload(
      p.lines.map((l) => ({
        product_id: l.product_id,
        quantity: l.quantity,
        list_unit_price_cents: l.list_unit_price_cents,
        sold_unit_price_cents: l.sold_unit_price_cents,
      })),
      {
        discountBps: p.discountBps,
        discountFixedCents: p.discountFixedCents,
        paymentMethod: p.paymentMethod,
      },
    );
    const count = p.lines.reduce((s, l) => s + l.quantity, 0);
    await submit(payload, undoDelta, `Sold ${count} items`);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Header */}
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-2">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href={`/events/${settings.eventId}`} aria-label="Exit event mode">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{settings.eventName}</p>
          </div>
          <SyncIndicator />
          <Button
            variant="secondary"
            size="icon"
            className="relative shrink-0"
            onClick={() => setCartOpen(true)}
            aria-label="Open cart"
          >
            <ShoppingCart className="h-5 w-5" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href={`/events/${settings.eventId}/summary`} aria-label="Event summary">
              <BarChart3 className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="pl-9"
              aria-label="Search products"
            />
          </div>
          {categories.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              <CategoryChip active={category === "all"} onClick={() => setCategory("all")}>
                All
              </CategoryChip>
              {categories.map((c) => (
                <CategoryChip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </CategoryChip>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Product grid */}
      <main className="flex-1 px-3 py-3">
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No products match.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map((p) => (
              <ProductCard
                key={p.product_id}
                product={p}
                settings={settings}
                busy={busyId === p.product_id}
                onQuickSell={() => void quickSell(p)}
                onCustom={() => {
                  setCustomProduct(p);
                  setCustomOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </main>

      <CustomSaleSheet
        product={customProduct}
        settings={settings}
        open={customOpen}
        onOpenChange={setCustomOpen}
        onConfirm={(payload) => customProduct && void customSell(customProduct, payload)}
      />
      <CartSheet
        products={products}
        settings={settings}
        open={cartOpen}
        onOpenChange={setCartOpen}
        onComplete={(payload) => void cartComplete(payload)}
      />
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
