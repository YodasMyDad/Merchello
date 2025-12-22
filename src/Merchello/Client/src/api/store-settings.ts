import { MerchelloApi, type StoreSettingsDto } from './merchello-api.js';

// Cached settings - loaded once on first access
let cachedSettings: StoreSettingsDto | null = null;
let loadingPromise: Promise<StoreSettingsDto> | null = null;

// Default settings for fallback
const defaultSettings: StoreSettingsDto = {
  currencyCode: 'GBP',
  currencySymbol: '£',
  invoiceNumberPrefix: 'INV-',
  lowStockThreshold: 10,
};

/**
 * Get store settings (cached after first load)
 */
export async function getStoreSettings(): Promise<StoreSettingsDto> {
  if (cachedSettings) {
    return cachedSettings;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    const { data, error } = await MerchelloApi.getSettings();
    if (error || !data) {
      console.warn('Failed to load store settings, using defaults:', error);
      cachedSettings = defaultSettings;
    } else {
      cachedSettings = data;
    }
    loadingPromise = null;
    return cachedSettings;
  })();

  return loadingPromise;
}

/**
 * Get currency symbol synchronously (returns default if not yet loaded)
 */
export function getCurrencySymbol(): string {
  return cachedSettings?.currencySymbol ?? defaultSettings.currencySymbol;
}

/**
 * Get currency code synchronously (returns default if not yet loaded)
 */
export function getCurrencyCode(): string {
  return cachedSettings?.currencyCode ?? defaultSettings.currencyCode;
}

/**
 * Preload settings (call this early in app initialization)
 */
export function preloadSettings(): void {
  getStoreSettings();
}
