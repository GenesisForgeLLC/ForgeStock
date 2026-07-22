/**
 * Money utilities.
 *
 * RULES (see CLAUDE.md):
 *  - All monetary amounts are integer cents. Never store or compute money as floats.
 *  - Tax rates are integer basis points (bps): 800 = 8.00%.
 *  - Any division/rounding of money happens ONLY through the helpers here so that
 *    rounding behaviour is identical everywhere in the app.
 */

/** Round a fractional cents value to the nearest whole cent (half-up on magnitude). */
export function roundCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  // Half away from zero to avoid banker's-rounding surprises for the user.
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** Format integer cents as a localized currency string, e.g. 1234 -> "$12.34". */
export function formatCents(
  cents: number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  const amount = (Number.isFinite(cents) ? cents : 0) / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/** Format integer cents as a bare number string without a currency symbol: 1234 -> "12.34". */
export function formatCentsPlain(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Number.isFinite(cents) ? cents : 0);
  const dollars = Math.floor(abs / 100);
  const remainder = (abs % 100).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${dollars}.${remainder}`;
}

/**
 * Parse a user-entered dollar string ("12.34", "$12", "1,234.5") into integer cents.
 * Returns null when the value cannot be parsed as a valid non-negative amount.
 */
export function parseDollarsToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return roundCents(input * 100);
  }
  const cleaned = input.replace(/[$,\s]/g, "").trim();
  if (cleaned === "") return null;
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return null;
  return roundCents(value * 100);
}

/** Convert a percentage string/number ("8", "8.25") into integer basis points. */
export function parsePercentToBps(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const value = typeof input === "number" ? input : Number.parseFloat(String(input).replace(/[%\s]/g, ""));
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Format integer basis points as a percentage string: 825 -> "8.25%". */
export function formatBps(bps: number): string {
  const pct = (Number.isFinite(bps) ? bps : 0) / 100;
  return `${pct.toFixed(2).replace(/\.00$/, "")}%`;
}
