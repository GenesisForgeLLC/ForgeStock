/**
 * Single source of truth for the application's identity.
 * Rename the app by changing NEXT_PUBLIC_APP_NAME (or this default).
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "ForgeStock";
export const APP_SUBTITLE = "3D Print Inventory & Vendor Event Manager";
export const APP_TAGLINE = "Inventory & vendor-event sales for Genesis Forge";

/** Default business identity used when a profile has not overridden it. */
export const DEFAULTS = {
  businessName: "Genesis Forge",
  currency: "USD",
  timezone: "America/New_York",
  /** 8.00% expressed in basis points. */
  taxRateBps: 800,
  taxMode: "add_on" as const,
  paymentMethod: "cash" as const,
  lowStockThreshold: 5,
} as const;

export const PAYMENT_METHODS = [
  "cash",
  "card",
  "venmo",
  "cashapp",
  "paypal",
  "other",
] as const;

export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  cash: "Cash",
  card: "Card",
  venmo: "Venmo",
  cashapp: "Cash App",
  paypal: "PayPal",
  other: "Other",
};

export const TAX_MODES = ["add_on", "inclusive"] as const;
export const TAX_MODE_LABELS: Record<(typeof TAX_MODES)[number], string> = {
  add_on: "Add tax after subtotal",
  inclusive: "Tax included in price",
};

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type TaxMode = (typeof TAX_MODES)[number];
