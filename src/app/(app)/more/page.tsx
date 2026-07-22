import Link from "next/link";
import {
  Settings,
  History,
  Printer,
  Store,
  Package,
  Download,
  LogOut,
  Upload,
} from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";
import { APP_NAME, APP_SUBTITLE } from "@/config/app";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "More" };

const links = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/activity", label: "Activity & history", icon: History },
  { href: "/prints/new", label: "Record print batch", icon: Printer },
  { href: "/events", label: "Events", icon: Store },
  { href: "/products/import", label: "Import products (CSV)", icon: Upload },
];

const exports = [
  { href: "/api/export/inventory", label: "Inventory CSV" },
  { href: "/api/export/products", label: "Product catalog CSV" },
  { href: "/api/export/sales", label: "Sales history CSV" },
];

export default async function MorePage() {
  const { profile } = await requireProfile();

  return (
    <div>
      <PageHeader title="More" description={profile.business_name} />

      <nav className="mb-5 overflow-hidden rounded-lg border border-border bg-card">
        <ul className="divide-y divide-border">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mb-5 overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-muted-foreground">
          <Download className="h-4 w-4" /> Exports
        </div>
        <ul className="divide-y divide-border">
          {exports.map((e) => (
            <li key={e.href}>
              <a href={e.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent">
                <Package className="h-5 w-5 text-muted-foreground" />
                <span>{e.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <form action={signOut}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3.5 font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5" /> Sign out
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {APP_NAME} — {APP_SUBTITLE}
      </p>
    </div>
  );
}
