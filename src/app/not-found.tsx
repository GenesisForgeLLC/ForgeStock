import Link from "next/link";
import { Flame } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Flame className="h-7 w-7" />
      </span>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">That page doesn&apos;t exist or has moved.</p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
