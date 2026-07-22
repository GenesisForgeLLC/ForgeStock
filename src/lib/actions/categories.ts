"use server";

import { revalidatePath } from "next/cache";
import { getActionContext, num, str, type ActionState, toMessage } from "./util";

export async function createCategory(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { supabase, user } = await getActionContext();
    const name = str(fd, "name");
    if (!name) return { error: "Category name is required" };

    const { error } = await supabase.from("categories").insert({
      user_id: user.id,
      name,
      sort_order: num(fd, "sort_order", 0),
      is_archived: false,
    });
    if (error) {
      if (error.code === "23505") return { error: "A category with that name already exists" };
      return { error: toMessage(error) };
    }
    revalidatePath("/settings");
    revalidatePath("/products");
    return { ok: true, message: "Category added" };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

export async function archiveCategory(id: string): Promise<void> {
  const { supabase, user } = await getActionContext();
  await supabase
    .from("categories")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/settings");
  revalidatePath("/products");
}
