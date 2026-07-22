"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Upload, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { parseCsv } from "@/lib/csv";
import { parseDollarsToCents } from "@/lib/money";
import { importProducts, type ImportRow } from "@/lib/actions/import";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const TEMPLATE_HEADERS = [
  "Name",
  "SKU",
  "Category",
  "Brand line",
  "Default price",
  "Estimated print minutes",
  "Estimated filament grams",
  "Additional unit cost",
  "Low-stock threshold",
  "Favorite",
  "Archived",
];

const TEMPLATE = `${TEMPLATE_HEADERS.join(",")}
Wobblekin Axolotl,WOB-AXO,Wobblekins,Wobblekins,25.00,180,45,0.25,3,true,false
Articulated Dragon,ART-DRG,Articulated,Genesis Forge,35.00,300,80,0.25,3,false,false
`;

interface ParsedRow {
  row: ImportRow;
  errors: string[];
  raw: string[];
}

function idx(headers: string[], name: string): number {
  const target = name.toLowerCase().replace(/[^a-z]/g, "");
  return headers.findIndex((h) => h.toLowerCase().replace(/[^a-z]/g, "") === target);
}

function parseBool(v: string | undefined): boolean {
  return /^(true|yes|1|y)$/i.test((v ?? "").trim());
}

export function ImportClient() {
  const router = useRouter();
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [mode, setMode] = useState<"create" | "update">("create");
  const [pending, start] = useTransition();

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forgestock-product-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result));
      if (rows.length < 2) {
        toast.error("The file has no data rows.");
        return;
      }
      const headers = rows[0]!;
      const iName = idx(headers, "name");
      if (iName < 0) {
        toast.error("A 'Name' column is required.");
        return;
      }
      const iSku = idx(headers, "sku");
      const iCat = idx(headers, "category");
      const iBrand = idx(headers, "brandline");
      const iPrice = idx(headers, "defaultprice");
      const iMin = idx(headers, "estimatedprintminutes");
      const iGram = idx(headers, "estimatedfilamentgrams");
      const iOther = idx(headers, "additionalunitcost");
      const iLow = idx(headers, "lowstockthreshold");
      const iFav = idx(headers, "favorite");
      const iArch = idx(headers, "archived");

      const out: ParsedRow[] = rows.slice(1).map((raw) => {
        const errors: string[] = [];
        const name = (raw[iName] ?? "").trim();
        if (!name) errors.push("Missing name");

        const price = iPrice >= 0 ? parseDollarsToCents(raw[iPrice]) : 0;
        if (price === null || price < 0) errors.push("Invalid price");
        const other = iOther >= 0 ? parseDollarsToCents(raw[iOther]) ?? 0 : 0;
        const minutes = iMin >= 0 ? Number(raw[iMin] || 0) : 0;
        const grams = iGram >= 0 ? Number(raw[iGram] || 0) : 0;
        const low = iLow >= 0 ? Number(raw[iLow] || 5) : 5;
        if (!Number.isFinite(minutes) || minutes < 0) errors.push("Invalid print minutes");
        if (!Number.isFinite(grams) || grams < 0) errors.push("Invalid filament grams");

        return {
          raw,
          errors,
          row: {
            name,
            sku: iSku >= 0 ? (raw[iSku] || "").trim() || null : null,
            category: iCat >= 0 ? (raw[iCat] || "").trim() || null : null,
            brand_line: iBrand >= 0 ? (raw[iBrand] || "").trim() || null : null,
            default_price_cents: price ?? 0,
            estimated_print_time_minutes: Math.max(0, Math.round(minutes)),
            estimated_filament_grams: Math.max(0, grams),
            other_unit_cost_cents: other,
            low_stock_threshold: Math.max(0, Math.round(low)),
            is_favorite: iFav >= 0 ? parseBool(raw[iFav]) : false,
            is_archived: iArch >= 0 ? parseBool(raw[iArch]) : false,
          },
        };
      });
      setParsed(out);
    };
    reader.readAsText(file);
  }

  const validRows = parsed?.filter((p) => p.errors.length === 0) ?? [];
  const invalidCount = (parsed?.length ?? 0) - validRows.length;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>1 · Get the template</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Download CSV template
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2 · Upload your file</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border py-6 text-sm text-muted-foreground hover:bg-accent">
            <Upload className="h-5 w-5" />
            Choose CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "create" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("create")}
            >
              Create only (skip existing SKUs)
            </Button>
            <Button
              type="button"
              variant={mode === "update" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("update")}
            >
              Update matching SKUs
            </Button>
          </div>
        </CardContent>
      </Card>

      {parsed && (
        <Card>
          <CardHeader>
            <CardTitle>
              3 · Preview ({validRows.length} valid{invalidCount > 0 ? `, ${invalidCount} with errors` : ""})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-80 overflow-auto rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-muted text-xs">
                  <tr>
                    <th className="px-2 py-1.5"></th>
                    <th className="px-2 py-1.5">Name</th>
                    <th className="px-2 py-1.5">SKU</th>
                    <th className="px-2 py-1.5">Price</th>
                    <th className="px-2 py-1.5">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((p, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1.5">
                        {p.errors.length === 0 ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </td>
                      <td className="px-2 py-1.5">{p.row.name || "—"}</td>
                      <td className="px-2 py-1.5 tabular-nums">{p.row.sku || "—"}</td>
                      <td className="px-2 py-1.5 tabular-nums">
                        {(p.row.default_price_cents / 100).toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-destructive">{p.errors.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              size="lg"
              disabled={pending || validRows.length === 0}
              onClick={() =>
                start(async () => {
                  const res = await importProducts(
                    validRows.map((v) => v.row),
                    mode,
                  );
                  if (!res.ok) {
                    toast.error(res.error ?? "Import failed");
                  } else {
                    toast.success(
                      `Imported: ${res.created} created, ${res.updated} updated, ${res.skipped} skipped`,
                    );
                    setParsed(null);
                    router.push("/products");
                  }
                })
              }
            >
              Import {validRows.length} product{validRows.length === 1 ? "" : "s"}
            </Button>
            <Label className="block text-xs text-muted-foreground">
              Existing SKUs are never overwritten unless you chose “Update matching SKUs”.
            </Label>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
