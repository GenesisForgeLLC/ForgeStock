import Link from "next/link";
import { Store, ArrowRight } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { getRecentLedger, getRecentSales, getCategories, getProducts } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/config/app";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { OnboardingChecklist, type OnboardingStep } from "@/components/dashboard/onboarding-checklist";
import { LedgerList, type LedgerEntry } from "@/components/activity/ledger-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/money-text";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { profile, user } = await requireProfile();
  const supabase = await createClient();

  const [data, ledger, sales, categories, products, batchCount] = await Promise.all([
    getDashboardData(profile.timezone),
    getRecentLedger(8),
    getRecentSales(6),
    getCategories(),
    getProducts(),
    supabase
      .from("production_batches")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const eventsCount = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const steps: OnboardingStep[] = [
    { label: "Confirm business settings", done: Boolean(profile.business_name), href: "/settings" },
    { label: "Set filament cost", done: profile.default_filament_cost_per_kg_cents > 0, href: "/settings" },
    { label: "Set machine hourly cost", done: profile.default_machine_cost_per_hour_cents > 0, href: "/settings" },
    { label: "Create your first category", done: categories.length > 0, href: "/settings" },
    { label: "Create your first product", done: products.length > 0, href: "/products/new" },
    { label: "Record your first print batch", done: (batchCount.count ?? 0) > 0, href: "/prints/new" },
    { label: "Create your first event", done: (eventsCount.count ?? 0) > 0, href: "/events/new" },
  ];
  const showOnboarding = !profile.onboarding_completed && steps.some((s) => !s.done);

  return (
    <div>
      <PageHeader title={`Welcome to ${APP_NAME}`} description={profile.business_name} />

      {showOnboarding && (
        <div className="mb-5">
          <OnboardingChecklist steps={steps} />
        </div>
      )}

      {data.activeEvent && (
        <Link
          href={`/events/${data.activeEvent.id}/mode`}
          className="mb-5 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 p-4 transition-colors hover:bg-primary/15"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Store className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{data.activeEvent.name}</span>
              <Badge variant="success">Open</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Tap to resume Event Mode</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
        </Link>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sales today" valueCents={data.todayTotal} tone="primary" />
        <StatCard label="Sales this month" valueCents={data.monthTotal} tone="success" />
        <StatCard label="Tax this month" valueCents={data.monthTax} />
        <StatCard label="Units on hand" value={String(data.unitsOnHand)} />
        <StatCard label="Active products" value={String(data.activeProducts)} />
        <StatCard label="Low stock" value={String(data.lowStock)} tone={data.lowStock > 0 ? "warning" : "default"} />
        <StatCard label="Inventory cost" valueCents={data.inventoryCost} />
        <StatCard label="Retail value" valueCents={data.retailValue} />
      </div>

      <div className="mb-5">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Quick actions</h2>
        <QuickActions activeEventId={data.activeEvent?.id ?? null} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent activity</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/activity">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <LedgerList entries={ledger as unknown as LedgerEntry[]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent sales</CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No sales yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {sales.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {(s.events as unknown as { name: string } | null)?.name ?? "Manual sale"}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {s.payment_method}
                        {s.status === "voided" && " · voided"}
                      </p>
                    </div>
                    <MoneyText
                      cents={s.total_cents}
                      className={s.status === "voided" ? "text-muted-foreground line-through" : "font-semibold"}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
