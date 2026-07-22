/**
 * Centralized business calculations: production cost, tax, discounts, inventory.
 *
 * Every money formula in the app lives here (see CLAUDE.md). Components and
 * server actions MUST NOT re-implement these. All amounts are integer cents,
 * tax rates are integer basis points (bps).
 */
import { roundCents } from "./money";
import type { TaxMode } from "@/config/app";

// ---------------------------------------------------------------------------
// Production batch cost
// ---------------------------------------------------------------------------

export interface BatchCostInput {
  totalFilamentGrams: number;
  filamentCostPerKgCents: number;
  totalPrintMinutes: number;
  machineCostPerHourCents: number;
  otherBatchCostCents: number;
  quantitySuccessful: number;
}

export interface BatchCostResult {
  materialCostCents: number;
  machineCostCents: number;
  totalCostCents: number;
  /** Cost per successful unit. Failed prints raise this because it divides by successful qty. */
  unitCostCents: number;
}

export function computeBatchCost(input: BatchCostInput): BatchCostResult {
  const grams = Math.max(0, input.totalFilamentGrams || 0);
  const minutes = Math.max(0, input.totalPrintMinutes || 0);
  const other = Math.max(0, input.otherBatchCostCents || 0);

  const materialCostCents = roundCents((grams / 1000) * (input.filamentCostPerKgCents || 0));
  const machineCostCents = roundCents((minutes / 60) * (input.machineCostPerHourCents || 0));
  const totalCostCents = materialCostCents + machineCostCents + other;

  const successful = Math.max(0, Math.floor(input.quantitySuccessful || 0));
  const unitCostCents = successful > 0 ? roundCents(totalCostCents / successful) : 0;

  return { materialCostCents, machineCostCents, totalCostCents, unitCostCents };
}

// ---------------------------------------------------------------------------
// Discounts (applied to a line subtotal, in cents)
// ---------------------------------------------------------------------------

/** Percentage discount in bps applied to a subtotal. 1000 bps = 10%. */
export function percentDiscountCents(subtotalCents: number, discountBps: number): number {
  const sub = Math.max(0, subtotalCents || 0);
  const bps = Math.max(0, discountBps || 0);
  const discount = roundCents((sub * bps) / 10000);
  return Math.min(discount, sub);
}

/** Fixed-dollar discount in cents, clamped so it never exceeds the subtotal. */
export function fixedDiscountCents(subtotalCents: number, discountCents: number): number {
  const sub = Math.max(0, subtotalCents || 0);
  return Math.min(Math.max(0, discountCents || 0), sub);
}

// ---------------------------------------------------------------------------
// Tax
// ---------------------------------------------------------------------------

export interface TaxResult {
  /** The amount that tax is assessed against (post-discount subtotal). */
  taxableAmountCents: number;
  taxCents: number;
  totalCents: number;
}

/**
 * Compute tax for a post-discount subtotal.
 *
 * add_on:    total = subtotal + subtotal*rate
 * inclusive: the subtotal already INCLUDES tax; back it out.
 */
export function computeTax(
  subtotalAfterDiscountCents: number,
  taxRateBps: number,
  taxMode: TaxMode,
): TaxResult {
  const sub = Math.max(0, subtotalAfterDiscountCents || 0);
  const rate = Math.max(0, taxRateBps || 0) / 10000;

  if (taxMode === "inclusive") {
    const total = sub;
    const preTax = roundCents(total / (1 + rate));
    const taxCents = total - preTax;
    return { taxableAmountCents: preTax, taxCents, totalCents: total };
  }

  // add_on (default)
  const taxCents = roundCents(sub * rate);
  return { taxableAmountCents: sub, taxCents, totalCents: sub + taxCents };
}

// ---------------------------------------------------------------------------
// Sale line + whole-sale computation
// ---------------------------------------------------------------------------

export interface SaleLineInput {
  quantity: number;
  listUnitPriceCents: number;
  soldUnitPriceCents: number;
  unitCostCents: number;
}

export interface SaleLineComputed extends SaleLineInput {
  lineSubtotalCents: number;
  cogsCents: number;
}

export interface SaleTotals {
  lines: SaleLineComputed[];
  subtotalCents: number;
  discountCents: number;
  taxableAmountCents: number;
  taxCents: number;
  totalCents: number;
  cogsCents: number;
  /** total - tax - cogs; the estimated gross profit for the sale. */
  grossProfitCents: number;
}

export interface SaleDiscountInput {
  discountBps?: number;
  discountFixedCents?: number;
}

/**
 * Compute a complete sale from its lines + a transaction-level discount + tax.
 * Discounts combine: percentage first (on subtotal), then fixed dollars.
 */
export function computeSale(
  lineInputs: SaleLineInput[],
  discount: SaleDiscountInput,
  taxRateBps: number,
  taxMode: TaxMode,
): SaleTotals {
  const lines: SaleLineComputed[] = lineInputs.map((l) => {
    const qty = Math.max(0, Math.floor(l.quantity || 0));
    const lineSubtotalCents = qty * Math.max(0, l.soldUnitPriceCents || 0);
    const cogsCents = qty * Math.max(0, l.unitCostCents || 0);
    return { ...l, quantity: qty, lineSubtotalCents, cogsCents };
  });

  const subtotalCents = lines.reduce((s, l) => s + l.lineSubtotalCents, 0);
  const cogsCents = lines.reduce((s, l) => s + l.cogsCents, 0);

  const pctPart = percentDiscountCents(subtotalCents, discount.discountBps || 0);
  const afterPct = subtotalCents - pctPart;
  const fixedPart = fixedDiscountCents(afterPct, discount.discountFixedCents || 0);
  const discountCents = pctPart + fixedPart;

  const afterDiscount = subtotalCents - discountCents;
  const tax = computeTax(afterDiscount, taxRateBps, taxMode);

  const grossProfitCents = tax.totalCents - tax.taxCents - cogsCents;

  return {
    lines,
    subtotalCents,
    discountCents,
    taxableAmountCents: tax.taxableAmountCents,
    taxCents: tax.taxCents,
    totalCents: tax.totalCents,
    cogsCents,
    grossProfitCents,
  };
}

// ---------------------------------------------------------------------------
// Margin
// ---------------------------------------------------------------------------

/** Margin fraction = (price - cost) / price. Returns 0 when price is 0. */
export function marginFraction(priceCents: number, costCents: number): number {
  const price = priceCents || 0;
  if (price <= 0) return 0;
  return (price - (costCents || 0)) / price;
}

/** Margin as a display percentage string, e.g. "42%". */
export function formatMarginPct(priceCents: number, costCents: number): string {
  return `${Math.round(marginFraction(priceCents, costCents) * 100)}%`;
}

// ---------------------------------------------------------------------------
// Inventory from immutable ledger
// ---------------------------------------------------------------------------

export interface LedgerEntryLike {
  product_id: string;
  quantity_delta: number;
}

/** On-hand quantity for a single product = sum of signed deltas. */
export function inventoryOnHand(entries: LedgerEntryLike[]): number {
  return entries.reduce((s, e) => s + (e.quantity_delta || 0), 0);
}

/** Map of product_id -> on-hand quantity, computed from the ledger. */
export function inventoryByProduct(entries: LedgerEntryLike[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) {
    map.set(e.product_id, (map.get(e.product_id) || 0) + (e.quantity_delta || 0));
  }
  return map;
}

/**
 * Weighted-average unit cost from "printed" ledger entries that carry a cost snapshot.
 * Falls back to 0 when there is no cost information.
 */
export function weightedAverageUnitCost(
  entries: Array<{ quantity_delta: number; unit_cost_cents_snapshot: number | null; transaction_type: string }>,
): number {
  let totalQty = 0;
  let totalCost = 0;
  for (const e of entries) {
    if (e.transaction_type !== "printed") continue;
    const qty = e.quantity_delta || 0;
    const cost = e.unit_cost_cents_snapshot || 0;
    if (qty > 0 && cost >= 0) {
      totalQty += qty;
      totalCost += qty * cost;
    }
  }
  if (totalQty <= 0) return 0;
  return roundCents(totalCost / totalQty);
}

// ---------------------------------------------------------------------------
// Event remaining quantity
// ---------------------------------------------------------------------------

export interface EventMovement {
  transaction_type: string;
  quantity_delta: number;
}

/**
 * Remaining quantity at an event for a product =
 *   quantity_brought - sold - gifted - damaged (+ any reversals restore units).
 * We derive "consumed" from event-scoped ledger entries (negative deltas reduce
 * remaining, positive reversal deltas add it back).
 */
export function eventRemaining(quantityBrought: number, eventMovements: EventMovement[]): number {
  const consumed = eventMovements.reduce((s, m) => s + (m.quantity_delta || 0), 0);
  // eventMovements are signed relative to global inventory: sales are negative,
  // reversals positive. Remaining = brought + sum(deltas) because sales subtract.
  return Math.max(0, (quantityBrought || 0) + consumed);
}
