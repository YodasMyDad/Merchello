const $ = "/umbraco/api/v1";
let c = {
  token: void 0,
  baseUrl: "",
  credentials: "same-origin"
};
function w(e) {
  c = { ...c, ...e };
}
async function h() {
  const e = {
    "Content-Type": "application/json"
  };
  if (c.token) {
    const t = await c.token();
    t && (e.Authorization = `Bearer ${t}`);
  }
  return e;
}
async function r(e) {
  try {
    const t = await h(), s = c.baseUrl || "", i = await fetch(`${s}${$}/${e}`, {
      method: "GET",
      credentials: c.credentials,
      headers: t
    });
    if (!i.ok)
      return { error: new Error(`HTTP ${i.status}: ${i.statusText}`) };
    const a = i.headers.get("content-type") || "";
    let d;
    return a.includes("application/json") ? d = await i.json() : d = await i.text(), { data: d };
  } catch (t) {
    return { error: t instanceof Error ? t : new Error(String(t)) };
  }
}
async function o(e, t) {
  try {
    const s = await h(), i = c.baseUrl || "", a = await fetch(`${i}${$}/${e}`, {
      method: "POST",
      credentials: c.credentials,
      headers: s,
      body: t ? JSON.stringify(t) : void 0
    });
    if (!a.ok) {
      const l = await a.text();
      return { error: new Error(l || `HTTP ${a.status}: ${a.statusText}`) };
    }
    return (a.headers.get("content-type") || "").includes("application/json") ? { data: await a.json() } : { data: void 0 };
  } catch (s) {
    return { error: s instanceof Error ? s : new Error(String(s)) };
  }
}
async function y(e, t) {
  try {
    const i = { ...await h() };
    delete i["Content-Type"], delete i["content-type"];
    const a = c.baseUrl || "", d = await fetch(`${a}${$}/${e}`, {
      method: "POST",
      credentials: c.credentials,
      headers: i,
      body: t
    });
    if (!d.ok) {
      const m = await d.text();
      return { error: new Error(m || `HTTP ${d.status}: ${d.statusText}`) };
    }
    return (d.headers.get("content-type") || "").includes("application/json") ? { data: await d.json() } : { data: void 0 };
  } catch (s) {
    return { error: s instanceof Error ? s : new Error(String(s)) };
  }
}
async function n(e, t) {
  try {
    const s = await h(), i = c.baseUrl || "", a = await fetch(`${i}${$}/${e}`, {
      method: "PUT",
      credentials: c.credentials,
      headers: s,
      body: t ? JSON.stringify(t) : void 0
    });
    if (!a.ok) {
      const l = await a.text();
      return { error: new Error(l || `HTTP ${a.status}: ${a.statusText}`) };
    }
    return (a.headers.get("content-type") || "").includes("application/json") ? { data: await a.json() } : { data: void 0 };
  } catch (s) {
    return { error: s instanceof Error ? s : new Error(String(s)) };
  }
}
async function p(e) {
  try {
    const t = await h(), s = c.baseUrl || "", i = await fetch(`${s}${$}/${e}`, {
      method: "DELETE",
      credentials: c.credentials,
      headers: t
    });
    if (!i.ok) {
      const a = await i.text();
      return { error: new Error(a || `HTTP ${i.status}: ${i.statusText}`) };
    }
    return {};
  } catch (t) {
    return { error: t instanceof Error ? t : new Error(String(t)) };
  }
}
function u(e) {
  if (!e) return "";
  const t = new URLSearchParams();
  for (const [s, i] of Object.entries(e))
    if (!(i == null || i === "")) {
      if (Array.isArray(i)) {
        for (const a of i)
          a != null && a !== "" && t.append(s, String(a));
        continue;
      }
      t.append(s, String(i));
    }
  return t.toString();
}
const b = {
  ping: () => r("ping"),
  // Store Settings
  getSettings: () => r("settings"),
  getStoreConfiguration: () => r("settings/store-configuration"),
  saveStoreConfiguration: (e) => n("settings/store-configuration", e),
  getCountries: () => r("countries"),
  getUcpFlowDiagnostics: () => r("ucp-test/diagnostics"),
  ucpTestManifest: (e) => o("ucp-test/manifest", e),
  ucpTestCreateSession: (e) => o("ucp-test/sessions/create", e),
  ucpTestGetSession: (e) => o("ucp-test/sessions/get", e),
  ucpTestUpdateSession: (e) => o("ucp-test/sessions/update", e),
  ucpTestCompleteSession: (e) => o("ucp-test/sessions/complete", e),
  ucpTestCancelSession: (e) => o("ucp-test/sessions/cancel", e),
  ucpTestGetOrder: (e) => o("ucp-test/orders/get", e),
  // Seed Data
  getSeedDataStatus: () => r("seed-data/status"),
  installSeedData: () => o("seed-data/install"),
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
  updateTaxGroup: (e, t) => n(`tax-groups/${e}`, t),
  /** Delete a tax group */
  deleteTaxGroup: (e) => p(`tax-groups/${e}`),
  /**
   * Preview tax calculation for a custom item.
   * Used by add-custom-item modal to show tax preview.
   */
  previewCustomItemTax: (e) => o("tax-groups/preview-custom-item", e),
  // ============================================
  // Tax Group Rates API (Geographic Tax Rates)
  // ============================================
  /** Get all geographic rates for a tax group */
  getTaxGroupRates: (e) => r(`tax-groups/${e}/rates`),
  /** Create a new geographic tax rate for a tax group */
  createTaxGroupRate: (e, t) => o(`tax-groups/${e}/rates`, t),
  /** Update an existing geographic tax rate */
  updateTaxGroupRate: (e, t) => n(`tax-groups/rates/${e}`, t),
  /** Delete a geographic tax rate */
  deleteTaxGroupRate: (e) => p(`tax-groups/rates/${e}`),
  // ============================================
  // Tax Providers API
  // ============================================
  /** Get all available tax providers */
  getTaxProviders: () => r("tax-providers"),
  /** Get the currently active tax provider */
  getActiveTaxProvider: () => r("tax-providers/active"),
  /** Get configuration fields for a tax provider */
  getTaxProviderFields: (e) => r(`tax-providers/${e}/fields`),
  /** Activate a tax provider (only one can be active at a time) */
  activateTaxProvider: (e) => n(`tax-providers/${e}/activate`),
  /** Save tax provider configuration settings */
  saveTaxProviderSettings: (e, t) => n(`tax-providers/${e}/settings`, t),
  /** Test/validate a tax provider's configuration */
  testTaxProvider: (e) => o(`tax-providers/${e}/test`),
  // ============================================
  // Shipping Tax Overrides API
  // ============================================
  /** Get all shipping tax overrides */
  getShippingTaxOverrides: () => r("shipping-tax-overrides"),
  /** Get a single shipping tax override by ID */
  getShippingTaxOverride: (e) => r(`shipping-tax-overrides/${e}`),
  /** Create a new shipping tax override */
  createShippingTaxOverride: (e) => o("shipping-tax-overrides", e),
  /** Update an existing shipping tax override */
  updateShippingTaxOverride: (e, t) => n(`shipping-tax-overrides/${e}`, t),
  /** Delete a shipping tax override */
  deleteShippingTaxOverride: (e) => p(`shipping-tax-overrides/${e}`),
  // Orders API
  getOrders: (e) => {
    const t = u(e);
    return r(`orders${t ? `?${t}` : ""}`);
  },
  getOrder: (e) => r(`orders/${e}`),
  addInvoiceNote: (e, t) => o(`orders/${e}/notes`, t),
  updateBillingAddress: (e, t) => n(`orders/${e}/billing-address`, t),
  updateShippingAddress: (e, t) => n(`orders/${e}/shipping-address`, t),
  updatePurchaseOrder: (e, t) => n(`orders/${e}/purchase-order`, { purchaseOrder: t }),
  getOrderStats: () => r("orders/stats"),
  getDashboardStats: () => r("orders/dashboard-stats"),
  /** Create a manual order from the admin backoffice */
  createManualOrder: (e) => o("orders/manual", e),
  /** Search for customers by email or name (returns matching customers with their past shipping addresses) */
  searchCustomers: (e, t) => {
    const s = new URLSearchParams();
    e && s.set("email", e), t && s.set("name", t);
    const i = s.toString();
    return r(`orders/customer-lookup${i ? `?${i}` : ""}`);
  },
  /** Product variant autocomplete for add custom item in order edit (search by name or SKU) */
  searchOrderProducts: (e, t = 10) => {
    const s = new URLSearchParams();
    return s.set("query", e), s.set("limit", t.toString()), r(`orders/product-autocomplete?${s.toString()}`);
  },
  /** Get all orders for a customer by their billing email address */
  getCustomerOrders: (e) => r(`orders/customer/${encodeURIComponent(e)}`),
  // Address Lookup (Backoffice) API
  /** Get address lookup configuration for the backoffice order creation UI */
  getOrderAddressLookupConfig: () => r("orders/address-lookup/config"),
  /** Get address lookup suggestions for a query (backoffice - no rate limiting) */
  getOrderAddressLookupSuggestions: (e) => o("orders/address-lookup/suggestions", e),
  /** Resolve an address lookup suggestion into a full address (backoffice - no rate limiting) */
  resolveOrderAddressLookup: (e) => o("orders/address-lookup/resolve", e),
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
  editInvoice: (e, t) => n(`orders/${e}/edit`, t),
  /** Preview calculated totals for proposed invoice changes without persisting.
   * This is the single source of truth for all invoice calculations.
   * Frontend should call this instead of calculating locally. */
  previewInvoiceEdit: (e, t) => o(`orders/${e}/preview-edit`, t),
  /** Preview calculated discount amount for a line item.
   * This is the single source of truth for discount calculations.
   * Frontend should call this instead of calculating locally. */
  previewDiscount: (e) => o("orders/preview-discount", e),
  // Fulfillment API
  /** Get fulfillment summary for an invoice (used in fulfillment dialog) */
  getFulfillmentSummary: (e) => r(`orders/${e}/fulfillment-summary`),
  /** Explicitly release an order to Supplier Direct fulfilment. */
  releaseOrderFulfillment: (e) => o(`orders/${e}/fulfillment/release`),
  /** Create a shipment for an order */
  createShipment: (e, t) => o(`orders/${e}/shipments`, t),
  /** Update shipment tracking information */
  updateShipment: (e, t) => n(`shipments/${e}`, t),
  /** Update shipment status (e.g., Preparing -> Shipped -> Delivered) */
  updateShipmentStatus: (e, t) => n(`shipments/${e}/status`, t),
  /** Delete a shipment (releases items back to unfulfilled) */
  deleteShipment: (e) => p(`shipments/${e}`),
  // ============================================
  // Outstanding Invoices API
  // ============================================
  /** Get paginated outstanding invoices across all customers */
  getOutstandingInvoices: (e) => {
    const t = u(e);
    return r(`orders/outstanding${t ? `?${t}` : ""}`);
  },
  /** Batch mark multiple invoices as paid */
  batchMarkAsPaid: (e) => o("orders/batch-mark-paid", e),
  /** Get outstanding balance summary for a customer */
  getCustomerOutstandingBalance: (e) => r(`customers/${e}/outstanding`),
  /** Get outstanding invoices for a specific customer */
  getCustomerOutstandingInvoices: (e) => r(`customers/${e}/outstanding/invoices`),
  /** Download a customer statement PDF */
  downloadCustomerStatement: async (e, t, s) => {
    try {
      const i = await h(), a = c.baseUrl || "", d = new URLSearchParams();
      t && d.append("periodStart", t), s && d.append("periodEnd", s);
      const l = d.toString(), m = `${a}${$}/customers/${e}/statement${l ? `?${l}` : ""}`, g = await fetch(m, {
        method: "GET",
        credentials: c.credentials,
        headers: { ...i, "Content-Type": "" }
        // Remove content-type for file download
      });
      if (!g.ok)
        return { error: new Error(`HTTP ${g.status}: ${g.statusText}`) };
      const P = await g.blob(), f = g.headers.get("content-disposition");
      let S = "statement.pdf";
      if (f) {
        const v = f.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        v && v[1] && (S = v[1].replace(/['"]/g, ""));
      }
      return { blob: P, filename: S };
    } catch (i) {
      return { error: i instanceof Error ? i : new Error(String(i)) };
    }
  },
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
  updatePaymentProvider: (e, t) => n(`payment-providers/${e}`, t),
  /** Delete a payment provider setting */
  deletePaymentProvider: (e) => p(`payment-providers/${e}`),
  /** Toggle payment provider enabled status */
  togglePaymentProvider: (e, t) => n(`payment-providers/${e}/toggle`, { isEnabled: t }),
  /** Reorder payment providers */
  reorderPaymentProviders: (e) => n("payment-providers/reorder", { orderedIds: e }),
  /** Test a payment provider configuration */
  testPaymentProvider: (e, t) => o(`payment-providers/${e}/test`, t),
  /** Process a test payment (for hosted fields/widget integration types) */
  processTestPayment: (e, t) => o(`payment-providers/${e}/test/process-payment`, t),
  /** Get express checkout client configuration for testing */
  getTestExpressConfig: (e, t, s = 100) => r(`payment-providers/${e}/test/express-config?methodAlias=${t}&amount=${s}`),
  /** Get available webhook event templates for simulation */
  getWebhookEventTemplates: (e) => r(`payment-providers/${e}/test/webhook-events`),
  /** Simulate a webhook event for testing */
  simulateWebhook: (e, t) => o(`payment-providers/${e}/test/simulate-webhook`, t),
  /** Test payment link generation for a provider */
  testPaymentLink: (e, t) => o(`payment-providers/${e}/test/payment-link`, t),
  /** Test vault setup session creation */
  testVaultSetup: (e, t) => o(`payment-providers/${e}/test/vault-setup`, t),
  /** Test vault setup confirmation */
  testVaultConfirm: (e, t) => o(`payment-providers/${e}/test/vault-confirm`, t),
  /** Test charging a vaulted payment method */
  testVaultCharge: (e, t) => o(`payment-providers/${e}/test/vault-charge`, t),
  /** Delete a vaulted payment method (for testing) */
  testVaultDelete: (e, t) => p(`payment-providers/${e}/test/vault/${t}`),
  /** Get checkout preview showing which payment methods will appear and their deduplication status */
  getCheckoutPaymentPreview: () => r("payment-providers/checkout-preview"),
  // ============================================
  // Payment Method Settings API
  // ============================================
  /** Get all payment methods for a provider with their settings */
  getPaymentProviderMethods: (e) => r(`payment-providers/${e}/methods`),
  /** Update a payment method setting (enable/disable) */
  updatePaymentMethodSetting: (e, t, s) => n(`payment-providers/${e}/methods/${t}`, s),
  /** Reorder payment methods for a provider */
  reorderPaymentMethods: (e, t) => n(`payment-providers/${e}/methods/reorder`, t),
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
  /** Get form fields for manual payments (payment method options, etc.) */
  getManualPaymentFormFields: () => r("payments/manual/form-fields"),
  /** Process a refund */
  processRefund: (e, t) => o(`payments/${e}/refund`, t),
  /** Preview a refund calculation without processing it */
  previewRefund: (e, t) => o(`payments/${e}/preview-refund`, t ?? {}),
  // ============================================
  // Payment Links API
  // ============================================
  /** Get payment providers that support payment links */
  getPaymentLinkProviders: () => r("payment-links/providers"),
  /** Create a payment link for an invoice */
  createPaymentLink: (e) => o("payment-links", e),
  /** Get the current payment link for an invoice */
  getPaymentLink: (e) => r(`invoices/${e}/payment-link`),
  /** Deactivate the payment link for an invoice */
  deactivatePaymentLink: (e) => o(`invoices/${e}/payment-link/deactivate`),
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
  updateShippingProvider: (e, t) => n(`shipping-providers/${e}`, t),
  /** Delete a shipping provider configuration */
  deleteShippingProvider: (e) => p(`shipping-providers/${e}`),
  /** Toggle shipping provider enabled status */
  toggleShippingProvider: (e, t) => n(`shipping-providers/${e}/toggle`, { isEnabled: t }),
  /** Reorder shipping providers */
  reorderShippingProviders: (e) => n("shipping-providers/reorder", { orderedIds: e }),
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
  updateProductType: (e, t) => n(`products/types/${e}`, t),
  /** Delete a product type */
  deleteProductType: (e) => p(`products/types/${e}`),
  /** Get all product collections with product counts */
  getProductCollections: () => r("products/collections"),
  /** Create a new product collection */
  createProductCollection: (e) => o("products/collections", e),
  /** Update a product collection */
  updateProductCollection: (e, t) => n(`products/collections/${e}`, t),
  /** Delete a product collection */
  deleteProductCollection: (e) => p(`products/collections/${e}`),
  /** Get product option settings (available type and UI aliases) */
  getProductOptionSettings: () => r("settings/product-options"),
  /** Get description editor settings (DataType key for TipTap rich text editor) */
  getDescriptionEditorSettings: () => r("settings/description-editor"),
  /** Get available Element Types for product content properties */
  getElementTypes: () => r("products/element-types"),
  /** Get the Element Type structure for product content properties by alias */
  getProductElementType: (e) => r(`products/element-type?alias=${encodeURIComponent(e)}`),
  /** Get available product views for the view selection dropdown */
  getProductViews: () => r("products/views"),
  /** Get Google Shopping categories for autocomplete (country resolved by backend settings). */
  getGoogleShoppingCategories: (e) => {
    const t = u(e);
    return r(`products/google-shopping-categories${t ? `?${t}` : ""}`);
  },
  /** Get full product root with all variants and options */
  getProductDetail: (e) => r(`products/${e}`),
  /** Create new product root with default variant */
  createProduct: (e) => o("products", e),
  /** Update product root */
  updateProduct: (e, t) => n(`products/${e}`, t),
  /** Delete product root and all variants */
  deleteProduct: (e) => p(`products/${e}`),
  // Variant operations
  /** Get a specific variant */
  getVariant: (e, t) => r(`products/${e}/variants/${t}`),
  /** Update a variant */
  updateVariant: (e, t, s) => n(`products/${e}/variants/${t}`, s),
  /** Set a variant as the default */
  setDefaultVariant: (e, t) => n(`products/${e}/variants/${t}/set-default`),
  /**
   * Get product variants by their IDs for property editors.
   * Returns lookup results with a 'found' flag to detect deleted products.
   */
  getVariantsByIds: (e) => o("products/variants/by-ids", e),
  // Options operations
  /** Save all product options (replaces existing). Variants are automatically regenerated. */
  saveProductOptions: (e, t) => n(`products/${e}/options`, t),
  // Shipping Exclusions
  /** Get available shipping options for a product with their exclusion status */
  getProductShippingOptions: (e) => r(`products/${e}/shipping-options`),
  /** Update shipping exclusions for all variants (bulk mode) */
  updateProductShippingExclusions: (e, t) => n(`products/${e}/shipping-exclusions`, {
    excludedShippingOptionIds: t
  }),
  /** Update shipping exclusions for a specific variant */
  updateVariantShippingExclusions: (e, t, s) => n(`products/${e}/variants/${t}/shipping-exclusions`, {
    excludedShippingOptionIds: s
  }),
  /**
   * Get fulfillment options for a product variant to a destination.
   * Returns the best warehouse that can fulfill based on priority, region eligibility, and stock.
   * This is a single API call replacement for frontend warehouse iteration.
   */
  getProductFulfillmentOptions: (e, t, s) => {
    const i = new URLSearchParams();
    return i.set("destinationCountryCode", t), s && i.set("destinationStateCode", s), r(`products/variants/${e}/fulfillment-options?${i.toString()}`);
  },
  /**
   * Get the default fulfilling warehouse for a product variant based on priority and stock.
   * Used when no destination address is known (e.g., browsing products before checkout).
   * Unlike getProductFulfillmentOptions, this does NOT check region serviceability.
   */
  getDefaultFulfillingWarehouse: (e) => r(`products/variants/${e}/default-warehouse`),
  /**
   * Preview addon price calculation for a variant.
   * Returns base price, addon total, and combined total calculated by backend.
   * This is the single source of truth for addon pricing - frontend should use this.
   */
  previewAddonPrice: (e, t) => o(`products/variants/${e}/preview-addon-price`, t),
  // ============================================
  // Product Feeds API
  // ============================================
  /** Get all configured product feeds */
  getProductFeeds: () => r("product-feeds"),
  /** Get a product feed by ID */
  getProductFeed: (e) => r(`product-feeds/${e}`),
  /** Create a product feed */
  createProductFeed: (e) => o("product-feeds", e),
  /** Update a product feed */
  updateProductFeed: (e, t) => n(`product-feeds/${e}`, t),
  /** Delete a product feed */
  deleteProductFeed: (e) => p(`product-feeds/${e}`),
  /** Rebuild product and promotions XML snapshots for a feed */
  rebuildProductFeed: (e) => o(`product-feeds/${e}/rebuild`),
  /** Preview feed generation diagnostics */
  previewProductFeed: (e) => r(`product-feeds/${e}/preview`),
  /** Validate feed output and run Google spec checks */
  validateProductFeed: (e, t) => o(`product-feeds/${e}/validate`, t),
  /** Get available dynamic value resolvers for custom labels/fields */
  getProductFeedResolvers: () => r("product-feeds/resolvers"),
  // ============================================
  // Product Import / Export API
  // ============================================
  /** Validate an import CSV without mutating products. */
  validateProductImport: (e, t) => {
    const s = new FormData();
    return s.append("file", e), s.append("profile", String(t.profile)), t.maxIssues !== null && t.maxIssues !== void 0 && s.append("maxIssues", String(t.maxIssues)), y("product-sync/imports/validate", s);
  },
  /** Queue a product import run after validation. */
  startProductImport: (e, t) => {
    const s = new FormData();
    return s.append("file", e), s.append("profile", String(t.profile)), s.append("continueOnImageFailure", String(t.continueOnImageFailure)), t.maxIssues !== null && t.maxIssues !== void 0 && s.append("maxIssues", String(t.maxIssues)), y("product-sync/imports/start", s);
  },
  /** Queue a product export run. */
  startProductExport: (e) => o("product-sync/exports/start", e),
  /** Get paginated sync run history. */
  getProductSyncRuns: (e) => {
    const t = u(e);
    return r(`product-sync/runs${t ? `?${t}` : ""}`);
  },
  /** Get a single sync run by id. */
  getProductSyncRun: (e) => r(`product-sync/runs/${e}`),
  /** Get paginated issues for a run. */
  getProductSyncRunIssues: (e, t) => {
    const s = u(t);
    return r(`product-sync/runs/${e}/issues${s ? `?${s}` : ""}`);
  },
  /** Download completed export CSV artifact for a run. */
  downloadProductSyncExport: async (e) => {
    try {
      const s = { ...await h() };
      delete s["Content-Type"], delete s["content-type"];
      const i = c.baseUrl || "", a = await fetch(`${i}${$}/product-sync/runs/${e}/download`, {
        method: "GET",
        credentials: c.credentials,
        headers: s
      });
      if (!a.ok) {
        const g = await a.text();
        return { error: new Error(g || `HTTP ${a.status}: ${a.statusText}`) };
      }
      const d = await a.blob(), l = a.headers.get("content-disposition");
      let m = `product-sync-${e}.csv`;
      if (l) {
        const g = l.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        g && g[1] && (m = g[1].replace(/['"]/g, ""));
      }
      return { blob: d, fileName: m };
    } catch (t) {
      return { error: t instanceof Error ? t : new Error(String(t)) };
    }
  },
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
  updateShippingOption: (e, t) => n(`shipping-options/${e}`, t),
  /** Delete a shipping option */
  deleteShippingOption: (e) => p(`shipping-options/${e}`),
  /** Add a cost to a shipping option */
  addShippingCost: (e, t) => o(`shipping-options/${e}/costs`, t),
  /** Update a shipping cost */
  updateShippingCost: (e, t) => n(`shipping-costs/${e}`, t),
  /** Delete a shipping cost */
  deleteShippingCost: (e) => p(`shipping-costs/${e}`),
  /** Add a weight tier to a shipping option */
  addShippingWeightTier: (e, t) => o(`shipping-options/${e}/weight-tiers`, t),
  /** Update a weight tier */
  updateShippingWeightTier: (e, t) => n(`shipping-weight-tiers/${e}`, t),
  /** Delete a weight tier */
  deleteShippingWeightTier: (e) => p(`shipping-weight-tiers/${e}`),
  /** Add a postcode rule to a shipping option */
  addShippingPostcodeRule: (e, t) => o(`shipping-options/${e}/postcode-rules`, t),
  /** Update a postcode rule */
  updateShippingPostcodeRule: (e, t) => n(`shipping-postcode-rules/${e}`, t),
  /** Delete a postcode rule */
  deleteShippingPostcodeRule: (e) => p(`shipping-postcode-rules/${e}`),
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
  updateWarehouse: (e, t) => n(`warehouses/${e}`, t),
  /** Delete a warehouse */
  deleteWarehouse: (e, t = !1) => p(`warehouses/${e}${t ? "?force=true" : ""}`),
  // ============================================
  // Service Regions API
  // ============================================
  /** Add a service region to a warehouse */
  addServiceRegion: (e, t) => o(`warehouses/${e}/service-regions`, t),
  /** Update a service region */
  updateServiceRegion: (e, t, s) => n(`warehouses/${e}/service-regions/${t}`, s),
  /** Delete a service region */
  deleteServiceRegion: (e, t) => p(`warehouses/${e}/service-regions/${t}`),
  // ============================================
  // Warehouse Products API
  // ============================================
  /** Get paginated products assigned to a warehouse */
  getWarehouseProducts: (e, t = 1, s = 20, i) => {
    const a = new URLSearchParams({ page: String(t), pageSize: String(s) });
    return i && a.set("search", i), r(`warehouses/${e}/products?${a.toString()}`);
  },
  /** Add products to a warehouse */
  addProductsToWarehouse: (e, t) => o(`warehouses/${e}/products`, { productRootIds: t }),
  /** Remove products from a warehouse */
  removeProductsFromWarehouse: (e, t) => o(`warehouses/${e}/products/remove`, { productRootIds: t }),
  // ============================================
  // Warehouse Available Destinations API
  // ============================================
  /** Get countries that a warehouse can service based on its service regions */
  getAvailableDestinationsForWarehouse: (e) => r(`warehouses/${e}/available-destinations`),
  /** Get regions that a warehouse can service for a given country */
  getAvailableRegionsForWarehouse: (e, t) => r(`warehouses/${e}/available-destinations/${t}/regions`),
  /** Get available shipping options for a warehouse and destination */
  getShippingOptionsForWarehouse: (e, t, s) => {
    const i = new URLSearchParams();
    return i.set("destinationCountryCode", t), s && i.set("destinationStateCode", s), r(`warehouses/${e}/shipping-options?${i.toString()}`);
  },
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
  updateSupplier: (e, t) => n(`suppliers/${e}`, t),
  /** Delete a supplier */
  deleteSupplier: (e, t = !1) => p(`suppliers/${e}${t ? "?force=true" : ""}`),
  /** Test supplier FTP/SFTP connection settings */
  testSupplierFtpConnection: (e) => o("suppliers/test-ftp-connection", e),
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
  updateCustomer: (e, t) => n(`customers/${e}`, t),
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
  updateCustomerSegment: (e, t) => n(`customer-segments/${e}`, t),
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
    const i = new URLSearchParams({ search: e, pageSize: String(s) });
    return t?.length && i.set("excludeIds", t.join(",")), r(`customers/search?${i.toString()}`);
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
  /**
   * Get daily sales time series data with backend-calculated totals and percent change.
   * Preferred over getSalesTimeSeries - avoids frontend calculation of aggregates.
   */
  getSalesTimeSeriesWithTotals: (e, t) => r(`reporting/sales-timeseries-with-totals?startDate=${e}&endDate=${t}`),
  /** Get daily average order value time series data */
  getAovTimeSeries: (e, t) => r(`reporting/aov-timeseries?startDate=${e}&endDate=${t}`),
  /**
   * Get daily AOV time series data with backend-calculated totals and percent change.
   * Preferred over getAovTimeSeries - avoids frontend calculation of aggregates.
   */
  getAovTimeSeriesWithTotals: (e, t) => r(`reporting/aov-timeseries-with-totals?startDate=${e}&endDate=${t}`),
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
  activateExchangeRateProvider: (e) => n(`exchange-rate-providers/${e}/activate`),
  /** Save exchange rate provider configuration settings */
  saveExchangeRateProviderSettings: (e, t) => n(`exchange-rate-providers/${e}/settings`, t),
  /** Test an exchange rate provider by fetching rates */
  testExchangeRateProvider: (e) => o(`exchange-rate-providers/${e}/test`),
  /** Force refresh the exchange rate cache */
  refreshExchangeRates: () => o("exchange-rate-providers/refresh"),
  /** Get the current exchange rate snapshot from cache */
  getExchangeRateSnapshot: () => r("exchange-rate-providers/snapshot"),
  // ============================================
  // Address Lookup Providers API
  // ============================================
  /** Get all address lookup providers */
  getAddressLookupProviders: () => r("address-lookup-providers"),
  /** Get the currently active address lookup provider */
  getActiveAddressLookupProvider: () => r("address-lookup-providers/active"),
  /** Get configuration fields for an address lookup provider */
  getAddressLookupProviderFields: (e) => r(`address-lookup-providers/${e}/fields`),
  /** Activate an address lookup provider (only one can be active at a time) */
  activateAddressLookupProvider: (e) => n(`address-lookup-providers/${e}/activate`),
  /** Deactivate all address lookup providers */
  deactivateAddressLookupProviders: () => n("address-lookup-providers/deactivate"),
  /** Save address lookup provider configuration settings */
  saveAddressLookupProviderSettings: (e, t) => n(`address-lookup-providers/${e}/settings`, t),
  /** Test/validate an address lookup provider's configuration */
  testAddressLookupProvider: (e) => o(`address-lookup-providers/${e}/test`),
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
  updateFilterGroup: (e, t) => n(`filter-groups/${e}`, t),
  /** Delete a filter group */
  deleteFilterGroup: (e) => p(`filter-groups/${e}`),
  /** Reorder filter groups */
  reorderFilterGroups: (e) => n("filter-groups/reorder", e),
  /** Create a new filter within a group */
  createFilter: (e, t) => o(`filter-groups/${e}/filters`, t),
  /** Get a single filter by ID */
  getFilter: (e) => r(`filters/${e}`),
  /** Update a filter */
  updateFilter: (e, t) => n(`filters/${e}`, t),
  /** Delete a filter */
  deleteFilter: (e) => p(`filters/${e}`),
  /** Reorder filters within a group */
  reorderFilters: (e, t) => n(`filter-groups/${e}/filters/reorder`, t),
  /** Assign filters to a product (replaces existing assignments) */
  assignFiltersToProduct: (e, t) => n(`products/${e}/filters`, { filterIds: t }),
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
  updateDiscount: (e, t) => n(`discounts/${e}`, t),
  /** Delete a discount */
  deleteDiscount: (e) => p(`discounts/${e}`),
  /** Activate a discount */
  activateDiscount: (e) => o(`discounts/${e}/activate`),
  /** Deactivate a discount */
  deactivateDiscount: (e) => o(`discounts/${e}/deactivate`),
  /** Generate a unique discount code */
  generateDiscountCode: (e = 8) => r(`discounts/generate-code?length=${e}`),
  /** Check if a discount code is available */
  checkDiscountCodeAvailable: (e, t) => {
    const s = new URLSearchParams({ code: e });
    return t && s.set("excludeId", t), r(`discounts/validate-code?${s.toString()}`);
  },
  /** Apply a promotional discount to an invoice */
  applyDiscountToInvoice: (e, t) => o(`orders/${e}/apply-discount`, { discountId: t }),
  /** Get performance metrics for a discount */
  getDiscountPerformance: (e, t, s) => {
    const i = new URLSearchParams();
    t && i.set("startDate", t), s && i.set("endDate", s);
    const a = i.toString();
    return r(`discounts/${e}/performance${a ? `?${a}` : ""}`);
  },
  // ============================================
  // Upsells API
  // ============================================
  /** Get paginated list of upsell rules */
  getUpsells: (e) => {
    const t = u(e);
    return r(`upsells${t ? `?${t}` : ""}`);
  },
  /** Get a single upsell rule by ID with full details */
  getUpsell: (e) => r(`upsells/${e}`),
  /** Create a new upsell rule */
  createUpsell: (e) => o("upsells", e),
  /** Update an existing upsell rule */
  updateUpsell: (e, t) => n(`upsells/${e}`, t),
  /** Delete an upsell rule */
  deleteUpsell: (e) => p(`upsells/${e}`),
  /** Activate an upsell rule */
  activateUpsell: (e) => o(`upsells/${e}/activate`),
  /** Deactivate an upsell rule */
  deactivateUpsell: (e) => o(`upsells/${e}/deactivate`),
  /** Get performance metrics for an upsell rule */
  getUpsellPerformance: (e, t, s) => {
    const i = new URLSearchParams();
    t && i.set("startDate", t), s && i.set("endDate", s);
    const a = i.toString();
    return r(`upsells/${e}/performance${a ? `?${a}` : ""}`);
  },
  /** Get upsell analytics dashboard data */
  getUpsellDashboard: (e, t) => {
    const s = new URLSearchParams();
    e && s.set("startDate", e), t && s.set("endDate", t);
    const i = s.toString();
    return r(`upsells/dashboard${i ? `?${i}` : ""}`);
  },
  /** Get aggregated upsell summary report */
  getUpsellSummary: (e, t, s) => {
    const i = new URLSearchParams();
    e && i.set("startDate", e), t && i.set("endDate", t), s && i.set("topN", s.toString());
    const a = i.toString();
    return r(`upsells/summary${a ? `?${a}` : ""}`);
  },
  // ============================================
  // Email Configurations API
  // ============================================
  /** Get paginated list of email configurations */
  getEmailConfigurations: (e) => {
    const t = u(e);
    return r(`emails${t ? `?${t}` : ""}`);
  },
  /** Get a single email configuration by ID with full detail */
  getEmailConfiguration: (e) => r(`emails/${e}`),
  /** Create a new email configuration */
  createEmailConfiguration: (e) => o("emails", e),
  /** Update an existing email configuration */
  updateEmailConfiguration: (e, t) => n(`emails/${e}`, t),
  /** Delete an email configuration */
  deleteEmailConfiguration: (e) => p(`emails/${e}`),
  /** Toggle email configuration enabled status */
  toggleEmailConfiguration: (e) => o(`emails/${e}/toggle`),
  /** Preview an email without sending */
  previewEmail: (e) => r(`emails/${e}/preview`),
  /** Send a test email */
  sendTestEmail: (e, t) => o(`emails/${e}/test`, t),
  // ============================================
  // Email Metadata API
  // ============================================
  /** Get all available email topics */
  getEmailTopics: () => r("emails/topics"),
  /** Get email topics grouped by category */
  getEmailTopicsGrouped: () => r("emails/topics/categories"),
  /** Get available tokens for a specific topic */
  getTopicTokens: (e) => r(`emails/topics/${encodeURIComponent(e)}/tokens`),
  /** Get all available email templates */
  getEmailTemplates: () => r("emails/templates"),
  /** Check if a template path exists */
  checkTemplateExists: (e) => r(`emails/templates/exists?path=${encodeURIComponent(e)}`),
  /** Get all available email attachments */
  getEmailAttachments: () => r("emails/attachments"),
  /** Get available attachments for a specific topic */
  getTopicAttachments: (e) => r(`emails/topics/${encodeURIComponent(e)}/attachments`),
  // ============================================
  // Webhooks API
  // ============================================
  /** Get paginated list of webhook subscriptions */
  getWebhookSubscriptions: (e) => {
    const t = u(e);
    return r(`webhooks${t ? `?${t}` : ""}`);
  },
  /** Get a single webhook subscription by ID with full detail */
  getWebhookSubscription: (e) => r(`webhooks/${e}`),
  /** Create a new webhook subscription */
  createWebhookSubscription: (e) => o("webhooks", e),
  /** Update an existing webhook subscription */
  updateWebhookSubscription: (e, t) => n(`webhooks/${e}`, t),
  /** Delete a webhook subscription */
  deleteWebhookSubscription: (e) => p(`webhooks/${e}`),
  /** Regenerate HMAC secret for a webhook subscription */
  regenerateWebhookSecret: (e) => o(`webhooks/${e}/regenerate-secret`),
  /** Send a test webhook */
  testWebhookSubscription: (e) => o(`webhooks/${e}/test`),
  /** Ping a webhook URL to test connectivity */
  pingWebhookUrl: (e) => o("webhooks/ping", { url: e }),
  // ============================================
  // Webhook Topics API
  // ============================================
  /** Get all available webhook topics */
  getWebhookTopics: () => r("webhooks/topics"),
  /** Get webhook topics grouped by category */
  getWebhookTopicsByCategory: () => r("webhooks/topics/by-category"),
  // ============================================
  // Webhook Deliveries API
  // ============================================
  /** Get paginated deliveries for a webhook subscription */
  getWebhookDeliveries: (e, t) => {
    const s = u(t);
    return r(`webhooks/${e}/deliveries${s ? `?${s}` : ""}`);
  },
  /** Get a single delivery with full detail */
  getDeliveryDetail: (e) => r(`webhooks/deliveries/${e}`),
  /** Retry a failed delivery */
  retryDelivery: (e) => o(`webhooks/deliveries/${e}/retry`),
  // ============================================
  // Webhook Stats API
  // ============================================
  /** Get webhook delivery statistics */
  getWebhookStats: (e, t) => {
    const s = {};
    e && (s.from = e), t && (s.to = t);
    const i = u(s);
    return r(`webhooks/stats${i ? `?${i}` : ""}`);
  },
  // ============================================
  // Abandoned Checkouts API
  // ============================================
  /** Get paginated list of abandoned checkouts */
  getAbandonedCheckouts: (e) => {
    const t = u(e);
    return r(`abandoned-checkouts${t ? `?${t}` : ""}`);
  },
  /** Get abandoned checkout statistics */
  getAbandonedCheckoutStats: (e, t) => {
    const s = {};
    e && (s.fromDate = e), t && (s.toDate = t);
    const i = u(s);
    return r(`abandoned-checkouts/stats${i ? `?${i}` : ""}`);
  },
  /** Resend recovery email for an abandoned checkout */
  resendRecoveryEmail: (e) => o(`abandoned-checkouts/${e}/resend-email`),
  /** Regenerate recovery link for an abandoned checkout */
  regenerateRecoveryLink: (e) => o(`abandoned-checkouts/${e}/regenerate-link`),
  // ============================================
  // Fulfilment Providers API
  // ============================================
  /** Get all available fulfilment providers (discovered from assemblies) */
  getAvailableFulfilmentProviders: () => r("fulfilment-providers/available"),
  /** Get all configured fulfilment provider settings */
  getFulfilmentProviderConfigurations: () => r("fulfilment-providers"),
  /** Get a specific fulfilment provider configuration by ID */
  getFulfilmentProviderConfiguration: (e) => r(`fulfilment-providers/${e}`),
  /** Get configuration fields for a fulfilment provider */
  getFulfilmentProviderFields: (e) => r(`fulfilment-providers/${e}/fields`),
  /** Create/enable a fulfilment provider */
  createFulfilmentProvider: (e) => o("fulfilment-providers", e),
  /** Update a fulfilment provider configuration */
  updateFulfilmentProvider: (e, t) => n(`fulfilment-providers/${e}`, t),
  /** Delete a fulfilment provider configuration */
  deleteFulfilmentProvider: (e) => p(`fulfilment-providers/${e}`),
  /** Toggle fulfilment provider enabled status */
  toggleFulfilmentProvider: (e, t) => n(`fulfilment-providers/${e}/toggle`, { isEnabled: t }),
  /** Test a fulfilment provider connection */
  testFulfilmentProvider: (e) => o(`fulfilment-providers/${e}/test/connection`),
  /** Submit a test order directly to the fulfilment provider */
  testFulfilmentOrderSubmission: (e, t) => o(`fulfilment-providers/${e}/test/order`, t),
  /** Get webhook event templates for fulfilment provider simulation */
  getFulfilmentWebhookEventTemplates: (e) => r(`fulfilment-providers/${e}/test/webhook-events`),
  /** Simulate a fulfilment webhook event */
  simulateFulfilmentWebhook: (e, t) => o(`fulfilment-providers/${e}/test/simulate-webhook`, t),
  /** Get fulfilment provider options for dropdown selection */
  getFulfilmentProviderOptions: () => r("fulfilment-providers/options"),
  // ============================================
  // Fulfilment Sync Logs API
  // ============================================
  /** Get paginated fulfilment sync logs */
  getFulfilmentSyncLogs: (e) => {
    const t = u(e);
    return r(`fulfilment-providers/sync-logs${t ? `?${t}` : ""}`);
  },
  /** Get a single sync log entry */
  getFulfilmentSyncLog: (e) => r(`fulfilment-providers/sync-logs/${e}`),
  /** Trigger a product sync for a provider */
  triggerProductSync: (e) => o(`fulfilment-providers/${e}/sync/products`),
  /** Trigger product sync through test endpoint for provider modal */
  testFulfilmentProductSync: (e) => o(`fulfilment-providers/${e}/test/product-sync`),
  /** Trigger an inventory sync for a provider */
  triggerInventorySync: (e) => o(`fulfilment-providers/${e}/sync/inventory`),
  /** Trigger inventory sync through test endpoint for provider modal */
  testFulfilmentInventorySync: (e) => o(`fulfilment-providers/${e}/test/inventory-sync`),
  // ============================================
  // Notifications Discovery API (Developer Tools)
  // ============================================
  /** Get all notifications and handlers for developer view */
  getNotifications: () => r("notifications"),
  // ============================================
  // Health Checks API
  // ============================================
  /** Get available health checks */
  getHealthChecks: () => r("health-checks"),
  /** Run a single health check */
  runHealthCheck: (e) => o(`health-checks/${encodeURIComponent(e)}/run`),
  /** Get paginated detail items for a health check */
  getHealthCheckDetail: (e, t = 1, s = 25) => r(
    `health-checks/${encodeURIComponent(e)}/details?page=${t}&pageSize=${s}`
  )
};
export {
  b as M,
  w as s
};
//# sourceMappingURL=merchello-api-B76CV0sD.js.map
