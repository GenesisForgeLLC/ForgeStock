import { PageHeader } from "@/components/page-header";
import { ImportClient } from "./import-client";

export const metadata = { title: "Import products" };

export default function ImportPage() {
  return (
    <div>
      <PageHeader
        title="Import products"
        description="Bulk-add products from a CSV. Preview and fix errors before committing."
      />
      <ImportClient />
    </div>
  );
}
