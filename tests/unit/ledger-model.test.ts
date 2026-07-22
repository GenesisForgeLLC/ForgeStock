import { describe, it, expect, beforeEach } from "vitest";
import { inventoryOnHand, computeSale } from "@/lib/calc";

/**
 * Pure in-memory model mirroring the semantics of the atomic DB functions
 * (create_sale / void_sale / record_inventory_adjustment). This lets us test
 * the business rules — negative-stock prevention, idempotent sales, and void
 * reversals — without a live database.
 */
interface Ledger {
  id: string;
  product_id: string;
  quantity_delta: number;
  transaction_type: string;
  sale_id?: string;
  reversal_of_id?: string;
}
interface Sale {
  id: string;
  idempotency_key: string;
  status: "completed" | "voided";
  total_cents: number;
}

class Store {
  ledger: Ledger[] = [];
  sales: Sale[] = [];
  seq = 0;

  onHand(productId: string) {
    return inventoryOnHand(this.ledger.filter((l) => l.product_id === productId));
  }

  adjust(productId: string, delta: number) {
    if (delta === 0) throw new Error("delta must be nonzero");
    if (this.onHand(productId) + delta < 0) throw new Error("would go negative");
    this.ledger.push({
      id: `l${this.seq++}`,
      product_id: productId,
      quantity_delta: delta,
      transaction_type: delta > 0 ? "manual_increase" : "manual_decrease",
    });
  }

  createSale(key: string, lines: { product_id: string; quantity: number; price: number; cost: number }[]) {
    const existing = this.sales.find((s) => s.idempotency_key === key);
    if (existing) return existing; // idempotent replay

    for (const l of lines) {
      if (l.quantity > this.onHand(l.product_id)) throw new Error("insufficient stock");
    }
    const totals = computeSale(
      lines.map((l) => ({
        quantity: l.quantity,
        listUnitPriceCents: l.price,
        soldUnitPriceCents: l.price,
        unitCostCents: l.cost,
      })),
      {},
      0,
      "add_on",
    );
    const sale: Sale = {
      id: `s${this.seq++}`,
      idempotency_key: key,
      status: "completed",
      total_cents: totals.totalCents,
    };
    this.sales.push(sale);
    for (const l of lines) {
      this.ledger.push({
        id: `l${this.seq++}`,
        product_id: l.product_id,
        quantity_delta: -l.quantity,
        transaction_type: "sold",
        sale_id: sale.id,
      });
    }
    return sale;
  }

  voidSale(saleId: string) {
    const sale = this.sales.find((s) => s.id === saleId);
    if (!sale) throw new Error("not found");
    if (sale.status === "voided") throw new Error("already voided");
    sale.status = "voided";
    for (const l of this.ledger.filter((x) => x.sale_id === saleId && x.transaction_type === "sold")) {
      this.ledger.push({
        id: `l${this.seq++}`,
        product_id: l.product_id,
        quantity_delta: -l.quantity_delta,
        transaction_type: "sale_reversal",
        sale_id: saleId,
        reversal_of_id: l.id,
      });
    }
  }
}

describe("inventory adjustments", () => {
  let store: Store;
  beforeEach(() => {
    store = new Store();
    store.ledger.push({ id: "seed", product_id: "p1", quantity_delta: 10, transaction_type: "printed" });
  });

  it("prevents inventory from going negative", () => {
    expect(() => store.adjust("p1", -11)).toThrow(/negative/);
    expect(store.onHand("p1")).toBe(10);
  });

  it("allows a valid decrease", () => {
    store.adjust("p1", -4);
    expect(store.onHand("p1")).toBe(6);
  });
});

describe("sales", () => {
  let store: Store;
  beforeEach(() => {
    store = new Store();
    store.ledger.push({ id: "seed", product_id: "p1", quantity_delta: 10, transaction_type: "printed" });
  });

  it("decrements inventory when sold", () => {
    store.createSale("key-1", [{ product_id: "p1", quantity: 3, price: 2500, cost: 135 }]);
    expect(store.onHand("p1")).toBe(7);
  });

  it("is idempotent for duplicate submissions (same key)", () => {
    const a = store.createSale("key-1", [{ product_id: "p1", quantity: 3, price: 2500, cost: 135 }]);
    const b = store.createSale("key-1", [{ product_id: "p1", quantity: 3, price: 2500, cost: 135 }]);
    expect(a.id).toBe(b.id);
    expect(store.sales).toHaveLength(1);
    expect(store.onHand("p1")).toBe(7); // only decremented once
  });

  it("rejects sales beyond available stock", () => {
    expect(() => store.createSale("key-2", [{ product_id: "p1", quantity: 99, price: 2500, cost: 0 }])).toThrow(
      /insufficient/,
    );
  });

  it("voids a sale and restores inventory via reversal, preserving history", () => {
    const sale = store.createSale("key-1", [{ product_id: "p1", quantity: 3, price: 2500, cost: 135 }]);
    expect(store.onHand("p1")).toBe(7);
    store.voidSale(sale.id);
    expect(store.onHand("p1")).toBe(10); // restored
    expect(store.sales[0]!.status).toBe("voided"); // sale preserved, not deleted
    // both the original sold entry and its reversal exist
    expect(store.ledger.filter((l) => l.sale_id === sale.id)).toHaveLength(2);
  });

  it("prevents double voiding", () => {
    const sale = store.createSale("key-1", [{ product_id: "p1", quantity: 1, price: 2500, cost: 0 }]);
    store.voidSale(sale.id);
    expect(() => store.voidSale(sale.id)).toThrow(/already voided/);
  });
});
