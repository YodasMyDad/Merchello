const u = "/umbraco/api/v1";
let o = {
  token: void 0,
  baseUrl: "",
  credentials: "same-origin"
};
function g(e) {
  o = { ...o, ...e };
}
async function l() {
  const e = {
    "Content-Type": "application/json"
  };
  if (o.token) {
    const t = await o.token();
    t && (e.Authorization = `Bearer ${t}`);
  }
  return e;
}
async function n(e) {
  try {
    const t = await l(), a = o.baseUrl || "", r = await fetch(`${a}${u}/${e}`, {
      method: "GET",
      credentials: o.credentials,
      headers: t
    });
    if (!r.ok)
      return { error: new Error(`HTTP ${r.status}: ${r.statusText}`) };
    const s = r.headers.get("content-type") || "";
    let d;
    return s.includes("application/json") ? d = await r.json() : d = await r.text(), { data: d };
  } catch (t) {
    return { error: t instanceof Error ? t : new Error(String(t)) };
  }
}
async function p(e, t) {
  try {
    const a = await l(), r = o.baseUrl || "", s = await fetch(`${r}${u}/${e}`, {
      method: "POST",
      credentials: o.credentials,
      headers: a,
      body: t ? JSON.stringify(t) : void 0
    });
    if (!s.ok) {
      const c = await s.text();
      return { error: new Error(c || `HTTP ${s.status}: ${s.statusText}`) };
    }
    return (s.headers.get("content-type") || "").includes("application/json") ? { data: await s.json() } : { data: void 0 };
  } catch (a) {
    return { error: a instanceof Error ? a : new Error(String(a)) };
  }
}
async function i(e, t) {
  try {
    const a = await l(), r = o.baseUrl || "", s = await fetch(`${r}${u}/${e}`, {
      method: "PUT",
      credentials: o.credentials,
      headers: a,
      body: t ? JSON.stringify(t) : void 0
    });
    if (!s.ok) {
      const c = await s.text();
      return { error: new Error(c || `HTTP ${s.status}: ${s.statusText}`) };
    }
    return (s.headers.get("content-type") || "").includes("application/json") ? { data: await s.json() } : { data: void 0 };
  } catch (a) {
    return { error: a instanceof Error ? a : new Error(String(a)) };
  }
}
async function y(e) {
  try {
    const t = await l(), a = o.baseUrl || "", r = await fetch(`${a}${u}/${e}`, {
      method: "DELETE",
      credentials: o.credentials,
      headers: t
    });
    if (!r.ok) {
      const s = await r.text();
      return { error: new Error(s || `HTTP ${r.status}: ${r.statusText}`) };
    }
    return {};
  } catch (t) {
    return { error: t instanceof Error ? t : new Error(String(t)) };
  }
}
function m(e) {
  if (!e) return "";
  const t = new URLSearchParams();
  for (const [a, r] of Object.entries(e))
    r != null && r !== "" && t.append(a, String(r));
  return t.toString();
}
const h = {
  ping: () => n("ping"),
  whatsMyName: () => n("whatsMyName"),
  whatsTheTimeMrWolf: () => n("whatsTheTimeMrWolf"),
  whoAmI: () => n("whoAmI"),
  // Store Settings
  getSettings: () => n("settings"),
  getCountries: () => n("countries"),
  // Orders API
  getOrders: (e) => {
    const t = m(e);
    return n(`orders${t ? `?${t}` : ""}`);
  },
  getOrder: (e) => n(`orders/${e}`),
  addInvoiceNote: (e, t) => p(`orders/${e}/notes`, t),
  updateBillingAddress: (e, t) => i(`orders/${e}/billing-address`, t),
  updateShippingAddress: (e, t) => i(`orders/${e}/shipping-address`, t),
  getOrderStats: () => n("orders/stats"),
  getDashboardStats: () => n("orders/dashboard-stats"),
  // Fulfillment API
  /** Get fulfillment summary for an invoice (used in fulfillment dialog) */
  getFulfillmentSummary: (e) => n(`orders/${e}/fulfillment-summary`),
  /** Create a shipment for an order */
  createShipment: (e, t) => p(`orders/${e}/shipments`, t),
  /** Update shipment tracking information */
  updateShipment: (e, t) => i(`shipments/${e}`, t),
  /** Delete a shipment (releases items back to unfulfilled) */
  deleteShipment: (e) => y(`shipments/${e}`),
  // ============================================
  // Payment Providers API
  // ============================================
  /** Get all available payment providers (discovered from assemblies) */
  getAvailablePaymentProviders: () => n("payment-providers/available"),
  /** Get all configured payment provider settings */
  getPaymentProviders: () => n("payment-providers"),
  /** Get a specific payment provider setting by ID */
  getPaymentProvider: (e) => n(`payment-providers/${e}`),
  /** Get configuration fields for a payment provider */
  getPaymentProviderFields: (e) => n(`payment-providers/${e}/fields`),
  /** Create/enable a payment provider */
  createPaymentProvider: (e) => p("payment-providers", e),
  /** Update a payment provider setting */
  updatePaymentProvider: (e, t) => i(`payment-providers/${e}`, t),
  /** Delete a payment provider setting */
  deletePaymentProvider: (e) => y(`payment-providers/${e}`),
  /** Toggle payment provider enabled status */
  togglePaymentProvider: (e, t) => i(`payment-providers/${e}/toggle`, { isEnabled: t }),
  /** Reorder payment providers */
  reorderPaymentProviders: (e) => i("payment-providers/reorder", { orderedIds: e }),
  // ============================================
  // Payments API
  // ============================================
  /** Get all payments for an invoice */
  getInvoicePayments: (e) => n(`invoices/${e}/payments`),
  /** Get payment status for an invoice */
  getPaymentStatus: (e) => n(`invoices/${e}/payment-status`),
  /** Get a specific payment by ID */
  getPayment: (e) => n(`payments/${e}`),
  /** Record a manual/offline payment */
  recordManualPayment: (e, t) => p(`invoices/${e}/payments/manual`, t),
  /** Process a refund */
  processRefund: (e, t) => p(`payments/${e}/refund`, t)
};
export {
  h as M,
  g as s
};
//# sourceMappingURL=merchello-api-CoAMZUgg.js.map
