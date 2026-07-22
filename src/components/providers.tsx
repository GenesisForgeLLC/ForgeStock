"use client";

import { Toaster } from "sonner";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        theme="dark"
        position="top-center"
        richColors
        closeButton
        toastOptions={{ duration: 3500 }}
      />
      <ServiceWorkerRegistrar />
    </>
  );
}
