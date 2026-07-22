import { createClient } from "@/lib/supabase/server";

export const PRODUCT_IMAGE_BUCKET = "product-images";

/** Create a short-lived signed URL for a private product image (server-side). */
export async function getSignedImageUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60); // 1 hour
  return data?.signedUrl ?? null;
}

/** Resolve signed URLs for many image paths at once. */
export async function getSignedImageUrls(
  paths: (string | null)[],
): Promise<Record<string, string>> {
  const supabase = await createClient();
  const unique = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  const map: Record<string, string> = {};
  await Promise.all(
    unique.map(async (p) => {
      const { data } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).createSignedUrl(p, 60 * 60);
      if (data?.signedUrl) map[p] = data.signedUrl;
    }),
  );
  return map;
}
