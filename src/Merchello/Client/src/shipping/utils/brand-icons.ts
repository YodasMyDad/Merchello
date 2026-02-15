/**
 * Generic fallback icons for shipping providers.
 * Branded SVGs are supplied by backend API icon fields.
 */
export const SHIPPING_PROVIDER_ICONS: Record<string, string> = {
  "flat-rate": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>`,
  truck: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 16V4H1v12h15zM16 8h4l3 3v5h-7V8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`,
};

/**
 * Gets a generic fallback icon for a shipping provider key.
 */
export function getShippingProviderIconSvg(providerKey: string): string | undefined {
  const key = providerKey.toLowerCase();

  if (key === "flat-rate") return SHIPPING_PROVIDER_ICONS["flat-rate"];
  if (key.includes("flat")) return SHIPPING_PROVIDER_ICONS["flat-rate"];

  return SHIPPING_PROVIDER_ICONS.truck;
}
