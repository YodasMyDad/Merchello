/**
 * Brand icons for tax providers (symbol only, no text).
 * These are compact SVG icons suitable for UI lists and configuration screens.
 */
export const TAX_PROVIDER_ICONS: Record<string, string> = {
  // Avalara cloud logo (brand teal/green)
  avalara: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="#66B245"/><path d="M10.5 16l-3-3 1.06-1.06L10.5 13.88l4.94-4.94L16.5 10l-6 6z" fill="white"/></svg>`,

  // Generic calculator icon (default fallback)
  calculator: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" stroke-width="1.5"/><rect x="7" y="5" width="10" height="4" rx="1" fill="currentColor" opacity="0.3"/><circle cx="8.5" cy="12.5" r="1" fill="currentColor"/><circle cx="12" cy="12.5" r="1" fill="currentColor"/><circle cx="15.5" cy="12.5" r="1" fill="currentColor"/><circle cx="8.5" cy="16" r="1" fill="currentColor"/><circle cx="12" cy="16" r="1" fill="currentColor"/><circle cx="15.5" cy="16" r="1" fill="currentColor"/><circle cx="8.5" cy="19.5" r="1" fill="currentColor"/><rect x="11" y="18.5" width="5.5" height="2" rx="1" fill="currentColor"/></svg>`,
};

/**
 * Gets the brand icon SVG for a tax provider based on its alias.
 * @param providerAlias - The provider alias (e.g., "avalara", "manual-tax")
 * @returns The SVG string or undefined if no matching icon
 */
export function getTaxProviderIconSvg(providerAlias: string): string | undefined {
  const alias = providerAlias.toLowerCase();

  // Direct match
  if (TAX_PROVIDER_ICONS[alias]) {
    return TAX_PROVIDER_ICONS[alias];
  }

  // Partial matching for common providers
  if (alias.includes("avalara")) return TAX_PROVIDER_ICONS.avalara;

  // Default to calculator icon
  return TAX_PROVIDER_ICONS.calculator;
}
