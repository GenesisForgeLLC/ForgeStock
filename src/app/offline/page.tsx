import { WifiOff } from "lucide-react";
import { APP_NAME } from "@/config/app";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <WifiOff className="h-8 w-8" />
      </span>
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {APP_NAME} needs a connection to load this screen. If you&apos;re at an event, your active
        event and its products are cached — go back to Event Mode to keep selling. Sales made offline
        are queued and will sync automatically when you reconnect.
      </p>
    </div>
  );
}
