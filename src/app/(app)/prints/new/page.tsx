import Link from "next/link";
import { Package } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getProducts } from "@/lib/data/queries";
import { PageHeader } from "@/components/page-header";
import { BatchForm } from "@/components/inventory/batch-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Record print batch" };

export default async function NewPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { profile } = await requireProfile();
  const { product } = await searchParams;
  const products = await getProducts();

  return (
    <div>
      <PageHeader
        title="Record print batch"
        description="Log a finished plate. Successful units are added to inventory; failed prints raise the unit cost."
      />
      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products to print"
          description="Add a product first, then record a batch against it."
          action={
            <Button asChild>
              <Link href="/products/new">Add product</Link>
            </Button>
          }
        />
      ) : (
        <BatchForm
          products={products}
          defaultFilamentCents={profile.default_filament_cost_per_kg_cents}
          defaultMachineCents={profile.default_machine_cost_per_hour_cents}
          presetProductId={product}
        />
      )}
    </div>
  );
}
