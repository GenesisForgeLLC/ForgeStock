"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActionContext, num, str, bool, type ActionState, toMessage } from "./util";
import { productSchema } from "@/lib/validation";

function parseProductForm(fd: FormData) {
  return productSchema.safeParse({
    name: str(fd, "name") ?? "",
    sku: str(fd, "sku"),
    category_id: str(fd, "category_id"),
    brand_line: str(fd, "brand_line"),
    description: str(fd, "description"),
    image_path: str(fd, "image_path"),
    default_price_cents: num(fd, "default_price_cents"),
    estimated_print_time_minutes: num(fd, "estimated_print_time_minutes"),
    estimated_filament_grams: num(fd, "estimated_filament_grams"),
    other_unit_cost_cents: num(fd, "other_unit_cost_cents"),
    low_stock_threshold: num(fd, "low_stock_threshold", 5),
    is_favorite: bool(fd, "is_favorite"),
    is_archived: bool(fd, "is_archived"),
  });
}

export async function createProduct(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let newId: string | null = null;
  try {
    const { supabase, user } = await getActionContext();
    const parsed = parseProductForm(fd);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid product" };

    const { data, error } = await supabase
      .from("products")
      .insert({ user_id: user.id, ...parsed.data })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return { error: "A product with that SKU already exists" };
      return { error: toMessage(error) };
    }
    newId = data.id;
    revalidatePath("/products");
    revalidatePath("/inventory");
  } catch (err) {
    return { error: toMessage(err) };
  }
  if (newId) redirect(`/products/${newId}`);
  return { ok: true };
}

export async function updateProduct(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { supabase, user } = await getActionContext();
    const parsed = parseProductForm(fd);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid product" };

    const { error } = await supabase
      .from("products")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      if (error.code === "23505") return { error: "A product with that SKU already exists" };
      return { error: toMessage(error) };
    }
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    revalidatePath("/inventory");
    return { ok: true, message: "Product saved" };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

export async function setProductArchived(id: string, archived: boolean): Promise<void> {
  const { supabase, user } = await getActionContext();
  await supabase.from("products").update({ is_archived: archived }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/products");
  revalidatePath("/inventory");
}

export async function toggleFavorite(id: string, favorite: boolean): Promise<void> {
  const { supabase, user } = await getActionContext();
  await supabase.from("products").update({ is_favorite: favorite }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/products");
  revalidatePath("/inventory");
}
