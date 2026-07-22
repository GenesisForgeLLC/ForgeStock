import { requireProfile } from "@/lib/auth";
import { getActiveEvent } from "@/lib/data/queries";
import { AppSettingsProvider } from "@/components/app-settings";
import { SyncProvider } from "@/components/pwa/sync-provider";
import { SideNav } from "@/components/nav/side-nav";
import { BottomNav } from "@/components/nav/bottom-nav";
import { TopBar } from "@/components/nav/top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();
  const activeEvent = await getActiveEvent();

  return (
    <AppSettingsProvider
      value={{
        currency: profile?.currency ?? "USD",
        timezone: profile?.timezone ?? "America/New_York",
        businessName: profile?.business_name ?? "Genesis Forge",
        defaultPaymentMethod: profile?.default_payment_method ?? "cash",
      }}
    >
      <SyncProvider>
        <div className="flex min-h-[100dvh]">
          <SideNav />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar activeEventId={activeEvent?.id ?? null} activeEventName={activeEvent?.name ?? null} />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-8">
              {children}
            </main>
          </div>
        </div>
        <BottomNav activeEventId={activeEvent?.id ?? null} />
      </SyncProvider>
    </AppSettingsProvider>
  );
}
