const u = "/umbraco/api/v1";
let d = {
  token: void 0,
  baseUrl: "",
  credentials: "same-origin"
};
function $(e) {
  d = { ...d, ...e };
}
async function l() {
  const e = {
    "Content-Type": "application/json"
  };
  if (d.token) {
    const r = await d.token();
    r && (e.Authorization = `Bearer ${r}`);
  }
  return e;
}
async function t(e) {
  try {
    const r = await l(), i = d.baseUrl || "", a = await fetch(`${i}${u}/${e}`, {
      method: "GET",
      credentials: d.credentials,
      headers: r
    });
    if (!a.ok)
      return { error: new Error(`HTTP ${a.status}: ${a.statusText}`) };
    const n = a.headers.get("content-type") || "";
    let g;
    return n.includes("application/json") ? g = await a.json() : g = await a.text(), { data: g };
  } catch (r) {
    return { error: r instanceof Error ? r : new Error(String(r)) };
  }
}
async function o(e, r) {
  try {
    const i = await l(), a = d.baseUrl || "", n = await fetch(`${a}${u}/${e}`, {
      method: "POST",
      credentials: d.credentials,
      headers: i,
      body: r ? JSON.stringify(r) : void 0
    });
    if (!n.ok) {
      const c = await n.text();
      return { error: new Error(c || `HTTP ${n.status}: ${n.statusText}`) };
    }
    return (n.headers.get("content-type") || "").includes("application/json") ? { data: await n.json() } : { data: void 0 };
  } catch (i) {
    return { error: i instanceof Error ? i : new Error(String(i)) };
  }
}
async function s(e, r) {
  try {
    const i = await l(), a = d.baseUrl || "", n = await fetch(`${a}${u}/${e}`, {
      method: "PUT",
      credentials: d.credentials,
      headers: i,
      body: r ? JSON.stringify(r) : void 0
    });
    if (!n.ok) {
      const c = await n.text();
      return { error: new Error(c || `HTTP ${n.status}: ${n.statusText}`) };
    }
    return (n.headers.get("content-type") || "").includes("application/json") ? { data: await n.json() } : { data: void 0 };
  } catch (i) {
    return { error: i instanceof Error ? i : new Error(String(i)) };
  }
}
async function p(e) {
  try {
    const r = await l(), i = d.baseUrl || "", a = await fetch(`${i}${u}/${e}`, {
      method: "DELETE",
      credentials: d.credentials,
      headers: r
    });
    if (!a.ok) {
      const n = await a.text();
      return { error: new Error(n || `HTTP ${a.status}: ${a.statusText}`) };
    }
    return {};
  } catch (r) {
    return { error: r instanceof Error ? r : new Error(String(r)) };
  }
}
function h(e) {
  if (!e) return "";
  const r = new URLSearchParams();
  for (const [i, a] of Object.entries(e))
    a != null && a !== "" && r.append(i, String(a));
  return r.toString();
}
const v = {
  ping: () => t("ping"),
  whatsMyName: () => t("whatsMyName"),
  whatsTheTimeMrWolf: () => t("whatsTheTimeMrWolf"),
  whoAmI: () => t("whoAmI"),
  // Store Settings
  getSettings: () => t("settings"),
  getCountries: () => t("countries"),
  // ============================================
  // Tax Groups API
  // ============================================
  /** Get all tax groups */
  getTaxGroups: () => t("tax-groups"),
  /** Get a single tax group by ID */
  getTaxGroup: (e) => t(`tax-groups/${e}`),
  /** Create a new tax group */
  createTaxGroup: (e) => o("tax-groups", e),
  /** Update an existing tax group */
  updateTaxGroup: (e, r) => s(`tax-groups/${e}`, r),
  /** Delete a tax group */
  deleteTaxGroup: (e) => p(`tax-groups/${e}`),
  // Orders API
  getOrders: (e) => {
    const r = h(e);
    return t(`orders${r ? `?${r}` : ""}`);
  },
  getOrder: (e) => t(`orders/${e}`),
  addInvoiceNote: (e, r) => o(`orders/${e}/notes`, r),
  updateBillingAddress: (e, r) => s(`orders/${e}/billing-address`, r),
  updateShippingAddress: (e, r) => s(`orders/${e}/shipping-address`, r),
  updatePurchaseOrder: (e, r) => s(`orders/${e}/purchase-order`, { purchaseOrder: r }),
  getOrderStats: () => t("orders/stats"),
  getDashboardStats: () => t("orders/dashboard-stats"),
  /** Create a draft order from the admin backoffice */
  createDraftOrder: (e) => o("orders/draft", e),
  /** Search for customers by email or name (returns matching customers with their past shipping addresses) */
  searchCustomers: (e, r) => {
    const i = new URLSearchParams();
    e && i.set("email", e), r && i.set("name", r);
    const a = i.toString();
    return t(`orders/customer-lookup${a ? `?${a}` : ""}`);
  },
  /** Get all orders for a customer by their billing email address */
  getCustomerOrders: (e) => t(`orders/customer/${encodeURIComponent(e)}`),
  /** Export orders within a date range for CSV generation */
  exportOrders: (e) => o("orders/export", e),
  /** Soft-delete multiple orders/invoices */
  deleteOrders: (e) => o("orders/delete", { ids: e }),
  // Invoice Editing API
  /** Get invoice data prepared for editing */
  getInvoiceForEdit: (e) => t(`orders/${e}/edit`),
  /** Edit an invoice (update quantities, apply discounts, add custom items) */
  editInvoice: (e, r) => s(`orders/${e}/edit`, r),
  /** Preview calculated totals for proposed invoice changes without persisting.
   * This is the single source of truth for all invoice calculations.
   * Frontend should call this instead of calculating locally. */
  previewInvoiceEdit: (e, r) => o(`orders/${e}/preview-edit`, r),
  // Fulfillment API
  /** Get fulfillment summary for an invoice (used in fulfillment dialog) */
  getFulfillmentSummary: (e) => t(`orders/${e}/fulfillment-summary`),
  /** Create a shipment for an order */
  createShipment: (e, r) => o(`orders/${e}/shipments`, r),
  /** Update shipment tracking information */
  updateShipment: (e, r) => s(`shipments/${e}`, r),
  /** Delete a shipment (releases items back to unfulfilled) */
  deleteShipment: (e) => p(`shipments/${e}`),
  // ============================================
  // Payment Providers API
  // ============================================
  /** Get all available payment providers (discovered from assemblies) */
  getAvailablePaymentProviders: () => t("payment-providers/available"),
  /** Get all configured payment provider settings */
  getPaymentProviders: () => t("payment-providers"),
  /** Get a specific payment provider setting by ID */
  getPaymentProvider: (e) => t(`payment-providers/${e}`),
  /** Get configuration fields for a payment provider */
  getPaymentProviderFields: (e) => t(`payment-providers/${e}/fields`),
  /** Create/enable a payment provider */
  createPaymentProvider: (e) => o("payment-providers", e),
  /** Update a payment provider setting */
  updatePaymentProvider: (e, r) => s(`payment-providers/${e}`, r),
  /** Delete a payment provider setting */
  deletePaymentProvider: (e) => p(`payment-providers/${e}`),
  /** Toggle payment provider enabled status */
  togglePaymentProvider: (e, r) => s(`payment-providers/${e}/toggle`, { isEnabled: r }),
  /** Reorder payment providers */
  reorderPaymentProviders: (e) => s("payment-providers/reorder", { orderedIds: e }),
  /** Test a payment provider configuration */
  testPaymentProvider: (e, r) => o(`payment-providers/${e}/test`, r),
  // ============================================
  // Payments API
  // ============================================
  /** Get all payments for an invoice */
  getInvoicePayments: (e) => t(`invoices/${e}/payments`),
  /** Get payment status for an invoice */
  getPaymentStatus: (e) => t(`invoices/${e}/payment-status`),
  /** Get a specific payment by ID */
  getPayment: (e) => t(`payments/${e}`),
  /** Record a manual/offline payment */
  recordManualPayment: (e, r) => o(`invoices/${e}/payments/manual`, r),
  /** Process a refund */
  processRefund: (e, r) => o(`payments/${e}/refund`, r),
  // ============================================
  // Shipping Providers API
  // ============================================
  /** Get all available shipping providers (discovered from assemblies) */
  getAvailableShippingProviders: () => t("shipping-providers/available"),
  /** Get all configured shipping provider settings */
  getShippingProviders: () => t("shipping-providers"),
  /** Get a specific shipping provider configuration by ID */
  getShippingProvider: (e) => t(`shipping-providers/${e}`),
  /** Get configuration fields for a shipping provider */
  getShippingProviderFields: (e) => t(`shipping-providers/${e}/fields`),
  /** Create/enable a shipping provider */
  createShippingProvider: (e) => o("shipping-providers", e),
  /** Update a shipping provider configuration */
  updateShippingProvider: (e, r) => s(`shipping-providers/${e}`, r),
  /** Delete a shipping provider configuration */
  deleteShippingProvider: (e) => p(`shipping-providers/${e}`),
  /** Toggle shipping provider enabled status */
  toggleShippingProvider: (e, r) => s(`shipping-providers/${e}/toggle`, { isEnabled: r }),
  /** Reorder shipping providers */
  reorderShippingProviders: (e) => s("shipping-providers/reorder", { orderedIds: e }),
  /** Get method configuration fields and capabilities for a shipping provider */
  getShippingProviderMethodConfig: (e) => t(`shipping-providers/${e}/method-config`),
  /** Get providers available for adding shipping methods to a warehouse */
  getAvailableProvidersForWarehouse: () => t("shipping-providers/available-for-warehouse"),
  /** Test a shipping provider configuration with sample data */
  testShippingProvider: (e, r) => o(`shipping-providers/${e}/test`, r),
  // ============================================
  // Products API
  // ============================================
  /** Get paginated list of products */
  getProducts: (e) => {
    const r = h(e);
    return t(`products${r ? `?${r}` : ""}`);
  },
  /** Get all product types for filtering */
  getProductTypes: () => t("products/types"),
  /** Create a new product type */
  createProductType: (e) => o("products/types", e),
  /** Update an existing product type */
  updateProductType: (e, r) => s(`products/types/${e}`, r),
  /** Delete a product type */
  deleteProductType: (e) => p(`products/types/${e}`),
  /** Get all product categories for filtering */
  getProductCategories: () => t("products/categories"),
  /** Get product option settings (available type and UI aliases) */
  getProductOptionSettings: () => t("settings/product-options"),
  /** Get description editor settings (DataType key for TipTap rich text editor) */
  getDescriptionEditorSettings: () => t("settings/description-editor"),
  /** Get the configured Element Type structure for product content properties */
  getProductElementType: () => t("products/element-type"),
  /** Get available product views for the view selection dropdown */
  getProductViews: () => t("products/views"),
  /** Get full product root with all variants and options */
  getProductDetail: (e) => t(`products/${e}`),
  /** Create new product root with default variant */
  createProduct: (e) => o("products", e),
  /** Update product root */
  updateProduct: (e, r) => s(`products/${e}`, r),
  /** Delete product root and all variants */
  deleteProduct: (e) => p(`products/${e}`),
  // Variant operations
  /** Get a specific variant */
  getVariant: (e, r) => t(`products/${e}/variants/${r}`),
  /** Update a variant */
  updateVariant: (e, r, i) => s(`products/${e}/variants/${r}`, i),
  /** Set a variant as the default */
  setDefaultVariant: (e, r) => s(`products/${e}/variants/${r}/set-default`),
  // Options operations
  /** Save all product options (replaces existing). Variants are automatically regenerated. */
  saveProductOptions: (e, r) => s(`products/${e}/options`, r),
  // ============================================
  // Shipping Options API
  // ============================================
  /** Get all warehouses for dropdown selection */
  getWarehouses: () => t("warehouses"),
  /** Get all shipping options */
  getShippingOptions: () => t("shipping-options"),
  /** Get a single shipping option with costs and weight tiers */
  getShippingOption: (e) => t(`shipping-options/${e}`),
  /** Create a new shipping option */
  createShippingOption: (e) => o("shipping-options", e),
  /** Update a shipping option */
  updateShippingOption: (e, r) => s(`shipping-options/${e}`, r),
  /** Delete a shipping option */
  deleteShippingOption: (e) => p(`shipping-options/${e}`),
  /** Add a cost to a shipping option */
  addShippingCost: (e, r) => o(`shipping-options/${e}/costs`, r),
  /** Update a shipping cost */
  updateShippingCost: (e, r) => s(`shipping-costs/${e}`, r),
  /** Delete a shipping cost */
  deleteShippingCost: (e) => p(`shipping-costs/${e}`),
  /** Add a weight tier to a shipping option */
  addShippingWeightTier: (e, r) => o(`shipping-options/${e}/weight-tiers`, r),
  /** Update a weight tier */
  updateShippingWeightTier: (e, r) => s(`shipping-weight-tiers/${e}`, r),
  /** Delete a weight tier */
  deleteShippingWeightTier: (e) => p(`shipping-weight-tiers/${e}`),
  // ============================================
  // Warehouses Management API
  // ============================================
  /** Get all warehouses with summary data for list view */
  getWarehousesList: () => t("warehouses"),
  /** Get a warehouse with full detail including service regions */
  getWarehouseDetail: (e) => t(`warehouses/${e}`),
  /** Create a new warehouse */
  createWarehouse: (e) => o("warehouses", e),
  /** Update a warehouse */
  updateWarehouse: (e, r) => s(`warehouses/${e}`, r),
  /** Delete a warehouse */
  deleteWarehouse: (e, r = !1) => p(`warehouses/${e}${r ? "?force=true" : ""}`),
  // ============================================
  // Service Regions API
  // ============================================
  /** Add a service region to a warehouse */
  addServiceRegion: (e, r) => o(`warehouses/${e}/service-regions`, r),
  /** Update a service region */
  updateServiceRegion: (e, r, i) => s(`warehouses/${e}/service-regions/${r}`, i),
  /** Delete a service region */
  deleteServiceRegion: (e, r) => p(`warehouses/${e}/service-regions/${r}`),
  // ============================================
  // Warehouse Available Destinations API
  // ============================================
  /** Get countries that a warehouse can service based on its service regions */
  getAvailableDestinationsForWarehouse: (e) => t(`warehouses/${e}/available-destinations`),
  /** Get regions that a warehouse can service for a given country */
  getAvailableRegionsForWarehouse: (e, r) => t(`warehouses/${e}/available-destinations/${r}/regions`),
  // ============================================
  // Suppliers API
  // ============================================
  /** Get all suppliers with warehouse count */
  getSuppliers: () => t("suppliers"),
  /** Get a single supplier by ID */
  getSupplier: (e) => t(`suppliers/${e}`),
  /** Create a new supplier */
  createSupplier: (e) => o("suppliers", e),
  /** Update an existing supplier */
  updateSupplier: (e, r) => s(`suppliers/${e}`, r),
  /** Delete a supplier */
  deleteSupplier: (e, r = !1) => p(`suppliers/${e}${r ? "?force=true" : ""}`),
  // ============================================
  // Locality API (Countries & Regions)
  // ============================================
  /** Get all countries for warehouse service region selection */
  getLocalityCountries: () => t("countries"),
  /** Get regions/states for a country */
  getLocalityRegions: (e) => t(`countries/${e}/regions`),
  // ============================================
  // Analytics & Reporting API
  // ============================================
  /** Get analytics summary for KPI cards */
  getAnalyticsSummary: (e, r) => t(`reporting/summary?startDate=${e}&endDate=${r}`),
  /** Get daily sales time series data */
  getSalesTimeSeries: (e, r) => t(`reporting/sales-timeseries?startDate=${e}&endDate=${r}`),
  /** Get daily average order value time series data */
  getAovTimeSeries: (e, r) => t(`reporting/aov-timeseries?startDate=${e}&endDate=${r}`),
  /** Get sales breakdown (gross, discounts, returns, net, shipping, taxes) */
  getSalesBreakdown: (e, r) => t(`reporting/breakdown?startDate=${e}&endDate=${r}`),
  // ============================================
  // Exchange Rate Providers API
  // ============================================
  /** Get all available exchange rate providers (discovered from assemblies) */
  getAvailableExchangeRateProviders: () => t("exchange-rate-providers/available"),
  /** Get all exchange rate providers with their settings */
  getExchangeRateProviders: () => t("exchange-rate-providers"),
  /** Get configuration fields for an exchange rate provider */
  getExchangeRateProviderFields: (e) => t(`exchange-rate-providers/${e}/fields`),
  /** Activate an exchange rate provider (only one can be active at a time) */
  activateExchangeRateProvider: (e) => s(`exchange-rate-providers/${e}/activate`),
  /** Save exchange rate provider configuration settings */
  saveExchangeRateProviderSettings: (e, r) => s(`exchange-rate-providers/${e}/settings`, r),
  /** Test an exchange rate provider by fetching rates */
  testExchangeRateProvider: (e) => o(`exchange-rate-providers/${e}/test`),
  /** Force refresh the exchange rate cache */
  refreshExchangeRates: () => o("exchange-rate-providers/refresh"),
  /** Get the current exchange rate snapshot from cache */
  getExchangeRateSnapshot: () => t("exchange-rate-providers/snapshot"),
  // ============================================
  // Filters API
  // ============================================
  /** Get all filter groups with their filters */
  getFilterGroups: () => t("filter-groups"),
  /** Get a single filter group by ID */
  getFilterGroup: (e) => t(`filter-groups/${e}`),
  /** Create a new filter group */
  createFilterGroup: (e) => o("filter-groups", e),
  /** Update a filter group */
  updateFilterGroup: (e, r) => s(`filter-groups/${e}`, r),
  /** Delete a filter group */
  deleteFilterGroup: (e) => p(`filter-groups/${e}`),
  /** Reorder filter groups */
  reorderFilterGroups: (e) => s("filter-groups/reorder", e),
  /** Create a new filter within a group */
  createFilter: (e, r) => o(`filter-groups/${e}/filters`, r),
  /** Get a single filter by ID */
  getFilter: (e) => t(`filters/${e}`),
  /** Update a filter */
  updateFilter: (e, r) => s(`filters/${e}`, r),
  /** Delete a filter */
  deleteFilter: (e) => p(`filters/${e}`),
  /** Reorder filters within a group */
  reorderFilters: (e, r) => s(`filter-groups/${e}/filters/reorder`, r),
  /** Assign filters to a product (replaces existing assignments) */
  assignFiltersToProduct: (e, r) => s(`products/${e}/filters`, { filterIds: r }),
  /** Get filters assigned to a product */
  getFiltersForProduct: (e) => t(`products/${e}/filters`)
};
export {
  v as M,
  $ as s
};
//# sourceMappingURL=merchello-api-CkNG-K-m.js.map
