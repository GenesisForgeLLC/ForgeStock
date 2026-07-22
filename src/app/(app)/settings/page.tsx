import { requireProfile } from "@/lib/auth";
import { getCategories } from "@/lib/data/queries";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";
import { CategoryManager } from "./category-manager";
import { DemoDataControls } from "./demo-data-controls";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile } = await requireProfile();
  const categories = await getCategories();

  return (
    <div>
      <PageHeader title="Settings" description="Business identity, production costs, and sales defaults." />
      <div className="space-y-5">
        <SettingsForm profile={profile} />
        <CategoryManager categories={categories} />
        <DemoDataControls />
      </div>
    </div>
  );
}
