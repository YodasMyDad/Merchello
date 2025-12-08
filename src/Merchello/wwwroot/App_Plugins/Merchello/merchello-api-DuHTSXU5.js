const h = "/umbraco/api/v1";
let p = {
  token: void 0,
  baseUrl: "",
  credentials: "same-origin"
};
function $(e) {
  p = { ...p, ...e };
}
async function u() {
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
    const r = await u(), i = p.baseUrl || "", s = await fetch(`${i}${h}/${e}`, {
      method: "GET",
      credentials: p.credentials,
      headers: r
    });
    if (!s.ok)
      return { error: new Error(`HTTP ${s.status}: ${s.statusText}`) };
    const o = s.headers.get("content-type") || "";
    let c;
    return o.includes("application/json") ? c = await s.json() : c = await s.text(), { data: c };
  } catch (r) {
    return { error: r instanceof Error ? r : new Error(String(r)) };
  }
}
async function n(e, r) {
  try {
    const i = await u(), s = p.baseUrl || "", o = await fetch(`${s}${h}/${e}`, {
      method: "POST",
      credentials: p.credentials,
      headers: i,
      body: r ? JSON.stringify(r) : void 0
    });
    if (!o.ok) {
      const g = await o.text();
      return { error: new Error(g || `HTTP ${o.status}: ${o.statusText}`) };
    }
    return (o.headers.get("content-type") || "").includes("application/json") ? { data: await o.json() } : { data: void 0 };
  } catch (i) {
    return { error: i instanceof Error ? i : new Error(String(i)) };
  }
}
async function a(e, r) {
  try {
    const i = await u(), s = p.baseUrl || "", o = await fetch(`${s}${h}/${e}`, {
      method: "PUT",
      credentials: p.credentials,
      headers: i,
      body: r ? JSON.stringify(r) : void 0
    });
    if (!o.ok) {
      const g = await o.text();
      return { error: new Error(g || `HTTP ${o.status}: ${o.statusText}`) };
    }
    return (o.headers.get("content-type") || "").includes("application/json") ? { data: await o.json() } : { data: void 0 };
  } catch (i) {
    return { error: i instanceof Error ? i : new Error(String(i)) };
  }
}
async function d(e) {
  try {
    const r = await u(), i = p.baseUrl || "", s = await fetch(`${i}${h}/${e}`, {
      method: "DELETE",
      credentials: p.credentials,
      headers: r
    });
    if (!s.ok) {
      const o = await s.text();
      return { error: new Error(o || `HTTP ${s.status}: ${s.statusText}`) };
    }
    return {};
  } catch (r) {
    return { error: r instanceof Error ? r : new Error(String(r)) };
  }
}
function l(e) {
  if (!e) return "";
  const r = new URLSearchParams();
  for (const [i, s] of Object.entries(e))
    s != null && s !== "" && r.append(i, String(s));
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
  getTaxGroups: () => t("tax-groups"),
  // Orders API
  getOrders: (e) => {
    const r = l(e);
    return t(`orders${r ? `?${r}` : ""}`);
  },
  getOrder: (e) => t(`orders/${e}`),
  addInvoiceNote: (e, r) => n(`orders/${e}/notes`, r),
  updateBillingAddress: (e, r) => a(`orders/${e}/billing-address`, r),
  updateShippingAddress: (e, r) => a(`orders/${e}/shipping-address`, r),
  updatePurchaseOrder: (e, r) => a(`orders/${e}/purchase-order`, { purchaseOrder: r }),
  getOrderStats: () => t("orders/stats"),
  getDashboardStats: () => t("orders/dashboard-stats"),
  /** Create a draft order from the admin backoffice */
  createDraftOrder: (e) => n("orders/draft", e),
  /** Search for customers by email or name (returns matching customers with their past shipping addresses) */
  searchCustomers: (e, r) => {
    const i = new URLSearchParams();
    e && i.set("email", e), r && i.set("name", r);
    const s = i.toString();
    return t(`orders/customer-lookup${s ? `?${s}` : ""}`);
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
  editInvoice: (e, r) => a(`orders/${e}/edit`, r),
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
  updateShipment: (e, r) => a(`shipments/${e}`, r),
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
  updatePaymentProvider: (e, r) => a(`payment-providers/${e}`, r),
  /** Delete a payment provider setting */
  deletePaymentProvider: (e) => d(`payment-providers/${e}`),
  /** Toggle payment provider enabled status */
  togglePaymentProvider: (e, r) => a(`payment-providers/${e}/toggle`, { isEnabled: r }),
  /** Reorder payment providers */
  reorderPaymentProviders: (e) => a("payment-providers/reorder", { orderedIds: e }),
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
  updateShippingProvider: (e, r) => a(`shipping-providers/${e}`, r),
  /** Delete a shipping provider configuration */
  deleteShippingProvider: (e) => d(`shipping-providers/${e}`),
  /** Toggle shipping provider enabled status */
  toggleShippingProvider: (e, r) => a(`shipping-providers/${e}/toggle`, { isEnabled: r }),
  /** Reorder shipping providers */
  reorderShippingProviders: (e) => a("shipping-providers/reorder", { orderedIds: e }),
  /** Get method configuration fields and capabilities for a shipping provider */
  getShippingProviderMethodConfig: (e) => t(`shipping-providers/${e}/method-config`),
  /** Get providers available for adding shipping methods to a warehouse */
  getAvailableProvidersForWarehouse: () => t("shipping-providers/available-for-warehouse"),
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
  updateShippingOption: (e, r) => a(`shipping-options/${e}`, r),
  /** Delete a shipping option */
  deleteShippingOption: (e) => d(`shipping-options/${e}`),
  /** Add a cost to a shipping option */
  addShippingCost: (e, r) => n(`shipping-options/${e}/costs`, r),
  /** Update a shipping cost */
  updateShippingCost: (e, r) => a(`shipping-costs/${e}`, r),
  /** Delete a shipping cost */
  deleteShippingCost: (e) => d(`shipping-costs/${e}`),
  /** Add a weight tier to a shipping option */
  addShippingWeightTier: (e, r) => n(`shipping-options/${e}/weight-tiers`, r),
  /** Update a weight tier */
  updateShippingWeightTier: (e, r) => a(`shipping-weight-tiers/${e}`, r),
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
  updateWarehouse: (e, r) => a(`warehouses/${e}`, r),
  /** Delete a warehouse */
  deleteWarehouse: (e, r = !1) => d(`warehouses/${e}${r ? "?force=true" : ""}`),
  // ============================================
  // Service Regions API
  // ============================================
  /** Add a service region to a warehouse */
  addServiceRegion: (e, r) => n(`warehouses/${e}/service-regions`, r),
  /** Update a service region */
  updateServiceRegion: (e, r, i) => a(`warehouses/${e}/service-regions/${r}`, i),
  /** Delete a service region */
  deleteServiceRegion: (e, r) => d(`warehouses/${e}/service-regions/${r}`),
  // ============================================
  // Suppliers API
  // ============================================
  /** Get all suppliers for dropdown selection */
  getSuppliers: () => t("suppliers"),
  /** Create a new supplier (quick create from warehouse form) */
  createSupplier: (e) => n("suppliers", e),
  // ============================================
  // Locality API (Countries & Regions)
  // ============================================
  /** Get all countries for warehouse service region selection */
  getLocalityCountries: () => t("countries"),
  /** Get regions/states for a country */
  getLocalityRegions: (e) => t(`countries/${e}/regions`)
};
export {
  v as M,
  $ as s
};
//# sourceMappingURL=merchello-api-DuHTSXU5.js.map
