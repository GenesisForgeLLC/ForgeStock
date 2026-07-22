import Link from "next/link";
import { Boxes, Printer, Download } from "lucide-react";
import { getInventory } from "@/lib/data/queries";
import { getSignedImageUrls } from "@/lib/storage";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InventoryItem, type InventoryRow } from "@/components/inventory/inventory-item";
import { StatCard } from "@/components/stat-card";

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const rows = (await getInventory()) as InventoryRow[];
  const urls = await getSignedImageUrls(rows.map((r) => r.image_path));

  const totalUnits = rows.reduce((s, r) => s + r.on_hand, 0);
  const totalCost = rows.reduce((s, r) => s + r.inventory_value_cents, 0);
  const totalRetail = rows.reduce((s, r) => s + r.retail_value_cents, 0);
  const lowCount = rows.filter((r) => r.is_low_stock && r.on_hand > 0).length;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Live on-hand quantities from the ledger."
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/api/export/inventory">
                <Download className="h-4 w-4" /> CSV
              </a>
            </Button>
            <Button asChild size="sm">
              <Link href="/prints/new">
                <Printer className="h-4 w-4" /> Print
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Units on hand" value={totalUnits.toString()} />
        <StatCard label="Low stock" value={lowCount.toString()} tone={lowCount > 0 ? "warning" : "default"} />
        <StatCard label="Inventory cost" valueCents={totalCost} />
        <StatCard label="Retail value" valueCents={totalRetail} tone="success" />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No inventory yet"
          description="Record a print batch to add units to your inventory."
          action={
            <Button asChild>
              <Link href="/prints/new">Record print batch</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <InventoryItem row={row} imageUrl={row.image_path ? urls[row.image_path] ?? null : null} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
