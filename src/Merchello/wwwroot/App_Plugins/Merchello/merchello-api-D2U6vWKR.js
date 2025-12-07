const g = "/umbraco/api/v1";
let i = {
  token: void 0,
  baseUrl: "",
  credentials: "same-origin"
};
function m(e) {
  i = { ...i, ...e };
}
async function u() {
  const e = {
    "Content-Type": "application/json"
  };
  if (i.token) {
    const r = await i.token();
    r && (e.Authorization = `Bearer ${r}`);
  }
  return e;
}
async function t(e) {
  try {
    const r = await u(), n = i.baseUrl || "", s = await fetch(`${n}${g}/${e}`, {
      method: "GET",
      credentials: i.credentials,
      headers: r
    });
    if (!s.ok)
      return { error: new Error(`HTTP ${s.status}: ${s.statusText}`) };
    const o = s.headers.get("content-type") || "";
    let p;
    return o.includes("application/json") ? p = await s.json() : p = await s.text(), { data: p };
  } catch (r) {
    return { error: r instanceof Error ? r : new Error(String(r)) };
  }
}
async function a(e, r) {
  try {
    const n = await u(), s = i.baseUrl || "", o = await fetch(`${s}${g}/${e}`, {
      method: "POST",
      credentials: i.credentials,
      headers: n,
      body: r ? JSON.stringify(r) : void 0
    });
    if (!o.ok) {
      const c = await o.text();
      return { error: new Error(c || `HTTP ${o.status}: ${o.statusText}`) };
    }
    return (o.headers.get("content-type") || "").includes("application/json") ? { data: await o.json() } : { data: void 0 };
  } catch (n) {
    return { error: n instanceof Error ? n : new Error(String(n)) };
  }
}
async function d(e, r) {
  try {
    const n = await u(), s = i.baseUrl || "", o = await fetch(`${s}${g}/${e}`, {
      method: "PUT",
      credentials: i.credentials,
      headers: n,
      body: r ? JSON.stringify(r) : void 0
    });
    if (!o.ok) {
      const c = await o.text();
      return { error: new Error(c || `HTTP ${o.status}: ${o.statusText}`) };
    }
    return (o.headers.get("content-type") || "").includes("application/json") ? { data: await o.json() } : { data: void 0 };
  } catch (n) {
    return { error: n instanceof Error ? n : new Error(String(n)) };
  }
}
async function l(e) {
  try {
    const r = await u(), n = i.baseUrl || "", s = await fetch(`${n}${g}/${e}`, {
      method: "DELETE",
      credentials: i.credentials,
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
function h(e) {
  if (!e) return "";
  const r = new URLSearchParams();
  for (const [n, s] of Object.entries(e))
    s != null && s !== "" && r.append(n, String(s));
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
    const r = h(e);
    return t(`orders${r ? `?${r}` : ""}`);
  },
  getOrder: (e) => t(`orders/${e}`),
  addInvoiceNote: (e, r) => a(`orders/${e}/notes`, r),
  updateBillingAddress: (e, r) => d(`orders/${e}/billing-address`, r),
  updateShippingAddress: (e, r) => d(`orders/${e}/shipping-address`, r),
  getOrderStats: () => t("orders/stats"),
  getDashboardStats: () => t("orders/dashboard-stats"),
  /** Create a draft order from the admin backoffice */
  createDraftOrder: (e) => a("orders/draft", e),
  /** Search for customers by email or name (returns matching customers with their past shipping addresses) */
  searchCustomers: (e, r) => {
    const n = new URLSearchParams();
    e && n.set("email", e), r && n.set("name", r);
    const s = n.toString();
    return t(`orders/customer-lookup${s ? `?${s}` : ""}`);
  },
  /** Get all orders for a customer by their billing email address */
  getCustomerOrders: (e) => t(`orders/customer/${encodeURIComponent(e)}`),
  /** Export orders within a date range for CSV generation */
  exportOrders: (e) => a("orders/export", e),
  /** Soft-delete multiple orders/invoices */
  deleteOrders: (e) => a("orders/delete", { ids: e }),
  // Invoice Editing API
  /** Get invoice data prepared for editing */
  getInvoiceForEdit: (e) => t(`orders/${e}/edit`),
  /** Edit an invoice (update quantities, apply discounts, add custom items) */
  editInvoice: (e, r) => d(`orders/${e}/edit`, r),
  /** Preview calculated totals for proposed invoice changes without persisting.
   * This is the single source of truth for all invoice calculations.
   * Frontend should call this instead of calculating locally. */
  previewInvoiceEdit: (e, r) => a(`orders/${e}/preview-edit`, r),
  // Fulfillment API
  /** Get fulfillment summary for an invoice (used in fulfillment dialog) */
  getFulfillmentSummary: (e) => t(`orders/${e}/fulfillment-summary`),
  /** Create a shipment for an order */
  createShipment: (e, r) => a(`orders/${e}/shipments`, r),
  /** Update shipment tracking information */
  updateShipment: (e, r) => d(`shipments/${e}`, r),
  /** Delete a shipment (releases items back to unfulfilled) */
  deleteShipment: (e) => l(`shipments/${e}`),
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
  createPaymentProvider: (e) => a("payment-providers", e),
  /** Update a payment provider setting */
  updatePaymentProvider: (e, r) => d(`payment-providers/${e}`, r),
  /** Delete a payment provider setting */
  deletePaymentProvider: (e) => l(`payment-providers/${e}`),
  /** Toggle payment provider enabled status */
  togglePaymentProvider: (e, r) => d(`payment-providers/${e}/toggle`, { isEnabled: r }),
  /** Reorder payment providers */
  reorderPaymentProviders: (e) => d("payment-providers/reorder", { orderedIds: e }),
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
  recordManualPayment: (e, r) => a(`invoices/${e}/payments/manual`, r),
  /** Process a refund */
  processRefund: (e, r) => a(`payments/${e}/refund`, r),
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
  createShippingProvider: (e) => a("shipping-providers", e),
  /** Update a shipping provider configuration */
  updateShippingProvider: (e, r) => d(`shipping-providers/${e}`, r),
  /** Delete a shipping provider configuration */
  deleteShippingProvider: (e) => l(`shipping-providers/${e}`),
  /** Toggle shipping provider enabled status */
  toggleShippingProvider: (e, r) => d(`shipping-providers/${e}/toggle`, { isEnabled: r }),
  /** Reorder shipping providers */
  reorderShippingProviders: (e) => d("shipping-providers/reorder", { orderedIds: e }),
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
  /** Get all product categories for filtering */
  getProductCategories: () => t("products/categories")
};
export {
  v as M,
  m as s
};
//# sourceMappingURL=merchello-api-D2U6vWKR.js.map
