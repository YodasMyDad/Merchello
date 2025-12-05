const g = "/umbraco/api/v1";
let o = {
  token: void 0,
  baseUrl: "",
  credentials: "same-origin"
};
function v(e) {
  o = { ...o, ...e };
}
async function l() {
  const e = {
    "Content-Type": "application/json"
  };
  if (o.token) {
    const r = await o.token();
    r && (e.Authorization = `Bearer ${r}`);
  }
  return e;
}
async function t(e) {
  try {
    const r = await l(), i = o.baseUrl || "", n = await fetch(`${i}${g}/${e}`, {
      method: "GET",
      credentials: o.credentials,
      headers: r
    });
    if (!n.ok)
      return { error: new Error(`HTTP ${n.status}: ${n.statusText}`) };
    const s = n.headers.get("content-type") || "";
    let p;
    return s.includes("application/json") ? p = await n.json() : p = await n.text(), { data: p };
  } catch (r) {
    return { error: r instanceof Error ? r : new Error(String(r)) };
  }
}
async function d(e, r) {
  try {
    const i = await l(), n = o.baseUrl || "", s = await fetch(`${n}${g}/${e}`, {
      method: "POST",
      credentials: o.credentials,
      headers: i,
      body: r ? JSON.stringify(r) : void 0
    });
    if (!s.ok) {
      const c = await s.text();
      return { error: new Error(c || `HTTP ${s.status}: ${s.statusText}`) };
    }
    return (s.headers.get("content-type") || "").includes("application/json") ? { data: await s.json() } : { data: void 0 };
  } catch (i) {
    return { error: i instanceof Error ? i : new Error(String(i)) };
  }
}
async function a(e, r) {
  try {
    const i = await l(), n = o.baseUrl || "", s = await fetch(`${n}${g}/${e}`, {
      method: "PUT",
      credentials: o.credentials,
      headers: i,
      body: r ? JSON.stringify(r) : void 0
    });
    if (!s.ok) {
      const c = await s.text();
      return { error: new Error(c || `HTTP ${s.status}: ${s.statusText}`) };
    }
    return (s.headers.get("content-type") || "").includes("application/json") ? { data: await s.json() } : { data: void 0 };
  } catch (i) {
    return { error: i instanceof Error ? i : new Error(String(i)) };
  }
}
async function u(e) {
  try {
    const r = await l(), i = o.baseUrl || "", n = await fetch(`${i}${g}/${e}`, {
      method: "DELETE",
      credentials: o.credentials,
      headers: r
    });
    if (!n.ok) {
      const s = await n.text();
      return { error: new Error(s || `HTTP ${n.status}: ${n.statusText}`) };
    }
    return {};
  } catch (r) {
    return { error: r instanceof Error ? r : new Error(String(r)) };
  }
}
function h(e) {
  if (!e) return "";
  const r = new URLSearchParams();
  for (const [i, n] of Object.entries(e))
    n != null && n !== "" && r.append(i, String(n));
  return r.toString();
}
const y = {
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
  addInvoiceNote: (e, r) => d(`orders/${e}/notes`, r),
  updateBillingAddress: (e, r) => a(`orders/${e}/billing-address`, r),
  updateShippingAddress: (e, r) => a(`orders/${e}/shipping-address`, r),
  getOrderStats: () => t("orders/stats"),
  getDashboardStats: () => t("orders/dashboard-stats"),
  /** Export orders within a date range for CSV generation */
  exportOrders: (e) => d("orders/export", e),
  /** Soft-delete multiple orders/invoices */
  deleteOrders: (e) => d("orders/delete", { ids: e }),
  // Invoice Editing API
  /** Get invoice data prepared for editing */
  getInvoiceForEdit: (e) => t(`orders/${e}/edit`),
  /** Edit an invoice (update quantities, apply discounts, add custom items) */
  editInvoice: (e, r) => a(`orders/${e}/edit`, r),
  /** Preview calculated totals for proposed invoice changes without persisting.
   * This is the single source of truth for all invoice calculations.
   * Frontend should call this instead of calculating locally. */
  previewInvoiceEdit: (e, r) => d(`orders/${e}/preview-edit`, r),
  // Fulfillment API
  /** Get fulfillment summary for an invoice (used in fulfillment dialog) */
  getFulfillmentSummary: (e) => t(`orders/${e}/fulfillment-summary`),
  /** Create a shipment for an order */
  createShipment: (e, r) => d(`orders/${e}/shipments`, r),
  /** Update shipment tracking information */
  updateShipment: (e, r) => a(`shipments/${e}`, r),
  /** Delete a shipment (releases items back to unfulfilled) */
  deleteShipment: (e) => u(`shipments/${e}`),
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
  createPaymentProvider: (e) => d("payment-providers", e),
  /** Update a payment provider setting */
  updatePaymentProvider: (e, r) => a(`payment-providers/${e}`, r),
  /** Delete a payment provider setting */
  deletePaymentProvider: (e) => u(`payment-providers/${e}`),
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
  recordManualPayment: (e, r) => d(`invoices/${e}/payments/manual`, r),
  /** Process a refund */
  processRefund: (e, r) => d(`payments/${e}/refund`, r),
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
  createShippingProvider: (e) => d("shipping-providers", e),
  /** Update a shipping provider configuration */
  updateShippingProvider: (e, r) => a(`shipping-providers/${e}`, r),
  /** Delete a shipping provider configuration */
  deleteShippingProvider: (e) => u(`shipping-providers/${e}`),
  /** Toggle shipping provider enabled status */
  toggleShippingProvider: (e, r) => a(`shipping-providers/${e}/toggle`, { isEnabled: r }),
  /** Reorder shipping providers */
  reorderShippingProviders: (e) => a("shipping-providers/reorder", { orderedIds: e })
};
export {
  y as M,
  v as s
};
//# sourceMappingURL=merchello-api-CzSx3Q3Y.js.map
