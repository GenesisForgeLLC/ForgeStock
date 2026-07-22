import { describe, it, expect } from "vitest";
import {
  computeBatchCost,
  computeTax,
  computeSale,
  percentDiscountCents,
  fixedDiscountCents,
  marginFraction,
  inventoryOnHand,
  inventoryByProduct,
  eventRemaining,
  weightedAverageUnitCost,
} from "@/lib/calc";
import { roundCents, parseDollarsToCents, parsePercentToBps } from "@/lib/money";

describe("money helpers", () => {
  it("rounds fractional cents half away from zero", () => {
    expect(roundCents(100.5)).toBe(101);
    expect(roundCents(100.4)).toBe(100);
    expect(roundCents(-100.5)).toBe(-101);
    expect(roundCents(0)).toBe(0);
  });

  it("parses dollar strings to integer cents", () => {
    expect(parseDollarsToCents("12.34")).toBe(1234);
    expect(parseDollarsToCents("$1,234.5")).toBe(123450);
    expect(parseDollarsToCents("25")).toBe(2500);
    expect(parseDollarsToCents("")).toBeNull();
    expect(parseDollarsToCents("abc")).toBeNull();
  });

  it("parses percentages to basis points", () => {
    expect(parsePercentToBps("8")).toBe(800);
    expect(parsePercentToBps("8.25")).toBe(825);
    expect(parsePercentToBps("0")).toBe(0);
  });
});

describe("computeBatchCost", () => {
  it("computes material cost from grams and filament price", () => {
    // 500 g at $25/kg -> $12.50
    const r = computeBatchCost({
      totalFilamentGrams: 500,
      filamentCostPerKgCents: 2500,
      totalPrintMinutes: 0,
      machineCostPerHourCents: 0,
      otherBatchCostCents: 0,
      quantitySuccessful: 10,
    });
    expect(r.materialCostCents).toBe(1250);
  });

  it("computes machine cost from minutes and hourly rate", () => {
    // 120 minutes at $0.50/hr -> $1.00
    const r = computeBatchCost({
      totalFilamentGrams: 0,
      filamentCostPerKgCents: 0,
      totalPrintMinutes: 120,
      machineCostPerHourCents: 50,
      otherBatchCostCents: 0,
      quantitySuccessful: 10,
    });
    expect(r.machineCostCents).toBe(100);
  });

  it("raises unit cost when prints fail (divides by successful only)", () => {
    // total cost $12.50 material + $1.00 machine = $13.50 over 10 successful = $1.35
    const tenGood = computeBatchCost({
      totalFilamentGrams: 500,
      filamentCostPerKgCents: 2500,
      totalPrintMinutes: 120,
      machineCostPerHourCents: 50,
      otherBatchCostCents: 0,
      quantitySuccessful: 10,
    });
    expect(tenGood.totalCostCents).toBe(1350);
    expect(tenGood.unitCostCents).toBe(135);

    // Same cost but only 8 successful -> higher unit cost (1350 / 8 = 168.75 -> 169)
    const eightGood = computeBatchCost({
      totalFilamentGrams: 500,
      filamentCostPerKgCents: 2500,
      totalPrintMinutes: 120,
      machineCostPerHourCents: 50,
      otherBatchCostCents: 0,
      quantitySuccessful: 8,
    });
    expect(eightGood.unitCostCents).toBe(169);
    expect(eightGood.unitCostCents).toBeGreaterThan(tenGood.unitCostCents);
  });

  it("includes additional batch cost and handles zero successful", () => {
    const r = computeBatchCost({
      totalFilamentGrams: 100,
      filamentCostPerKgCents: 2500,
      totalPrintMinutes: 60,
      machineCostPerHourCents: 50,
      otherBatchCostCents: 300,
      quantitySuccessful: 0,
    });
    // material 250 + machine 50 + other 300 = 600
    expect(r.totalCostCents).toBe(600);
    expect(r.unitCostCents).toBe(0); // no successful units
  });
});

describe("discounts", () => {
  it("applies percentage discount in bps", () => {
    expect(percentDiscountCents(10000, 1000)).toBe(1000); // 10% of $100
    expect(percentDiscountCents(9999, 825)).toBe(825); // 8.25% of 9999 = 824.9 -> 825
  });

  it("clamps percentage discount to subtotal", () => {
    expect(percentDiscountCents(500, 20000)).toBe(500);
  });

  it("applies and clamps fixed-dollar discount", () => {
    expect(fixedDiscountCents(1000, 300)).toBe(300);
    expect(fixedDiscountCents(1000, 5000)).toBe(1000);
    expect(fixedDiscountCents(1000, -50)).toBe(0);
  });
});

describe("computeTax", () => {
  it("adds tax on top in add_on mode", () => {
    const r = computeTax(10000, 800, "add_on");
    expect(r.taxableAmountCents).toBe(10000);
    expect(r.taxCents).toBe(800);
    expect(r.totalCents).toBe(10800);
  });

  it("backs tax out of an inclusive price", () => {
    // total 10800 inclusive at 8% -> pre-tax 10000, tax 800
    const r = computeTax(10800, 800, "inclusive");
    expect(r.totalCents).toBe(10800);
    expect(r.taxableAmountCents).toBe(10000);
    expect(r.taxCents).toBe(800);
  });

  it("handles zero tax rate", () => {
    const r = computeTax(5000, 0, "add_on");
    expect(r.taxCents).toBe(0);
    expect(r.totalCents).toBe(5000);
  });
});

describe("computeSale", () => {
  it("computes a simple add-on sale", () => {
    const s = computeSale(
      [{ quantity: 2, listUnitPriceCents: 2500, soldUnitPriceCents: 2500, unitCostCents: 135 }],
      {},
      800,
      "add_on",
    );
    expect(s.subtotalCents).toBe(5000);
    expect(s.discountCents).toBe(0);
    expect(s.taxCents).toBe(400);
    expect(s.totalCents).toBe(5400);
    expect(s.cogsCents).toBe(270);
    // gross profit = total - tax - cogs = 5400 - 400 - 270 = 4730
    expect(s.grossProfitCents).toBe(4730);
  });

  it("applies percentage then fixed discount before tax", () => {
    const s = computeSale(
      [{ quantity: 1, listUnitPriceCents: 10000, soldUnitPriceCents: 10000, unitCostCents: 0 }],
      { discountBps: 1000, discountFixedCents: 500 },
      800,
      "add_on",
    );
    // subtotal 10000, -10% = 1000, then -$5 = 500 -> discount 1500, after 8500
    expect(s.discountCents).toBe(1500);
    expect(s.taxableAmountCents).toBe(8500);
    expect(s.taxCents).toBe(680);
    expect(s.totalCents).toBe(9180);
  });

  it("supports selling below cost (negative profit)", () => {
    const s = computeSale(
      [{ quantity: 1, listUnitPriceCents: 2500, soldUnitPriceCents: 500, unitCostCents: 1000 }],
      {},
      0,
      "add_on",
    );
    expect(s.totalCents).toBe(500);
    expect(s.cogsCents).toBe(1000);
    expect(s.grossProfitCents).toBe(-500);
  });
});

describe("margins", () => {
  it("computes margin fraction", () => {
    expect(marginFraction(2500, 1000)).toBeCloseTo(0.6);
    expect(marginFraction(0, 1000)).toBe(0);
  });
});

describe("inventory from ledger", () => {
  it("sums signed deltas for on-hand", () => {
    const entries = [
      { product_id: "a", quantity_delta: 10 },
      { product_id: "a", quantity_delta: -3 },
      { product_id: "a", quantity_delta: -2 },
    ];
    expect(inventoryOnHand(entries)).toBe(5);
  });

  it("groups on-hand by product", () => {
    const map = inventoryByProduct([
      { product_id: "a", quantity_delta: 10 },
      { product_id: "b", quantity_delta: 4 },
      { product_id: "a", quantity_delta: -1 },
    ]);
    expect(map.get("a")).toBe(9);
    expect(map.get("b")).toBe(4);
  });

  it("computes weighted-average unit cost from printed entries", () => {
    const cost = weightedAverageUnitCost([
      { transaction_type: "printed", quantity_delta: 10, unit_cost_cents_snapshot: 100 },
      { transaction_type: "printed", quantity_delta: 10, unit_cost_cents_snapshot: 200 },
      { transaction_type: "sold", quantity_delta: -5, unit_cost_cents_snapshot: 100 },
    ]);
    expect(cost).toBe(150);
  });
});

describe("event remaining", () => {
  it("reduces remaining by sales and restores on reversal", () => {
    // brought 20, sold 3 (delta -3), reversal +1 -> remaining 18
    expect(
      eventRemaining(20, [
        { transaction_type: "sold", quantity_delta: -3 },
        { transaction_type: "sale_reversal", quantity_delta: 1 },
      ]),
    ).toBe(18);
  });

  it("never goes below zero", () => {
    expect(eventRemaining(2, [{ transaction_type: "sold", quantity_delta: -5 }])).toBe(0);
  });
});
