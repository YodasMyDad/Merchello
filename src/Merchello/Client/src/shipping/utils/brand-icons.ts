/**
 * Brand icons for shipping providers (symbol only, no text).
 * These are compact SVG icons suitable for UI lists and configuration screens.
 */
export const SHIPPING_PROVIDER_ICONS: Record<string, string> = {
  // UPS shield logo (brown)
  ups: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8 2 4 3.5 4 3.5V13c0 5 4 8.5 8 10 4-1.5 8-5 8-10V3.5S16 2 12 2z" fill="#351C15"/><path d="M12 4.5c-3 0-6 1-6 1V13c0 4 3 6.8 6 8 3-1.2 6-4 6-8V5.5s-3-1-6-1z" fill="#FFB500"/><path d="M10 9v6h1.5v-2h1c1.4 0 2.5-.9 2.5-2s-1.1-2-2.5-2H10zm1.5 1.2h1c.6 0 1 .3 1 .8s-.4.8-1 .8h-1V10.2z" fill="#351C15"/></svg>`,

  // FedEx logo (purple and orange)
  fedex: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6" width="20" height="12" rx="2" fill="#4D148C"/><text x="12" y="14.5" text-anchor="middle" fill="white" font-size="7" font-weight="bold" font-family="Arial, sans-serif">Fe<tspan fill="#FF6600">Ex</tspan></text></svg>`,

  // Generic flat-rate / price tag icon
  "flat-rate": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>`,

  // Generic truck icon (default fallback)
  truck: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 16V4H1v12h15zM16 8h4l3 3v5h-7V8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`,
};

/**
 * Gets the brand icon SVG for a shipping provider based on its key.
 * @param providerKey - The provider key (e.g., "ups", "fedex", "flat-rate")
 * @returns The SVG string or undefined if no matching icon
 */
export function getShippingProviderIconSvg(providerKey: string): string | undefined {
  const key = providerKey.toLowerCase();

  // Direct match
  if (SHIPPING_PROVIDER_ICONS[key]) {
    return SHIPPING_PROVIDER_ICONS[key];
  }

  // Partial matching for common providers
  if (key.includes("ups")) return SHIPPING_PROVIDER_ICONS.ups;
  if (key.includes("fedex")) return SHIPPING_PROVIDER_ICONS.fedex;
  if (key.includes("flat")) return SHIPPING_PROVIDER_ICONS["flat-rate"];

  // Default to truck icon
  return SHIPPING_PROVIDER_ICONS.truck;
}
