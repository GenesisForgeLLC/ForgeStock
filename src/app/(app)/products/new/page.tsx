import { getCategories } from "@/lib/data/queries";
import { createProduct } from "@/lib/actions/products";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/products/product-form";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <div>
      <PageHeader title="New product" description="Add a product to your catalog." />
      <ProductForm
        action={createProduct}
        categories={categories}
        imageUrl={null}
        submitLabel="Create product"
        values={{
          name: "",
          sku: null,
          category_id: null,
          brand_line: null,
          description: null,
          image_path: null,
          default_price_cents: 0,
          estimated_print_time_minutes: 0,
          estimated_filament_grams: 0,
          other_unit_cost_cents: 0,
          low_stock_threshold: 5,
          is_favorite: false,
          is_archived: false,
        }}
      />
    </div>
  );
}
