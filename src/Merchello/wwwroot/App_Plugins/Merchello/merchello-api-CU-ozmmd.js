const u = "/umbraco/api/v1";
let p = {
  token: void 0,
  baseUrl: "",
  credentials: "same-origin"
};
function $(e) {
  p = { ...p, ...e };
}
async function h() {
  const e = {
    "Content-Type": "application/json"
  };
  if (p.token) {
    const r = await p.token();
    r && (e.Authorization = `Bearer ${r}`);
  }
  return e;
}
async function t(e) {
  try {
    const r = await h(), s = p.baseUrl || "", i = await fetch(`${s}${u}/${e}`, {
      method: "GET",
      credentials: p.credentials,
      headers: r
    });
    if (!i.ok)
      return { error: new Error(`HTTP ${i.status}: ${i.statusText}`) };
    const a = i.headers.get("content-type") || "";
    let g;
    return a.includes("application/json") ? g = await i.json() : g = await i.text(), { data: g };
  } catch (r) {
    return { error: r instanceof Error ? r : new Error(String(r)) };
  }
}
async function n(e, r) {
  try {
    const s = await h(), i = p.baseUrl || "", a = await fetch(`${i}${u}/${e}`, {
      method: "POST",
      credentials: p.credentials,
      headers: s,
      body: r ? JSON.stringify(r) : void 0
    });
    if (!a.ok) {
      const c = await a.text();
      return { error: new Error(c || `HTTP ${a.status}: ${a.statusText}`) };
    }
    return (a.headers.get("content-type") || "").includes("application/json") ? { data: await a.json() } : { data: void 0 };
  } catch (s) {
    return { error: s instanceof Error ? s : new Error(String(s)) };
  }
}
async function o(e, r) {
  try {
    const s = await h(), i = p.baseUrl || "", a = await fetch(`${i}${u}/${e}`, {
      method: "PUT",
      credentials: p.credentials,
      headers: s,
      body: r ? JSON.stringify(r) : void 0
    });
    if (!a.ok) {
      const c = await a.text();
      return { error: new Error(c || `HTTP ${a.status}: ${a.statusText}`) };
    }
    return (a.headers.get("content-type") || "").includes("application/json") ? { data: await a.json() } : { data: void 0 };
  } catch (s) {
    return { error: s instanceof Error ? s : new Error(String(s)) };
  }
}
async function d(e) {
  try {
    const r = await h(), s = p.baseUrl || "", i = await fetch(`${s}${u}/${e}`, {
      method: "DELETE",
      credentials: p.credentials,
      headers: r
    });
    if (!i.ok) {
      const a = await i.text();
      return { error: new Error(a || `HTTP ${i.status}: ${i.statusText}`) };
    }
    return {};
  } catch (r) {
    return { error: r instanceof Error ? r : new Error(String(r)) };
  }
}
function l(e) {
  if (!e) return "";
  const r = new URLSearchParams();
  for (const [s, i] of Object.entries(e))
    i != null && i !== "" && r.append(s, String(i));
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
  createTaxGroup: (e) => n("tax-groups", e),
  /** Update an existing tax group */
  updateTaxGroup: (e, r) => o(`tax-groups/${e}`, r),
  /** Delete a tax group */
  deleteTaxGroup: (e) => d(`tax-groups/${e}`),
  // Orders API
  getOrders: (e) => {
    const r = l(e);
    return t(`orders${r ? `?${r}` : ""}`);
  },
  getOrder: (e) => t(`orders/${e}`),
  addInvoiceNote: (e, r) => n(`orders/${e}/notes`, r),
  updateBillingAddress: (e, r) => o(`orders/${e}/billing-address`, r),
  updateShippingAddress: (e, r) => o(`orders/${e}/shipping-address`, r),
  updatePurchaseOrder: (e, r) => o(`orders/${e}/purchase-order`, { purchaseOrder: r }),
  getOrderStats: () => t("orders/stats"),
  getDashboardStats: () => t("orders/dashboard-stats"),
  /** Create a draft order from the admin backoffice */
  createDraftOrder: (e) => n("orders/draft", e),
  /** Search for customers by email or name (returns matching customers with their past shipping addresses) */
  searchCustomers: (e, r) => {
    const s = new URLSearchParams();
    e && s.set("email", e), r && s.set("name", r);
    const i = s.toString();
    return t(`orders/customer-lookup${i ? `?${i}` : ""}`);
  },
  /** Get all orders for a customer by their billing email address */
  getCustomerOrders: (e) => t(`orders/customer/${encodeURIComponent(e)}`),
  /** Export orders within a date range for CSV generation */
  exportOrders: (e) => n("orders/export", e),
  /** Soft-delete multiple orders/invoices */
  deleteOrders: (e) => n("orders/delete", { ids: e }),
  // Invoice Editing API
  /** Get invoice data prepared for editing */
  getInvoiceForEdit: (e) => t(`orders/${e}/edit`),
  /** Edit an invoice (update quantities, apply discounts, add custom items) */
  editInvoice: (e, r) => o(`orders/${e}/edit`, r),
  /** Preview calculated totals for proposed invoice changes without persisting.
   * This is the single source of truth for all invoice calculations.
   * Frontend should call this instead of calculating locally. */
  previewInvoiceEdit: (e, r) => n(`orders/${e}/preview-edit`, r),
  // Fulfillment API
  /** Get fulfillment summary for an invoice (used in fulfillment dialog) */
  getFulfillmentSummary: (e) => t(`orders/${e}/fulfillment-summary`),
  /** Create a shipment for an order */
  createShipment: (e, r) => n(`orders/${e}/shipments`, r),
  /** Update shipment tracking information */
  updateShipment: (e, r) => o(`shipments/${e}`, r),
  /** Delete a shipment (releases items back to unfulfilled) */
  deleteShipment: (e) => d(`shipments/${e}`),
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
  createPaymentProvider: (e) => n("payment-providers", e),
  /** Update a payment provider setting */
  updatePaymentProvider: (e, r) => o(`payment-providers/${e}`, r),
  /** Delete a payment provider setting */
  deletePaymentProvider: (e) => d(`payment-providers/${e}`),
  /** Toggle payment provider enabled status */
  togglePaymentProvider: (e, r) => o(`payment-providers/${e}/toggle`, { isEnabled: r }),
  /** Reorder payment providers */
  reorderPaymentProviders: (e) => o("payment-providers/reorder", { orderedIds: e }),
  /** Test a payment provider configuration */
  testPaymentProvider: (e, r) => n(`payment-providers/${e}/test`, r),
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
  recordManualPayment: (e, r) => n(`invoices/${e}/payments/manual`, r),
  /** Process a refund */
  processRefund: (e, r) => n(`payments/${e}/refund`, r),
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
  createShippingProvider: (e) => n("shipping-providers", e),
  /** Update a shipping provider configuration */
  updateShippingProvider: (e, r) => o(`shipping-providers/${e}`, r),
  /** Delete a shipping provider configuration */
  deleteShippingProvider: (e) => d(`shipping-providers/${e}`),
  /** Toggle shipping provider enabled status */
  toggleShippingProvider: (e, r) => o(`shipping-providers/${e}/toggle`, { isEnabled: r }),
  /** Reorder shipping providers */
  reorderShippingProviders: (e) => o("shipping-providers/reorder", { orderedIds: e }),
  /** Get method configuration fields and capabilities for a shipping provider */
  getShippingProviderMethodConfig: (e) => t(`shipping-providers/${e}/method-config`),
  /** Get providers available for adding shipping methods to a warehouse */
  getAvailableProvidersForWarehouse: () => t("shipping-providers/available-for-warehouse"),
  /** Test a shipping provider configuration with sample data */
  testShippingProvider: (e, r) => n(`shipping-providers/${e}/test`, r),
  // ============================================
  // Products API
  // ============================================
  /** Get paginated list of products */
  getProducts: (e) => {
    const r = l(e);
    return t(`products${r ? `?${r}` : ""}`);
  },
  /** Get all product types for filtering */
  getProductTypes: () => t("products/types"),
  /** Get all product categories for filtering */
  getProductCategories: () => t("products/categories"),
  /** Get product option settings (available type and UI aliases) */
  getProductOptionSettings: () => t("settings/product-options"),
  /** Get description editor settings (DataType key for TipTap rich text editor) */
  getDescriptionEditorSettings: () => t("settings/description-editor"),
  /** Get full product root with all variants and options */
  getProductDetail: (e) => t(`products/${e}`),
  /** Create new product root with default variant */
  createProduct: (e) => n("products", e),
  /** Update product root */
  updateProduct: (e, r) => o(`products/${e}`, r),
  /** Delete product root and all variants */
  deleteProduct: (e) => d(`products/${e}`),
  // Variant operations
  /** Get a specific variant */
  getVariant: (e, r) => t(`products/${e}/variants/${r}`),
  /** Update a variant */
  updateVariant: (e, r, s) => o(`products/${e}/variants/${r}`, s),
  /** Set a variant as the default */
  setDefaultVariant: (e, r) => o(`products/${e}/variants/${r}/set-default`),
  // Options operations
  /** Save all product options (replaces existing). Variants are automatically regenerated. */
  saveProductOptions: (e, r) => o(`products/${e}/options`, r),
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
  createShippingOption: (e) => n("shipping-options", e),
  /** Update a shipping option */
  updateShippingOption: (e, r) => o(`shipping-options/${e}`, r),
  /** Delete a shipping option */
  deleteShippingOption: (e) => d(`shipping-options/${e}`),
  /** Add a cost to a shipping option */
  addShippingCost: (e, r) => n(`shipping-options/${e}/costs`, r),
  /** Update a shipping cost */
  updateShippingCost: (e, r) => o(`shipping-costs/${e}`, r),
  /** Delete a shipping cost */
  deleteShippingCost: (e) => d(`shipping-costs/${e}`),
  /** Add a weight tier to a shipping option */
  addShippingWeightTier: (e, r) => n(`shipping-options/${e}/weight-tiers`, r),
  /** Update a weight tier */
  updateShippingWeightTier: (e, r) => o(`shipping-weight-tiers/${e}`, r),
  /** Delete a weight tier */
  deleteShippingWeightTier: (e) => d(`shipping-weight-tiers/${e}`),
  // ============================================
  // Warehouses Management API
  // ============================================
  /** Get all warehouses with summary data for list view */
  getWarehousesList: () => t("warehouses"),
  /** Get a warehouse with full detail including service regions */
  getWarehouseDetail: (e) => t(`warehouses/${e}`),
  /** Create a new warehouse */
  createWarehouse: (e) => n("warehouses", e),
  /** Update a warehouse */
  updateWarehouse: (e, r) => o(`warehouses/${e}`, r),
  /** Delete a warehouse */
  deleteWarehouse: (e, r = !1) => d(`warehouses/${e}${r ? "?force=true" : ""}`),
  // ============================================
  // Service Regions API
  // ============================================
  /** Add a service region to a warehouse */
  addServiceRegion: (e, r) => n(`warehouses/${e}/service-regions`, r),
  /** Update a service region */
  updateServiceRegion: (e, r, s) => o(`warehouses/${e}/service-regions/${r}`, s),
  /** Delete a service region */
  deleteServiceRegion: (e, r) => d(`warehouses/${e}/service-regions/${r}`),
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
  createSupplier: (e) => n("suppliers", e),
  /** Update an existing supplier */
  updateSupplier: (e, r) => o(`suppliers/${e}`, r),
  /** Delete a supplier */
  deleteSupplier: (e, r = !1) => d(`suppliers/${e}${r ? "?force=true" : ""}`),
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
  getSalesBreakdown: (e, r) => t(`reporting/breakdown?startDate=${e}&endDate=${r}`)
};
export {
  v as M,
  $ as s
};
//# sourceMappingURL=merchello-api-CU-ozmmd.js.map
