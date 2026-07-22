import Link from "next/link";
import { Download } from "lucide-react";
import { getRecentLedger, getRecentSales } from "@/lib/data/queries";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LedgerList, type LedgerEntry } from "@/components/activity/ledger-list";
import { SalesList, type SaleRow } from "@/components/activity/sales-list";
import { PendingSyncPanel } from "@/components/activity/pending-sync-panel";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const [ledger, sales] = await Promise.all([getRecentLedger(100), getRecentSales(100)]);

  return (
    <div>
      <PageHeader
        title="Activity"
        description="Inventory ledger and sales history."
        action={
          <Button asChild variant="outline" size="sm">
            <a href="/api/export/sales">
              <Download className="h-4 w-4" /> Sales CSV
            </a>
          </Button>
        }
      />

      <PendingSyncPanel />

      <Tabs defaultValue="ledger">
        <TabsList className="w-full">
          <TabsTrigger value="ledger" className="flex-1">
            Inventory
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex-1">
            Sales
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ledger">
          <Card>
            <CardContent className="pt-4">
              <LedgerList entries={ledger as unknown as LedgerEntry[]} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sales">
          <Card>
            <CardContent className="pt-4">
              <SalesList sales={sales as unknown as SaleRow[]} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        History is immutable. Corrections create reversing transactions —{" "}
        <Link href="/inventory" className="underline">
          make an adjustment
        </Link>
        .
      </p>
    </div>
  );
}
