const u = "/umbraco/api/v1";
let o = {
  token: void 0,
  baseUrl: "",
  credentials: "same-origin"
};
function f(e) {
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
async function s(e) {
  try {
    const t = await l(), n = o.baseUrl || "", r = await fetch(`${n}${u}/${e}`, {
      method: "GET",
      credentials: o.credentials,
      headers: t
    });
    if (!r.ok)
      return { error: new Error(`HTTP ${r.status}: ${r.statusText}`) };
    const a = r.headers.get("content-type") || "";
    let i;
    return a.includes("application/json") ? i = await r.json() : i = await r.text(), { data: i };
  } catch (t) {
    return { error: t instanceof Error ? t : new Error(String(t)) };
  }
}
async function d(e, t) {
  try {
    const n = await l(), r = o.baseUrl || "", a = await fetch(`${r}${u}/${e}`, {
      method: "POST",
      credentials: o.credentials,
      headers: n,
      body: t ? JSON.stringify(t) : void 0
    });
    if (!a.ok) {
      const c = await a.text();
      return { error: new Error(c || `HTTP ${a.status}: ${a.statusText}`) };
    }
    return (a.headers.get("content-type") || "").includes("application/json") ? { data: await a.json() } : { data: void 0 };
  } catch (n) {
    return { error: n instanceof Error ? n : new Error(String(n)) };
  }
}
async function p(e, t) {
  try {
    const n = await l(), r = o.baseUrl || "", a = await fetch(`${r}${u}/${e}`, {
      method: "PUT",
      credentials: o.credentials,
      headers: n,
      body: t ? JSON.stringify(t) : void 0
    });
    if (!a.ok) {
      const c = await a.text();
      return { error: new Error(c || `HTTP ${a.status}: ${a.statusText}`) };
    }
    return (a.headers.get("content-type") || "").includes("application/json") ? { data: await a.json() } : { data: void 0 };
  } catch (n) {
    return { error: n instanceof Error ? n : new Error(String(n)) };
  }
}
async function y(e) {
  try {
    const t = await l(), n = o.baseUrl || "", r = await fetch(`${n}${u}/${e}`, {
      method: "DELETE",
      credentials: o.credentials,
      headers: t
    });
    if (!r.ok) {
      const a = await r.text();
      return { error: new Error(a || `HTTP ${r.status}: ${r.statusText}`) };
    }
    return {};
  } catch (t) {
    return { error: t instanceof Error ? t : new Error(String(t)) };
  }
}
function m(e) {
  if (!e) return "";
  const t = new URLSearchParams();
  for (const [n, r] of Object.entries(e))
    r != null && r !== "" && t.append(n, String(r));
  return t.toString();
}
const h = {
  ping: () => s("ping"),
  whatsMyName: () => s("whatsMyName"),
  whatsTheTimeMrWolf: () => s("whatsTheTimeMrWolf"),
  whoAmI: () => s("whoAmI"),
  // Store Settings
  getSettings: () => s("settings"),
  // Orders API
  getOrders: (e) => {
    const t = m(e);
    return s(`orders${t ? `?${t}` : ""}`);
  },
  getOrder: (e) => s(`orders/${e}`),
  getOrderStats: () => s("orders/stats"),
  getDashboardStats: () => s("orders/dashboard-stats"),
  // Fulfillment API
  /** Get fulfillment summary for an invoice (used in fulfillment dialog) */
  getFulfillmentSummary: (e) => s(`orders/${e}/fulfillment-summary`),
  /** Create a shipment for an order */
  createShipment: (e, t) => d(`orders/${e}/shipments`, t),
  /** Update shipment tracking information */
  updateShipment: (e, t) => p(`shipments/${e}`, t),
  /** Delete a shipment (releases items back to unfulfilled) */
  deleteShipment: (e) => y(`shipments/${e}`),
  // ============================================
  // Payment Providers API
  // ============================================
  /** Get all available payment providers (discovered from assemblies) */
  getAvailablePaymentProviders: () => s("payment-providers/available"),
  /** Get all configured payment provider settings */
  getPaymentProviders: () => s("payment-providers"),
  /** Get a specific payment provider setting by ID */
  getPaymentProvider: (e) => s(`payment-providers/${e}`),
  /** Get configuration fields for a payment provider */
  getPaymentProviderFields: (e) => s(`payment-providers/${e}/fields`),
  /** Create/enable a payment provider */
  createPaymentProvider: (e) => d("payment-providers", e),
  /** Update a payment provider setting */
  updatePaymentProvider: (e, t) => p(`payment-providers/${e}`, t),
  /** Delete a payment provider setting */
  deletePaymentProvider: (e) => y(`payment-providers/${e}`),
  /** Toggle payment provider enabled status */
  togglePaymentProvider: (e, t) => p(`payment-providers/${e}/toggle`, { isEnabled: t }),
  /** Reorder payment providers */
  reorderPaymentProviders: (e) => p("payment-providers/reorder", { orderedIds: e }),
  // ============================================
  // Payments API
  // ============================================
  /** Get all payments for an invoice */
  getInvoicePayments: (e) => s(`invoices/${e}/payments`),
  /** Get payment status for an invoice */
  getPaymentStatus: (e) => s(`invoices/${e}/payment-status`),
  /** Get a specific payment by ID */
  getPayment: (e) => s(`payments/${e}`),
  /** Record a manual/offline payment */
  recordManualPayment: (e, t) => d(`invoices/${e}/payments/manual`, t),
  /** Process a refund */
  processRefund: (e, t) => d(`payments/${e}/refund`, t)
};
export {
  h as M,
  f as s
};
//# sourceMappingURL=merchello-api-BlCaCKcg.js.map
