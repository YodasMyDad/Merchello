const l = "/umbraco/api/v1";
let d = {
  token: void 0,
  baseUrl: "",
  credentials: "same-origin"
};
function $(e) {
  d = { ...d, ...e };
}
async function h() {
  const e = {
    "Content-Type": "application/json"
  };
  if (d.token) {
    const t = await d.token();
    t && (e.Authorization = `Bearer ${t}`);
  }
  return e;
}
async function r(e) {
  try {
    const t = await h(), s = d.baseUrl || "", n = await fetch(`${s}${l}/${e}`, {
      method: "GET",
      credentials: d.credentials,
      headers: t
    });
    if (!n.ok)
      return { error: new Error(`HTTP ${n.status}: ${n.statusText}`) };
    const a = n.headers.get("content-type") || "";
    let c;
    return a.includes("application/json") ? c = await n.json() : c = await n.text(), { data: c };
  } catch (t) {
    return { error: t instanceof Error ? t : new Error(String(t)) };
  }
}
async function o(e, t) {
  try {
    const s = await h(), n = d.baseUrl || "", a = await fetch(`${n}${l}/${e}`, {
      method: "POST",
      credentials: d.credentials,
      headers: s,
      body: t ? JSON.stringify(t) : void 0
    });
    if (!a.ok) {
      const g = await a.text();
      return { error: new Error(g || `HTTP ${a.status}: ${a.statusText}`) };
    }
    return (a.headers.get("content-type") || "").includes("application/json") ? { data: await a.json() } : { data: void 0 };
  } catch (s) {
    return { error: s instanceof Error ? s : new Error(String(s)) };
  }
}
async function i(e, t) {
  try {
    const s = await h(), n = d.baseUrl || "", a = await fetch(`${n}${l}/${e}`, {
      method: "PUT",
      credentials: d.credentials,
      headers: s,
      body: t ? JSON.stringify(t) : void 0
    });
    if (!a.ok) {
      const g = await a.text();
      return { error: new Error(g || `HTTP ${a.status}: ${a.statusText}`) };
    }
    return (a.headers.get("content-type") || "").includes("application/json") ? { data: await a.json() } : { data: void 0 };
  } catch (s) {
    return { error: s instanceof Error ? s : new Error(String(s)) };
  }
}
async function p(e) {
  try {
    const t = await h(), s = d.baseUrl || "", n = await fetch(`${s}${l}/${e}`, {
      method: "DELETE",
      credentials: d.credentials,
      headers: t
    });
    if (!n.ok) {
      const a = await n.text();
      return { error: new Error(a || `HTTP ${n.status}: ${n.statusText}`) };
    }
    return {};
  } catch (t) {
    return { error: t instanceof Error ? t : new Error(String(t)) };
  }
}
function u(e) {
  if (!e) return "";
  const t = new URLSearchParams();
  for (const [s, n] of Object.entries(e))
    n != null && n !== "" && t.append(s, String(n));
  return t.toString();
}
const m = {
  ping: () => r("ping"),
  whatsMyName: () => r("whatsMyName"),
  whatsTheTimeMrWolf: () => r("whatsTheTimeMrWolf"),
  whoAmI: () => r("whoAmI"),
  // Store Settings
  getSettings: () => r("settings"),
  getCountries: () => r("countries"),
  // ============================================
  // Tax Groups API
  // ============================================
  /** Get all tax groups */
  getTaxGroups: () => r("tax-groups"),
  /** Get a single tax group by ID */
  getTaxGroup: (e) => r(`tax-groups/${e}`),
  /** Create a new tax group */
  createTaxGroup: (e) => o("tax-groups", e),
  /** Update an existing tax group */
  updateTaxGroup: (e, t) => i(`tax-groups/${e}`, t),
  /** Delete a tax group */
  deleteTaxGroup: (e) => p(`tax-groups/${e}`),
  // Orders API
  getOrders: (e) => {
    const t = u(e);
    return r(`orders${t ? `?${t}` : ""}`);
  },
  getOrder: (e) => r(`orders/${e}`),
  addInvoiceNote: (e, t) => o(`orders/${e}/notes`, t),
  updateBillingAddress: (e, t) => i(`orders/${e}/billing-address`, t),
  updateShippingAddress: (e, t) => i(`orders/${e}/shipping-address`, t),
  updatePurchaseOrder: (e, t) => i(`orders/${e}/purchase-order`, { purchaseOrder: t }),
  getOrderStats: () => r("orders/stats"),
  getDashboardStats: () => r("orders/dashboard-stats"),
  /** Create a draft order from the admin backoffice */
  createDraftOrder: (e) => o("orders/draft", e),
  /** Search for customers by email or name (returns matching customers with their past shipping addresses) */
  searchCustomers: (e, t) => {
    const s = new URLSearchParams();
    e && s.set("email", e), t && s.set("name", t);
    const n = s.toString();
    return r(`orders/customer-lookup${n ? `?${n}` : ""}`);
  },
  /** Get all orders for a customer by their billing email address */
  getCustomerOrders: (e) => r(`orders/customer/${encodeURIComponent(e)}`),
  /** Export orders within a date range for CSV generation */
  exportOrders: (e) => o("orders/export", e),
  /** Soft-delete multiple orders/invoices */
  deleteOrders: (e) => o("orders/delete", { ids: e }),
  /** Cancel an invoice and all its unfulfilled orders */
  cancelInvoice: (e, t) => o(
    `orders/${e}/cancel`,
    { reason: t }
  ),
  // Invoice Editing API
  /** Get invoice data prepared for editing */
  getInvoiceForEdit: (e) => r(`orders/${e}/edit`),
  /** Edit an invoice (update quantities, apply discounts, add custom items) */
  editInvoice: (e, t) => i(`orders/${e}/edit`, t),
  /** Preview calculated totals for proposed invoice changes without persisting.
   * This is the single source of truth for all invoice calculations.
   * Frontend should call this instead of calculating locally. */
  previewInvoiceEdit: (e, t) => o(`orders/${e}/preview-edit`, t),
  // Fulfillment API
  /** Get fulfillment summary for an invoice (used in fulfillment dialog) */
  getFulfillmentSummary: (e) => r(`orders/${e}/fulfillment-summary`),
  /** Create a shipment for an order */
  createShipment: (e, t) => o(`orders/${e}/shipments`, t),
  /** Update shipment tracking information */
  updateShipment: (e, t) => i(`shipments/${e}`, t),
  /** Delete a shipment (releases items back to unfulfilled) */
  deleteShipment: (e) => p(`shipments/${e}`),
  // ============================================
  // Payment Providers API
  // ============================================
  /** Get all available payment providers (discovered from assemblies) */
  getAvailablePaymentProviders: () => r("payment-providers/available"),
  /** Get all configured payment provider settings */
  getPaymentProviders: () => r("payment-providers"),
  /** Get a specific payment provider setting by ID */
  getPaymentProvider: (e) => r(`payment-providers/${e}`),
  /** Get configuration fields for a payment provider */
  getPaymentProviderFields: (e) => r(`payment-providers/${e}/fields`),
  /** Create/enable a payment provider */
  createPaymentProvider: (e) => o("payment-providers", e),
  /** Update a payment provider setting */
  updatePaymentProvider: (e, t) => i(`payment-providers/${e}`, t),
  /** Delete a payment provider setting */
  deletePaymentProvider: (e) => p(`payment-providers/${e}`),
  /** Toggle payment provider enabled status */
  togglePaymentProvider: (e, t) => i(`payment-providers/${e}/toggle`, { isEnabled: t }),
  /** Reorder payment providers */
  reorderPaymentProviders: (e) => i("payment-providers/reorder", { orderedIds: e }),
  /** Test a payment provider configuration */
  testPaymentProvider: (e, t) => o(`payment-providers/${e}/test`, t),
  // ============================================
  // Payments API
  // ============================================
  /** Get all payments for an invoice */
  getInvoicePayments: (e) => r(`invoices/${e}/payments`),
  /** Get payment status for an invoice */
  getPaymentStatus: (e) => r(`invoices/${e}/payment-status`),
  /** Get a specific payment by ID */
  getPayment: (e) => r(`payments/${e}`),
  /** Record a manual/offline payment */
  recordManualPayment: (e, t) => o(`invoices/${e}/payments/manual`, t),
  /** Process a refund */
  processRefund: (e, t) => o(`payments/${e}/refund`, t),
  // ============================================
  // Shipping Providers API
  // ============================================
  /** Get all available shipping providers (discovered from assemblies) */
  getAvailableShippingProviders: () => r("shipping-providers/available"),
  /** Get all configured shipping provider settings */
  getShippingProviders: () => r("shipping-providers"),
  /** Get a specific shipping provider configuration by ID */
  getShippingProvider: (e) => r(`shipping-providers/${e}`),
  /** Get configuration fields for a shipping provider */
  getShippingProviderFields: (e) => r(`shipping-providers/${e}/fields`),
  /** Create/enable a shipping provider */
  createShippingProvider: (e) => o("shipping-providers", e),
  /** Update a shipping provider configuration */
  updateShippingProvider: (e, t) => i(`shipping-providers/${e}`, t),
  /** Delete a shipping provider configuration */
  deleteShippingProvider: (e) => p(`shipping-providers/${e}`),
  /** Toggle shipping provider enabled status */
  toggleShippingProvider: (e, t) => i(`shipping-providers/${e}/toggle`, { isEnabled: t }),
  /** Reorder shipping providers */
  reorderShippingProviders: (e) => i("shipping-providers/reorder", { orderedIds: e }),
  /** Get method configuration fields and capabilities for a shipping provider */
  getShippingProviderMethodConfig: (e) => r(`shipping-providers/${e}/method-config`),
  /** Get providers available for adding shipping methods to a warehouse */
  getAvailableProvidersForWarehouse: () => r("shipping-providers/available-for-warehouse"),
  /** Test a shipping provider configuration with sample data */
  testShippingProvider: (e, t) => o(`shipping-providers/${e}/test`, t),
  // ============================================
  // Products API
  // ============================================
  /** Get paginated list of products */
  getProducts: (e) => {
    const t = u(e);
    return r(`products${t ? `?${t}` : ""}`);
  },
  /** Get all product types for filtering */
  getProductTypes: () => r("products/types"),
  /** Create a new product type */
  createProductType: (e) => o("products/types", e),
  /** Update an existing product type */
  updateProductType: (e, t) => i(`products/types/${e}`, t),
  /** Delete a product type */
  deleteProductType: (e) => p(`products/types/${e}`),
  /** Get all product categories for filtering */
  getProductCategories: () => r("products/categories"),
  /** Get product option settings (available type and UI aliases) */
  getProductOptionSettings: () => r("settings/product-options"),
  /** Get description editor settings (DataType key for TipTap rich text editor) */
  getDescriptionEditorSettings: () => r("settings/description-editor"),
  /** Get the configured Element Type structure for product content properties */
  getProductElementType: () => r("products/element-type"),
  /** Get available product views for the view selection dropdown */
  getProductViews: () => r("products/views"),
  /** Get full product root with all variants and options */
  getProductDetail: (e) => r(`products/${e}`),
  /** Create new product root with default variant */
  createProduct: (e) => o("products", e),
  /** Update product root */
  updateProduct: (e, t) => i(`products/${e}`, t),
  /** Delete product root and all variants */
  deleteProduct: (e) => p(`products/${e}`),
  // Variant operations
  /** Get a specific variant */
  getVariant: (e, t) => r(`products/${e}/variants/${t}`),
  /** Update a variant */
  updateVariant: (e, t, s) => i(`products/${e}/variants/${t}`, s),
  /** Set a variant as the default */
  setDefaultVariant: (e, t) => i(`products/${e}/variants/${t}/set-default`),
  // Options operations
  /** Save all product options (replaces existing). Variants are automatically regenerated. */
  saveProductOptions: (e, t) => i(`products/${e}/options`, t),
  // Shipping Exclusions
  /** Get available shipping options for a product with their exclusion status */
  getProductShippingOptions: (e) => r(`products/${e}/shipping-options`),
  /** Update shipping exclusions for all variants (bulk mode) */
  updateProductShippingExclusions: (e, t) => i(`products/${e}/shipping-exclusions`, {
    excludedShippingOptionIds: t
  }),
  /** Update shipping exclusions for a specific variant */
  updateVariantShippingExclusions: (e, t, s) => i(`products/${e}/variants/${t}/shipping-exclusions`, {
    excludedShippingOptionIds: s
  }),
  // ============================================
  // Shipping Options API
  // ============================================
  /** Get all warehouses for dropdown selection */
  getWarehouses: () => r("warehouses"),
  /** Get all shipping options */
  getShippingOptions: () => r("shipping-options"),
  /** Get a single shipping option with costs and weight tiers */
  getShippingOption: (e) => r(`shipping-options/${e}`),
  /** Create a new shipping option */
  createShippingOption: (e) => o("shipping-options", e),
  /** Update a shipping option */
  updateShippingOption: (e, t) => i(`shipping-options/${e}`, t),
  /** Delete a shipping option */
  deleteShippingOption: (e) => p(`shipping-options/${e}`),
  /** Add a cost to a shipping option */
  addShippingCost: (e, t) => o(`shipping-options/${e}/costs`, t),
  /** Update a shipping cost */
  updateShippingCost: (e, t) => i(`shipping-costs/${e}`, t),
  /** Delete a shipping cost */
  deleteShippingCost: (e) => p(`shipping-costs/${e}`),
  /** Add a weight tier to a shipping option */
  addShippingWeightTier: (e, t) => o(`shipping-options/${e}/weight-tiers`, t),
  /** Update a weight tier */
  updateShippingWeightTier: (e, t) => i(`shipping-weight-tiers/${e}`, t),
  /** Delete a weight tier */
  deleteShippingWeightTier: (e) => p(`shipping-weight-tiers/${e}`),
  // ============================================
  // Warehouses Management API
  // ============================================
  /** Get all warehouses with summary data for list view */
  getWarehousesList: () => r("warehouses"),
  /** Get a warehouse with full detail including service regions */
  getWarehouseDetail: (e) => r(`warehouses/${e}`),
  /** Create a new warehouse */
  createWarehouse: (e) => o("warehouses", e),
  /** Update a warehouse */
  updateWarehouse: (e, t) => i(`warehouses/${e}`, t),
  /** Delete a warehouse */
  deleteWarehouse: (e, t = !1) => p(`warehouses/${e}${t ? "?force=true" : ""}`),
  // ============================================
  // Service Regions API
  // ============================================
  /** Add a service region to a warehouse */
  addServiceRegion: (e, t) => o(`warehouses/${e}/service-regions`, t),
  /** Update a service region */
  updateServiceRegion: (e, t, s) => i(`warehouses/${e}/service-regions/${t}`, s),
  /** Delete a service region */
  deleteServiceRegion: (e, t) => p(`warehouses/${e}/service-regions/${t}`),
  // ============================================
  // Warehouse Available Destinations API
  // ============================================
  /** Get countries that a warehouse can service based on its service regions */
  getAvailableDestinationsForWarehouse: (e) => r(`warehouses/${e}/available-destinations`),
  /** Get regions that a warehouse can service for a given country */
  getAvailableRegionsForWarehouse: (e, t) => r(`warehouses/${e}/available-destinations/${t}/regions`),
  // ============================================
  // Suppliers API
  // ============================================
  /** Get all suppliers with warehouse count */
  getSuppliers: () => r("suppliers"),
  /** Get a single supplier by ID */
  getSupplier: (e) => r(`suppliers/${e}`),
  /** Create a new supplier */
  createSupplier: (e) => o("suppliers", e),
  /** Update an existing supplier */
  updateSupplier: (e, t) => i(`suppliers/${e}`, t),
  /** Delete a supplier */
  deleteSupplier: (e, t = !1) => p(`suppliers/${e}${t ? "?force=true" : ""}`),
  // ============================================
  // Customers API
  // ============================================
  /** Get paginated list of customers with optional search */
  getCustomers: (e) => {
    const t = u(e);
    return r(`customers${t ? `?${t}` : ""}`);
  },
  /** Get a single customer by ID */
  getCustomer: (e) => r(`customers/${e}`),
  /** Update an existing customer */
  updateCustomer: (e, t) => i(`customers/${e}`, t),
  /** Get segments that a customer belongs to (by email) */
  getCustomerSegmentBadges: (e) => r(`customers/segments?email=${encodeURIComponent(e)}`),
  /** Get all unique customer tags (for autocomplete) */
  getAllCustomerTags: () => r("customers/tags"),
  // ============================================
  // Customer Segments API
  // ============================================
  /** Get all customer segments */
  getCustomerSegments: () => r("customer-segments"),
  /** Get a single customer segment by ID */
  getCustomerSegment: (e) => r(`customer-segments/${e}`),
  /** Create a new customer segment */
  createCustomerSegment: (e) => o("customer-segments", e),
  /** Update a customer segment */
  updateCustomerSegment: (e, t) => i(`customer-segments/${e}`, t),
  /** Delete a customer segment */
  deleteCustomerSegment: (e) => p(`customer-segments/${e}`),
  /** Get paginated members of a segment */
  getSegmentMembers: (e, t = 1, s = 50) => r(
    `customer-segments/${e}/members?page=${t}&pageSize=${s}`
  ),
  /** Add members to a manual segment */
  addSegmentMembers: (e, t) => o(`customer-segments/${e}/members`, t),
  /** Remove members from a manual segment */
  removeSegmentMembers: (e, t) => o(`customer-segments/${e}/members/remove`, t),
  /** Preview customers matching an automated segment's criteria */
  previewSegmentMatches: (e, t = 1, s = 50) => r(
    `customer-segments/${e}/preview?page=${t}&pageSize=${s}`
  ),
  /** Get statistics for a segment */
  getSegmentStatistics: (e) => r(`customer-segments/${e}/statistics`),
  /** Get available criteria fields for automated segments */
  getCriteriaFields: () => r("customer-segments/criteria/fields"),
  /** Validate criteria rules */
  validateCriteria: (e) => o("customer-segments/criteria/validate", e),
  /** Search customers for segment member picker */
  searchCustomersForSegment: (e, t, s = 50) => {
    const n = new URLSearchParams({ search: e, pageSize: String(s) });
    return t?.length && n.set("excludeIds", t.join(",")), r(`customers/search?${n.toString()}`);
  },
  // ============================================
  // Locality API (Countries & Regions)
  // ============================================
  /** Get all countries for warehouse service region selection */
  getLocalityCountries: () => r("countries"),
  /** Get regions/states for a country */
  getLocalityRegions: (e) => r(`countries/${e}/regions`),
  // ============================================
  // Analytics & Reporting API
  // ============================================
  /** Get analytics summary for KPI cards */
  getAnalyticsSummary: (e, t) => r(`reporting/summary?startDate=${e}&endDate=${t}`),
  /** Get daily sales time series data */
  getSalesTimeSeries: (e, t) => r(`reporting/sales-timeseries?startDate=${e}&endDate=${t}`),
  /** Get daily average order value time series data */
  getAovTimeSeries: (e, t) => r(`reporting/aov-timeseries?startDate=${e}&endDate=${t}`),
  /** Get sales breakdown (gross, discounts, returns, net, shipping, taxes) */
  getSalesBreakdown: (e, t) => r(`reporting/breakdown?startDate=${e}&endDate=${t}`),
  // ============================================
  // Exchange Rate Providers API
  // ============================================
  /** Get all available exchange rate providers (discovered from assemblies) */
  getAvailableExchangeRateProviders: () => r("exchange-rate-providers/available"),
  /** Get all exchange rate providers with their settings */
  getExchangeRateProviders: () => r("exchange-rate-providers"),
  /** Get configuration fields for an exchange rate provider */
  getExchangeRateProviderFields: (e) => r(`exchange-rate-providers/${e}/fields`),
  /** Activate an exchange rate provider (only one can be active at a time) */
  activateExchangeRateProvider: (e) => i(`exchange-rate-providers/${e}/activate`),
  /** Save exchange rate provider configuration settings */
  saveExchangeRateProviderSettings: (e, t) => i(`exchange-rate-providers/${e}/settings`, t),
  /** Test an exchange rate provider by fetching rates */
  testExchangeRateProvider: (e) => o(`exchange-rate-providers/${e}/test`),
  /** Force refresh the exchange rate cache */
  refreshExchangeRates: () => o("exchange-rate-providers/refresh"),
  /** Get the current exchange rate snapshot from cache */
  getExchangeRateSnapshot: () => r("exchange-rate-providers/snapshot"),
  // ============================================
  // Filters API
  // ============================================
  /** Get all filter groups with their filters */
  getFilterGroups: () => r("filter-groups"),
  /** Get a single filter group by ID */
  getFilterGroup: (e) => r(`filter-groups/${e}`),
  /** Create a new filter group */
  createFilterGroup: (e) => o("filter-groups", e),
  /** Update a filter group */
  updateFilterGroup: (e, t) => i(`filter-groups/${e}`, t),
  /** Delete a filter group */
  deleteFilterGroup: (e) => p(`filter-groups/${e}`),
  /** Reorder filter groups */
  reorderFilterGroups: (e) => i("filter-groups/reorder", e),
  /** Create a new filter within a group */
  createFilter: (e, t) => o(`filter-groups/${e}/filters`, t),
  /** Get a single filter by ID */
  getFilter: (e) => r(`filters/${e}`),
  /** Update a filter */
  updateFilter: (e, t) => i(`filters/${e}`, t),
  /** Delete a filter */
  deleteFilter: (e) => p(`filters/${e}`),
  /** Reorder filters within a group */
  reorderFilters: (e, t) => i(`filter-groups/${e}/filters/reorder`, t),
  /** Assign filters to a product (replaces existing assignments) */
  assignFiltersToProduct: (e, t) => i(`products/${e}/filters`, { filterIds: t }),
  /** Get filters assigned to a product */
  getFiltersForProduct: (e) => r(`products/${e}/filters`),
  // ============================================
  // Discounts API
  // ============================================
  /** Get paginated list of discounts */
  getDiscounts: (e) => {
    const t = u(e);
    return r(`discounts${t ? `?${t}` : ""}`);
  },
  /** Get a single discount by ID with full details */
  getDiscount: (e) => r(`discounts/${e}`),
  /** Create a new discount */
  createDiscount: (e) => o("discounts", e),
  /** Update an existing discount */
  updateDiscount: (e, t) => i(`discounts/${e}`, t),
  /** Delete a discount */
  deleteDiscount: (e) => p(`discounts/${e}`),
  /** Activate a discount */
  activateDiscount: (e) => i(`discounts/${e}/activate`),
  /** Deactivate a discount */
  deactivateDiscount: (e) => i(`discounts/${e}/deactivate`),
  /** Generate a unique discount code */
  generateDiscountCode: (e = 8) => r(`discounts/generate-code?length=${e}`),
  /** Check if a discount code is available */
  checkDiscountCodeAvailable: (e, t) => {
    const s = new URLSearchParams({ code: e });
    return t && s.set("excludeId", t), r(`discounts/check-code?${s.toString()}`);
  },
  /** Apply a promotional discount to an invoice */
  applyDiscountToInvoice: (e, t) => o(`orders/${e}/apply-discount`, { discountId: t }),
  /** Get performance metrics for a discount */
  getDiscountPerformance: (e, t, s) => {
    const n = new URLSearchParams();
    t && n.set("startDate", t), s && n.set("endDate", s);
    const a = n.toString();
    return r(`discounts/${e}/performance${a ? `?${a}` : ""}`);
  }
};
export {
  m as M,
  $ as s
};
//# sourceMappingURL=merchello-api-DXy2hS5y.js.map
