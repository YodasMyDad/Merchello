/**
 * Brand icons for fulfilment providers (symbol only, no text).
 * These are compact SVG icons suitable for UI lists and configuration screens.
 */
export const FULFILMENT_PROVIDER_ICONS: Record<string, string> = {
  // Generic warehouse/fulfilment icon
  warehouse: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21V8l9-5 9 5v13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 21v-6h6v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 8l9 5 9-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // Box/package icon (default)
  box: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 8V16c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V8c0-.71.38-1.37 1-1.73l6-3.46c.62-.36 1.38-.36 2 0l6 3.46c.62.36 1 1.02 1 1.73z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 8l9 5 9-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // ShipBob logo (simplified boat/ship icon)
  shipbob: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 17h18l-2-6H5l-2 6z" fill="#5856D6"/><path d="M12 3v8M12 11l-4-3M12 11l4-3" stroke="#5856D6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19c1.5 1 3.5 2 7 2s5.5-1 7-2" stroke="#5856D6" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  // ShipMonk logo (monk/person icon)
  shipmonk: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="6" r="3" fill="#00C853"/><path d="M12 10c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z" fill="#00C853"/><path d="M8 20l4-4 4 4" stroke="#00C853" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // ShipHero logo (hero cape/shield icon)
  shiphero: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" fill="#FF6B35"/><path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // Helm WMS logo (ship wheel/helm icon)
  "helm-wms": `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" fill="none" stroke="#1E3A5F" stroke-width="1.5"/><circle cx="12" cy="12" r="8" fill="none" stroke="#1E3A5F" stroke-width="1.5"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.34 6.34l2.83 2.83M14.83 14.83l2.83 2.83M6.34 17.66l2.83-2.83M14.83 9.17l2.83-2.83" stroke="#1E3A5F" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  // Deliverr logo (fast delivery icon)
  deliverr: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#6366F1"/></svg>`,

  // Flexport logo (globe with arrows)
  flexport: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" fill="none" stroke="#0066FF" stroke-width="1.5"/><path d="M3 12h18M12 3c-2.5 3-4 6-4 9s1.5 6 4 9c2.5-3 4-6 4-9s-1.5-6-4-9z" fill="none" stroke="#0066FF" stroke-width="1.5"/></svg>`,

  // Red Stag Fulfillment (stag/deer icon)
  "red-stag": `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 4c-1 2-2 3-2 5s1 3 2 4c1-1 2-2 2-4s-1-3-2-5zM8 6c-2-1-4-1-5 0 1 2 3 3 5 3M16 6c2-1 4-1 5 0-1 2-3 3-5 3M12 13v8M8 17l4 4 4-4" stroke="#C41E3A" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // Manual fulfillment (hand/person icon)
  manual: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" stroke="currentColor" stroke-width="1.5"/><path d="M6 20v-2c0-2.21 1.79-4 4-4h4c2.21 0 4 1.79 4 4v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  // Truck/shipping icon
  truck: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 16V4H1v12h15zM16 8h4l3 3v5h-7V8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`,
};

/**
 * Gets the brand icon SVG for a fulfilment provider based on its key.
 * @param providerKey - The provider key (e.g., "shipbob", "shipmonk", "shiphero")
 * @returns The SVG string or undefined if no matching icon
 */
export function getFulfilmentProviderIconSvg(providerKey: string): string | undefined {
  const key = providerKey.toLowerCase();

  // Direct match
  if (FULFILMENT_PROVIDER_ICONS[key]) {
    return FULFILMENT_PROVIDER_ICONS[key];
  }

  // Partial matching for common providers
  if (key.includes("shipbob")) return FULFILMENT_PROVIDER_ICONS.shipbob;
  if (key.includes("shipmonk")) return FULFILMENT_PROVIDER_ICONS.shipmonk;
  if (key.includes("shiphero")) return FULFILMENT_PROVIDER_ICONS.shiphero;
  if (key.includes("helm")) return FULFILMENT_PROVIDER_ICONS["helm-wms"];
  if (key.includes("deliverr")) return FULFILMENT_PROVIDER_ICONS.deliverr;
  if (key.includes("flexport")) return FULFILMENT_PROVIDER_ICONS.flexport;
  if (key.includes("stag")) return FULFILMENT_PROVIDER_ICONS["red-stag"];
  if (key.includes("manual")) return FULFILMENT_PROVIDER_ICONS.manual;
  if (key.includes("warehouse")) return FULFILMENT_PROVIDER_ICONS.warehouse;

  // Default to box icon
  return FULFILMENT_PROVIDER_ICONS.box;
}
