import Link from "next/link";
import Image from "next/image";
import { Package, Plus, Star, Upload } from "lucide-react";
import { getProducts } from "@/lib/data/queries";
import { getSignedImageUrls } from "@/lib/storage";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MoneyText } from "@/components/money-text";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const products = await getProducts();
  const urls = await getSignedImageUrls(products.map((p) => p.image_path));

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${products.length} active ${products.length === 1 ? "product" : "products"}`}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/products/import">
                <Upload className="h-4 w-4" /> Import
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/products/new">
                <Plus className="h-4 w-4" /> Add
              </Link>
            </Button>
          </div>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Create your first product to start tracking inventory."
          action={
            <Button asChild>
              <Link href="/products/new">
                <Plus className="h-4 w-4" /> Add product
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {products.map((p) => {
            const url = p.image_path ? urls[p.image_path] : null;
            return (
              <li key={p.id}>
                <Link
                  href={`/products/${p.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40"
                >
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {url ? (
                      <Image src={url} alt="" fill sizes="56px" className="object-cover" unoptimized />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {p.is_favorite && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
                      <span className="truncate font-medium">{p.name}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {p.sku && <span className="tabular-nums">{p.sku}</span>}
                      {(p.categories as unknown as { name: string } | null)?.name && (
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                          {(p.categories as unknown as { name: string }).name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <MoneyText cents={p.default_price_cents} className="shrink-0 font-semibold" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
