/**
 * Database types.
 *
 * Hand-maintained to match supabase/migrations. When you have Supabase CLI
 * access, regenerate with `npm run db:types` to keep this authoritative.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TaxMode = "add_on" | "inclusive";
export type PaymentMethod = "cash" | "card" | "venmo" | "cashapp" | "paypal" | "other";
export type EventStatus = "draft" | "open" | "closed";
export type SaleStatus = "completed" | "voided";
export type LedgerTxnType =
  | "printed"
  | "sold"
  | "gifted"
  | "damaged"
  | "returned"
  | "manual_increase"
  | "manual_decrease"
  | "sale_reversal"
  | "adjustment_reversal";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          business_name: string;
          timezone: string;
          currency: string;
          default_tax_rate_bps: number;
          default_tax_mode: TaxMode;
          default_filament_cost_per_kg_cents: number;
          default_machine_cost_per_hour_cents: number;
          default_payment_method: PaymentMethod;
          default_low_stock_threshold: number;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          sort_order: number;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          sku: string | null;
          name: string;
          brand_line: string | null;
          description: string | null;
          image_path: string | null;
          default_price_cents: number;
          estimated_print_time_minutes: number;
          estimated_filament_grams: number;
          other_unit_cost_cents: number;
          low_stock_threshold: number;
          is_favorite: boolean;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
        Relationships: [];
      };
      production_batches: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          printed_at: string;
          quantity_started: number;
          quantity_successful: number;
          quantity_failed: number;
          total_print_time_minutes: number;
          total_filament_grams: number;
          filament_cost_per_kg_cents_snapshot: number;
          machine_cost_per_hour_cents_snapshot: number;
          other_batch_cost_cents: number;
          calculated_material_cost_cents: number;
          calculated_machine_cost_cents: number;
          calculated_total_cost_cents: number;
          calculated_unit_cost_cents: number;
          notes: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          venue: string | null;
          location: string | null;
          starts_at: string | null;
          ends_at: string | null;
          status: EventStatus;
          tax_rate_bps: number;
          tax_mode: TaxMode;
          default_payment_method: PaymentMethod;
          notes: string | null;
          opened_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
        Relationships: [];
      };
      event_items: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          product_id: string;
          quantity_brought: number;
          event_price_cents: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["event_items"]["Row"]> & {
          user_id: string;
          event_id: string;
          product_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_items"]["Row"]>;
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          user_id: string;
          event_id: string | null;
          status: SaleStatus;
          idempotency_key: string;
          subtotal_cents: number;
          discount_cents: number;
          taxable_amount_cents: number;
          tax_cents: number;
          total_cents: number;
          tax_rate_bps: number;
          tax_mode: TaxMode;
          payment_method: PaymentMethod;
          notes: string | null;
          sold_at: string;
          voided_at: string | null;
          void_reason: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      sale_items: {
        Row: {
          id: string;
          user_id: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          list_unit_price_cents: number;
          sold_unit_price_cents: number;
          line_subtotal_cents: number;
          line_discount_cents: number;
          unit_cost_cents_snapshot: number;
          cogs_cents: number;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      inventory_ledger: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          event_id: string | null;
          sale_id: string | null;
          production_batch_id: string | null;
          transaction_type: LedgerTxnType;
          quantity_delta: number;
          unit_cost_cents_snapshot: number | null;
          note: string | null;
          reversal_of_id: string | null;
          idempotency_key: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: {
      v_product_inventory: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          sku: string | null;
          category_id: string | null;
          category_name: string | null;
          brand_line: string | null;
          image_path: string | null;
          default_price_cents: number;
          low_stock_threshold: number;
          is_favorite: boolean;
          is_archived: boolean;
          on_hand: number;
          unit_cost_cents: number;
          inventory_value_cents: number;
          retail_value_cents: number;
          is_low_stock: boolean;
        };
        Relationships: [];
      };
      v_event_item_summary: {
        Row: {
          event_item_id: string;
          user_id: string;
          event_id: string;
          product_id: string;
          product_name: string;
          sku: string | null;
          image_path: string | null;
          quantity_brought: number;
          effective_price_cents: number;
          default_price_cents: number;
          unit_cost_cents: number;
          quantity_sold: number;
          quantity_gifted: number;
          quantity_damaged: number;
          quantity_remaining: number;
        };
        Relationships: [];
      };
      v_event_financials: {
        Row: {
          event_id: string;
          user_id: string;
          name: string;
          status: EventStatus;
          sales_count: number;
          subtotal_cents: number;
          discount_cents: number;
          tax_cents: number;
          total_collected_cents: number;
          cogs_cents: number;
          gross_profit_cents: number;
          units_brought: number;
          units_sold: number;
          units_gifted: number;
          units_damaged: number;
          units_remaining: number;
        };
        Relationships: [];
      };
      v_event_payment_breakdown: {
        Row: {
          event_id: string;
          user_id: string;
          payment_method: PaymentMethod;
          sales_count: number;
          total_cents: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      record_print_batch: {
        Args: {
          p_product_id: string;
          p_printed_at: string;
          p_quantity_started: number;
          p_quantity_successful: number;
          p_quantity_failed: number;
          p_total_print_time_minutes: number;
          p_total_filament_grams: number;
          p_filament_cost_per_kg_cents: number;
          p_machine_cost_per_hour_cents: number;
          p_other_batch_cost_cents: number;
          p_notes: string | null;
        };
        Returns: Json;
      };
      record_inventory_adjustment: {
        Args: {
          p_product_id: string;
          p_transaction_type: string;
          p_quantity: number;
          p_note: string | null;
          p_event_id?: string | null;
        };
        Returns: Json;
      };
      create_sale: { Args: { payload: Json }; Returns: Json };
      void_sale: { Args: { p_sale_id: string; p_reason?: string | null }; Returns: Json };
      open_event: { Args: { p_event_id: string }; Returns: Json };
      close_event: { Args: { p_event_id: string }; Returns: Json };
      reopen_event: { Args: { p_event_id: string }; Returns: Json };
      product_on_hand: { Args: { p_product_id: string }; Returns: number };
      product_unit_cost: { Args: { p_product_id: string }; Returns: number };
      event_remaining: { Args: { p_event_id: string; p_product_id: string }; Returns: number };
      delete_demo_data: { Args: Record<string, never>; Returns: Json };
    };
    Enums: {
      tax_mode: TaxMode;
      payment_method: PaymentMethod;
      event_status: EventStatus;
      sale_status: SaleStatus;
      ledger_txn_type: LedgerTxnType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
