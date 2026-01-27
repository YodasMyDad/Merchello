import { vi } from "vitest";

// Mock the store-settings module for tests that import formatting.ts
vi.mock("@api/store-settings.js", () => ({
  getCurrencySymbol: () => "£",
  getCurrencyCode: () => "GBP",
  getStoreSettings: () =>
    Promise.resolve({
      currencyCode: "GBP",
      currencySymbol: "£",
      invoiceNumberPrefix: "INV-",
      lowStockThreshold: 10,
      discountCodeLength: 8,
      defaultDiscountPriority: 1000,
      defaultPaginationPageSize: 50,
      refundQuickAmountPercentages: [50],
    }),
}));

// Mock fetch for API tests
global.fetch = vi.fn();
