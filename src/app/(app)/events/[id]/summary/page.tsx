import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Trophy, PackageX } from "lucide-react";
import {
  getEvent,
  getEventFinancials,
  getEventItemSummary,
  getEventPaymentBreakdown,
} from "@/lib/data/queries";
import { PAYMENT_METHOD_LABELS } from "@/config/app";
import { marginFraction } from "@/lib/calc";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { MoneyText } from "@/components/money-text";
import { EventCloseControls } from "@/components/events/event-close-controls";

export const metadata = { title: "Event summary" };

const statusVariant = { draft: "secondary", open: "success", closed: "outline" } as const;

export default async function EventSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const [fin, items, payments] = await Promise.all([
    getEventFinancials(id),
    getEventItemSummary(id),
    getEventPaymentBreakdown(id),
  ]);

  const grossListValue = items.reduce((s, i) => s + i.quantity_sold * i.default_price_cents, 0);
  const marginPct = fin && fin.total_collected_cents - fin.tax_cents > 0
    ? Math.round((fin.gross_profit_cents / (fin.total_collected_cents - fin.tax_cents)) * 100)
    : 0;

  const bestSellers = [...items].filter((i) => i.quantity_sold > 0).sort((a, b) => b.quantity_sold - a.quantity_sold).slice(0, 5);
  const noSales = items.filter((i) => i.quantity_sold === 0);

  return (
    <div>
      <PageHeader
        title={`${event.name} — Summary`}
        description={[event.venue, event.location].filter(Boolean).join(" · ") || undefined}
        action={<Badge variant={statusVariant[event.status]}>{event.status}</Badge>}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <EventCloseControls eventId={id} status={event.status} />
        <Button asChild variant="outline">
          <a href={`/api/export/event/${id}`}>
            <Download className="h-4 w-4" /> Summary CSV
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={`/api/export/event/${id}/lines`}>
            <Download className="h-4 w-4" /> Sale lines CSV
          </a>
        </Button>
        {event.status === "open" && (
          <Button asChild>
            <Link href={`/events/${id}/mode`}>Back to Event Mode</Link>
          </Button>
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total collected" valueCents={fin?.total_collected_cents ?? 0} tone="primary" />
        <StatCard label="Sales subtotal" valueCents={fin?.subtotal_cents ?? 0} />
        <StatCard label="Discounts" valueCents={fin?.discount_cents ?? 0} tone="warning" />
        <StatCard label="Tax collected" valueCents={fin?.tax_cents ?? 0} />
        <StatCard label="Est. COGS" valueCents={fin?.cogs_cents ?? 0} />
        <StatCard label="Est. gross profit" valueCents={fin?.gross_profit_cents ?? 0} tone="success" />
        <StatCard label="Profit margin" value={`${marginPct}%`} tone="success" />
        <StatCard label="Gross list value" valueCents={grossListValue} />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Brought" value={String(fin?.units_brought ?? 0)} />
        <StatCard label="Sold" value={String(fin?.units_sold ?? 0)} tone="success" />
        <StatCard label="Gifted" value={String(fin?.units_gifted ?? 0)} />
        <StatCard label="Damaged" value={String(fin?.units_damaged ?? 0)} tone="warning" />
        <StatCard label="Remaining" value={String(fin?.units_remaining ?? 0)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Best sellers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {bestSellers.map((i) => (
                  <li key={i.product_id} className="flex items-center justify-between text-sm">
                    <span className="min-w-0 truncate">{i.product_name}</span>
                    <span className="ml-2 shrink-0 tabular-nums">
                      <span className="font-semibold text-success">{i.quantity_sold}</span>
                      <span className="text-muted-foreground"> · {Math.round(marginFraction(i.effective_price_cents, i.unit_cost_cents) * 100)}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by payment method</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {payments.map((p) => (
                  <li key={p.payment_method} className="flex items-center justify-between text-sm">
                    <span>{PAYMENT_METHOD_LABELS[p.payment_method]}</span>
                    <span className="tabular-nums">
                      <MoneyText cents={p.total_cents} />
                      <span className="text-muted-foreground"> · {p.sales_count}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageX className="h-4 w-4 text-muted-foreground" /> Products with no sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {noSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">Every allocated product sold at least one unit. 🎉</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {noSales.map((i) => (
                  <li key={i.product_id}>
                    <Badge variant="secondary">{i.product_name}</Badge>
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
