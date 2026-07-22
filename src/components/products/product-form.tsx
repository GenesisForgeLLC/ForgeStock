"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/actions/util";
import { useActionToast } from "@/components/forms/use-action-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImageUpload } from "./image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
}

export interface ProductFormValues {
  id?: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  brand_line: string | null;
  description: string | null;
  image_path: string | null;
  default_price_cents: number;
  estimated_print_time_minutes: number;
  estimated_filament_grams: number;
  other_unit_cost_cents: number;
  low_stock_threshold: number;
  is_favorite: boolean;
  is_archived: boolean;
}

export function ProductForm({
  action,
  values,
  categories,
  imageUrl,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  values: ProductFormValues;
  categories: Category[];
  imageUrl: string | null;
  submitLabel: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);
  useActionToast(state, () => router.refresh());

  const [price, setPrice] = useState<number | null>(values.default_price_cents);
  const [otherCost, setOtherCost] = useState<number | null>(values.other_unit_cost_cents);
  const [categoryId, setCategoryId] = useState<string>(values.category_id ?? "none");
  const [favorite, setFavorite] = useState(values.is_favorite);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="default_price_cents" value={price ?? 0} />
      <input type="hidden" name="other_unit_cost_cents" value={otherCost ?? 0} />
      <input type="hidden" name="category_id" value={categoryId === "none" ? "" : categoryId} />
      <input type="hidden" name="is_favorite" value={favorite ? "true" : "false"} />
      <input type="hidden" name="is_archived" value={values.is_archived ? "true" : "false"} />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUpload name="image_path" initialPath={values.image_path} initialUrl={imageUrl} />
          <div className="space-y-2">
            <Label htmlFor="name">Product name</Label>
            <Input id="name" name="name" defaultValue={values.name} required autoFocus />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU / code</Label>
              <Input id="sku" name="sku" defaultValue={values.sku ?? ""} placeholder="WOB-AXO" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Uncategorized" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand_line">Brand / product line</Label>
            <Input id="brand_line" name="brand_line" defaultValue={values.brand_line ?? ""} placeholder="Wobblekins" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea id="description" name="description" defaultValue={values.description ?? ""} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing &amp; production</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Default price</Label>
            <MoneyInput valueCents={price} onValueChange={setPrice} />
          </div>
          <div className="space-y-2">
            <Label>Extra unit cost</Label>
            <MoneyInput valueCents={otherCost} onValueChange={setOtherCost} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimated_print_time_minutes">Est. print time (min)</Label>
            <Input
              id="estimated_print_time_minutes"
              name="estimated_print_time_minutes"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={values.estimated_print_time_minutes}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimated_filament_grams">Est. filament (g)</Label>
            <Input
              id="estimated_filament_grams"
              name="estimated_filament_grams"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              defaultValue={values.estimated_filament_grams}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="low_stock_threshold">Low-stock threshold</Label>
            <Input
              id="low_stock_threshold"
              name="low_stock_threshold"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={values.low_stock_threshold}
              className="tabular-nums"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 sm:col-span-2">
            <Label htmlFor="favorite-switch">Pin to favorites</Label>
            <Switch id="favorite-switch" checked={favorite} onCheckedChange={setFavorite} />
          </div>
        </CardContent>
      </Card>

      <SubmitButton size="lg">{submitLabel}</SubmitButton>
    </form>
  );
}
