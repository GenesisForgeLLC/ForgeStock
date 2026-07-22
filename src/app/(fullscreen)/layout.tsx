import { requireProfile } from "@/lib/auth";
import { AppSettingsProvider } from "@/components/app-settings";
import { SyncProvider } from "@/components/pwa/sync-provider";

/** Chrome-free layout for immersive routes like Event Mode. */
export default async function FullscreenLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();
  return (
    <AppSettingsProvider
      value={{
        currency: profile?.currency ?? "USD",
        timezone: profile?.timezone ?? "America/New_York",
        businessName: profile?.business_name ?? "Genesis Forge",
        defaultPaymentMethod: profile?.default_payment_method ?? "cash",
      }}
    >
      <SyncProvider>{children}</SyncProvider>
    </AppSettingsProvider>
  );
}
