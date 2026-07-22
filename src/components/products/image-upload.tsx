"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { uuid } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MiB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const BUCKET = "product-images";

export function ImageUpload({
  name,
  initialPath,
  initialUrl,
}: {
  name: string;
  initialPath: string | null;
  initialUrl: string | null;
}) {
  const [path, setPath] = useState<string | null>(initialPath);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Please choose a PNG, JPEG, WEBP, or GIF image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const objectPath = `${user.id}/${uuid()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;

      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, 3600);
      setPath(objectPath);
      setPreview(signed?.signedUrl ?? URL.createObjectURL(file));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={path ?? ""} />
      <div className="flex items-center gap-3">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
          {preview ? (
            <Image src={preview} alt="Product" fill sizes="80px" className="object-cover" unoptimized />
          ) : (
            <Camera className="h-6 w-6 text-muted-foreground" />
          )}
          {preview && (
            <button
              type="button"
              onClick={() => {
                setPath(null);
                setPreview(null);
              }}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div>
          <label className="inline-flex">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="secondary" size="sm" asChild disabled={uploading}>
              <span className="cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {uploading ? "Uploading…" : "Photo"}
              </span>
            </Button>
          </label>
          <p className="mt-1 text-xs text-muted-foreground">PNG/JPG up to 5 MB.</p>
        </div>
      </div>
    </div>
  );
}
