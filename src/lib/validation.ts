/**
 * Zod schemas shared between client forms and server actions / route handlers.
 * Money fields are validated as integer cents, tax rates as integer bps.
 * All inputs are re-validated on the server even when the client validated them.
 */
import { z } from "zod";
import { PAYMENT_METHODS, TAX_MODES } from "@/config/app";

const cents = z.number().int().nonnegative();
const optionalCents = z.number().int().nonnegative().nullable().optional();
const bps = z.number().int().min(0).max(10000); // 0% – 100%
const uuidSchema = z.string().uuid();

export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export const taxModeSchema = z.enum(TAX_MODES);

// --------------------------- Profile / settings ----------------------------

export const profileSchema = z.object({
  business_name: z.string().min(1, "Business name is required").max(120),
  timezone: z.string().min(1),
  currency: z.string().length(3),
  default_tax_rate_bps: bps,
  default_tax_mode: taxModeSchema,
  default_filament_cost_per_kg_cents: cents,
  default_machine_cost_per_hour_cents: cents,
  default_payment_method: paymentMethodSchema,
  default_low_stock_threshold: z.number().int().min(0).max(100000),
});
export type ProfileInput = z.infer<typeof profileSchema>;

// ------------------------------- Categories --------------------------------

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  sort_order: z.number().int().default(0),
});
export type CategoryInput = z.infer<typeof categorySchema>;

// -------------------------------- Products ---------------------------------

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(160),
  sku: z.string().max(60).nullable().optional(),
  category_id: uuidSchema.nullable().optional(),
  brand_line: z.string().max(120).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  image_path: z.string().max(400).nullable().optional(),
  default_price_cents: cents,
  estimated_print_time_minutes: z.number().int().min(0).max(100000).default(0),
  estimated_filament_grams: z.number().min(0).max(1000000).default(0),
  other_unit_cost_cents: cents.default(0),
  low_stock_threshold: z.number().int().min(0).max(100000).default(5),
  is_favorite: z.boolean().default(false),
  is_archived: z.boolean().default(false),
});
export type ProductInput = z.infer<typeof productSchema>;

// ---------------------------- Production batch -----------------------------

export const productionBatchSchema = z
  .object({
    product_id: uuidSchema,
    printed_at: z.string().min(1),
    quantity_started: z.number().int().min(1, "Must start at least 1"),
    quantity_successful: z.number().int().min(0),
    quantity_failed: z.number().int().min(0),
    total_print_time_minutes: z.number().min(0),
    total_filament_grams: z.number().min(0),
    filament_cost_per_kg_cents_snapshot: cents,
    machine_cost_per_hour_cents_snapshot: cents,
    other_batch_cost_cents: cents.default(0),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((v) => v.quantity_successful + v.quantity_failed <= v.quantity_started, {
    message: "Successful + failed cannot exceed quantity started",
    path: ["quantity_successful"],
  })
  .refine((v) => v.quantity_successful <= v.quantity_started, {
    message: "Successful cannot exceed quantity started",
    path: ["quantity_successful"],
  });
export type ProductionBatchInput = z.infer<typeof productionBatchSchema>;

// ------------------------- Inventory adjustment ----------------------------

export const adjustmentTypes = [
  "gifted",
  "damaged",
  "returned",
  "manual_increase",
  "manual_decrease",
] as const;

export const inventoryAdjustmentSchema = z
  .object({
    product_id: uuidSchema,
    transaction_type: z.enum(adjustmentTypes),
    quantity: z.number().int().positive("Quantity must be greater than zero"),
    note: z.string().max(1000).nullable().optional(),
  })
  .refine(
    (v) =>
      // manual corrections and damage/gift require a note for the audit trail
      !["manual_increase", "manual_decrease"].includes(v.transaction_type) ||
      (v.note && v.note.trim().length > 0),
    { message: "A note is required for manual corrections", path: ["note"] },
  );
export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

// --------------------------------- Events ----------------------------------

export const eventStatuses = ["draft", "open", "closed"] as const;

export const eventSchema = z.object({
  name: z.string().min(1, "Event name is required").max(160),
  venue: z.string().max(160).nullable().optional(),
  location: z.string().max(240).nullable().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  tax_rate_bps: bps,
  tax_mode: taxModeSchema,
  default_payment_method: paymentMethodSchema,
});
export type EventInput = z.infer<typeof eventSchema>;

export const eventItemSchema = z.object({
  event_id: uuidSchema,
  product_id: uuidSchema,
  quantity_brought: z.number().int().min(0).max(1000000),
  event_price_cents: optionalCents,
});
export type EventItemInput = z.infer<typeof eventItemSchema>;

// ---------------------------------- Sales ----------------------------------

export const saleLineSchema = z.object({
  product_id: uuidSchema,
  quantity: z.number().int().positive("Quantity must be greater than zero"),
  list_unit_price_cents: cents,
  sold_unit_price_cents: cents,
});

export const createSaleSchema = z.object({
  event_id: uuidSchema.nullable().optional(),
  idempotency_key: uuidSchema,
  lines: z.array(saleLineSchema).min(1, "A sale needs at least one line"),
  discount_bps: bps.default(0),
  discount_fixed_cents: cents.default(0),
  tax_rate_bps: bps,
  tax_mode: taxModeSchema,
  payment_method: paymentMethodSchema,
  notes: z.string().max(1000).nullable().optional(),
  /** Local time the sale was made on the device (for offline entries). */
  sold_at: z.string().nullable().optional(),
});
export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const voidSaleSchema = z.object({
  sale_id: uuidSchema,
  void_reason: z.string().max(500).nullable().optional(),
});
export type VoidSaleInput = z.infer<typeof voidSaleSchema>;
