import { notFound } from "next/navigation";
import { getProduct, getCategories } from "@/lib/data/queries";
import { getSignedImageUrl } from "@/lib/storage";
import { updateProduct } from "@/lib/actions/products";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/products/product-form";
import { ProductArchiveButton } from "@/components/products/product-archive-button";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProduct(id), getCategories()]);
  if (!product) notFound();

  const imageUrl = await getSignedImageUrl(product.image_path);
  const boundAction = updateProduct.bind(null, id);

  return (
    <div>
      <PageHeader
        title={product.name}
        description={product.is_archived ? "Archived product" : "Edit product details."}
        action={<ProductArchiveButton id={id} archived={product.is_archived} />}
      />
      <ProductForm
        action={boundAction}
        categories={categories}
        imageUrl={imageUrl}
        submitLabel="Save changes"
        values={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          category_id: product.category_id,
          brand_line: product.brand_line,
          description: product.description,
          image_path: product.image_path,
          default_price_cents: product.default_price_cents,
          estimated_print_time_minutes: product.estimated_print_time_minutes,
          estimated_filament_grams: product.estimated_filament_grams,
          other_unit_cost_cents: product.other_unit_cost_cents,
          low_stock_threshold: product.low_stock_threshold,
          is_favorite: product.is_favorite,
          is_archived: product.is_archived,
        }}
      />
    </div>
  );
}
