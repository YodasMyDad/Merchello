/**
 * Generic fallback icons for tax providers.
 * Branded SVGs are supplied by backend API icon fields.
 */
export const TAX_PROVIDER_ICONS: Record<string, string> = {
  calculator: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" stroke-width="1.5"/><rect x="7" y="5" width="10" height="4" rx="1" fill="currentColor" opacity="0.3"/><circle cx="8.5" cy="12.5" r="1" fill="currentColor"/><circle cx="12" cy="12.5" r="1" fill="currentColor"/><circle cx="15.5" cy="12.5" r="1" fill="currentColor"/><circle cx="8.5" cy="16" r="1" fill="currentColor"/><circle cx="12" cy="16" r="1" fill="currentColor"/><circle cx="15.5" cy="16" r="1" fill="currentColor"/><circle cx="8.5" cy="19.5" r="1" fill="currentColor"/><rect x="11" y="18.5" width="5.5" height="2" rx="1" fill="currentColor"/></svg>`,
};

/**
 * Gets a generic fallback icon for a tax provider alias.
 */
export function getTaxProviderIconSvg(providerAlias: string): string | undefined {
  void providerAlias;
  return TAX_PROVIDER_ICONS.calculator;
}
