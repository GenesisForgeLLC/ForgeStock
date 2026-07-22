export interface EventModeProduct {
  product_id: string;
  name: string;
  sku: string | null;
  image_url: string | null;
  category_name: string | null;
  price_cents: number;
  unit_cost_cents: number;
  quantity_remaining: number;
  is_favorite: boolean;
}

export interface EventModeSettings {
  eventId: string;
  eventName: string;
  taxRateBps: number;
  taxMode: "add_on" | "inclusive";
  defaultPaymentMethod: string;
  currency: string;
  userId: string | null;
}

export interface CartLine {
  product_id: string;
  name: string;
  quantity: number;
  sold_unit_price_cents: number;
  list_unit_price_cents: number;
  unit_cost_cents: number;
}
