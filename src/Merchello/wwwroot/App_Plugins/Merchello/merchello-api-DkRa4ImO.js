const m = "/umbraco/api/v1";
let d = {
  token: void 0,
  baseUrl: "",
  credentials: "same-origin"
};
function P(e) {
  d = { ...d, ...e };
}
async function $() {
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
    const t = await $(), s = d.baseUrl || "", o = await fetch(`${s}${m}/${e}`, {
      method: "GET",
      credentials: d.credentials,
      headers: t
    });
    if (!o.ok)
      return { error: new Error(`HTTP ${o.status}: ${o.statusText}`) };
    const a = o.headers.get("content-type") || "";
    let c;
    return a.includes("application/json") ? c = await o.json() : c = await o.text(), { data: c };
  } catch (t) {
    return { error: t instanceof Error ? t : new Error(String(t)) };
  }
}
async function i(e, t) {
  try {
    const s = await $(), o = d.baseUrl || "", a = await fetch(`${o}${m}/${e}`, {
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
async function n(e, t) {
  try {
    const s = await $(), o = d.baseUrl || "", a = await fetch(`${o}${m}/${e}`, {
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
    const t = await $(), s = d.baseUrl || "", o = await fetch(`${s}${m}/${e}`, {
      method: "DELETE",
      credentials: d.credentials,
      headers: t
    });
    if (!o.ok) {
      const a = await o.text();
      return { error: new Error(a || `HTTP ${o.status}: ${o.statusText}`) };
    }
    return {};
  } catch (t) {
    return { error: t instanceof Error ? t : new Error(String(t)) };
  }
}
function u(e) {
  if (!e) return "";
  const t = new URLSearchParams();
  for (const [s, o] of Object.entries(e))
    o != null && o !== "" && t.append(s, String(o));
  return t.toString();
}
const w = {
  ping: () => r("ping"),
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
  createTaxGroup: (e) => i("tax-groups", e),
  /** Update an existing tax group */
  updateTaxGroup: (e, t) => n(`tax-groups/${e}`, t),
  /** Delete a tax group */
  deleteTaxGroup: (e) => p(`tax-groups/${e}`),
  /**
   * Preview tax calculation for a custom item.
   * Used by add-custom-item modal to show tax preview.
   */
  previewCustomItemTax: (e) => i("tax-groups/preview-custom-item", e),
  // ============================================
  // Tax Group Rates API (Geographic Tax Rates)
  // ============================================
  /** Get all geographic rates for a tax group */
  getTaxGroupRates: (e) => r(`tax-groups/${e}/rates`),
  /** Create a new geographic tax rate for a tax group */
  createTaxGroupRate: (e, t) => i(`tax-groups/${e}/rates`, t),
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
  testTaxProvider: (e) => i(`tax-providers/${e}/test`),
  // ============================================
  // Shipping Tax Overrides API
  // ============================================
  /** Get all shipping tax overrides */
  getShippingTaxOverrides: () => r("shipping-tax-overrides"),
  /** Get a single shipping tax override by ID */
  getShippingTaxOverride: (e) => r(`shipping-tax-overrides/${e}`),
  /** Create a new shipping tax override */
  createShippingTaxOverride: (e) => i("shipping-tax-overrides", e),
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
  addInvoiceNote: (e, t) => i(`orders/${e}/notes`, t),
  updateBillingAddress: (e, t) => n(`orders/${e}/billing-address`, t),
  updateShippingAddress: (e, t) => n(`orders/${e}/shipping-address`, t),
  updatePurchaseOrder: (e, t) => n(`orders/${e}/purchase-order`, { purchaseOrder: t }),
  getOrderStats: () => r("orders/stats"),
  getDashboardStats: () => r("orders/dashboard-stats"),
  /** Create a manual order from the admin backoffice */
  createManualOrder: (e) => i("orders/manual", e),
  /** Search for customers by email or name (returns matching customers with their past shipping addresses) */
  searchCustomers: (e, t) => {
    const s = new URLSearchParams();
    e && s.set("email", e), t && s.set("name", t);
    const o = s.toString();
    return r(`orders/customer-lookup${o ? `?${o}` : ""}`);
  },
  /** Get all orders for a customer by their billing email address */
  getCustomerOrders: (e) => r(`orders/customer/${encodeURIComponent(e)}`),
  // Address Lookup (Backoffice) API
  /** Get address lookup configuration for the backoffice order creation UI */
  getOrderAddressLookupConfig: () => r("orders/address-lookup/config"),
  /** Get address lookup suggestions for a query (backoffice - no rate limiting) */
  getOrderAddressLookupSuggestions: (e) => i("orders/address-lookup/suggestions", e),
  /** Resolve an address lookup suggestion into a full address (backoffice - no rate limiting) */
  resolveOrderAddressLookup: (e) => i("orders/address-lookup/resolve", e),
  /** Export orders within a date range for CSV generation */
  exportOrders: (e) => i("orders/export", e),
  /** Soft-delete multiple orders/invoices */
  deleteOrders: (e) => i("orders/delete", { ids: e }),
  /** Cancel an invoice and all its unfulfilled orders */
  cancelInvoice: (e, t) => i(
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
  previewInvoiceEdit: (e, t) => i(`orders/${e}/preview-edit`, t),
  /** Preview calculated discount amount for a line item.
   * This is the single source of truth for discount calculations.
   * Frontend should call this instead of calculating locally. */
  previewDiscount: (e) => i("orders/preview-discount", e),
  // Fulfillment API
  /** Get fulfillment summary for an invoice (used in fulfillment dialog) */
  getFulfillmentSummary: (e) => r(`orders/${e}/fulfillment-summary`),
  /** Create a shipment for an order */
  createShipment: (e, t) => i(`orders/${e}/shipments`, t),
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
  batchMarkAsPaid: (e) => i("orders/batch-mark-paid", e),
  /** Get outstanding balance summary for a customer */
  getCustomerOutstandingBalance: (e) => r(`customers/${e}/outstanding`),
  /** Get outstanding invoices for a specific customer */
  getCustomerOutstandingInvoices: (e) => r(`customers/${e}/outstanding/invoices`),
  /** Download a customer statement PDF */
  downloadCustomerStatement: async (e, t, s) => {
    try {
      const o = await $(), a = d.baseUrl || "", c = new URLSearchParams();
      t && c.append("periodStart", t), s && c.append("periodEnd", s);
      const g = c.toString(), S = `${a}${m}/customers/${e}/statement${g ? `?${g}` : ""}`, l = await fetch(S, {
        method: "GET",
        credentials: d.credentials,
        headers: { ...o, "Content-Type": "" }
        // Remove content-type for file download
      });
      if (!l.ok)
        return { error: new Error(`HTTP ${l.status}: ${l.statusText}`) };
      const y = await l.blob(), h = l.headers.get("content-disposition");
      let f = "statement.pdf";
      if (h) {
        const v = h.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        v && v[1] && (f = v[1].replace(/['"]/g, ""));
      }
      return { blob: y, filename: f };
    } catch (o) {
      return { error: o instanceof Error ? o : new Error(String(o)) };
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
  createPaymentProvider: (e) => i("payment-providers", e),
  /** Update a payment provider setting */
  updatePaymentProvider: (e, t) => n(`payment-providers/${e}`, t),
  /** Delete a payment provider setting */
  deletePaymentProvider: (e) => p(`payment-providers/${e}`),
  /** Toggle payment provider enabled status */
  togglePaymentProvider: (e, t) => n(`payment-providers/${e}/toggle`, { isEnabled: t }),
  /** Reorder payment providers */
  reorderPaymentProviders: (e) => n("payment-providers/reorder", { orderedIds: e }),
  /** Test a payment provider configuration */
  testPaymentProvider: (e, t) => i(`payment-providers/${e}/test`, t),
  /** Process a test payment (for hosted fields/widget integration types) */
  processTestPayment: (e, t) => i(`payment-providers/${e}/test/process-payment`, t),
  /** Get express checkout client configuration for testing */
  getTestExpressConfig: (e, t, s = 100) => r(`payment-providers/${e}/test/express-config?methodAlias=${t}&amount=${s}`),
  /** Get available webhook event templates for simulation */
  getWebhookEventTemplates: (e) => r(`payment-providers/${e}/test/webhook-events`),
  /** Simulate a webhook event for testing */
  simulateWebhook: (e, t) => i(`payment-providers/${e}/test/simulate-webhook`, t),
  /** Test payment link generation for a provider */
  testPaymentLink: (e, t) => i(`payment-providers/${e}/test/payment-link`, t),
  /** Test vault setup session creation */
  testVaultSetup: (e, t) => i(`payment-providers/${e}/test/vault-setup`, t),
  /** Test vault setup confirmation */
  testVaultConfirm: (e, t) => i(`payment-providers/${e}/test/vault-confirm`, t),
  /** Test charging a vaulted payment method */
  testVaultCharge: (e, t) => i(`payment-providers/${e}/test/vault-charge`, t),
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
  recordManualPayment: (e, t) => i(`invoices/${e}/payments/manual`, t),
  /** Get form fields for manual payments (payment method options, etc.) */
  getManualPaymentFormFields: () => r("payments/manual/form-fields"),
  /** Process a refund */
  processRefund: (e, t) => i(`payments/${e}/refund`, t),
  /** Preview a refund calculation without processing it */
  previewRefund: (e, t) => i(`payments/${e}/preview-refund`, t ?? {}),
  // ============================================
  // Payment Links API
  // ============================================
  /** Get payment providers that support payment links */
  getPaymentLinkProviders: () => r("payment-links/providers"),
  /** Create a payment link for an invoice */
  createPaymentLink: (e) => i("payment-links", e),
  /** Get the current payment link for an invoice */
  getPaymentLink: (e) => r(`invoices/${e}/payment-link`),
  /** Deactivate the payment link for an invoice */
  deactivatePaymentLink: (e) => i(`invoices/${e}/payment-link/deactivate`),
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
  createShippingProvider: (e) => i("shipping-providers", e),
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
  testShippingProvider: (e, t) => i(`shipping-providers/${e}/test`, t),
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
  createProductType: (e) => i("products/types", e),
  /** Update an existing product type */
  updateProductType: (e, t) => n(`products/types/${e}`, t),
  /** Delete a product type */
  deleteProductType: (e) => p(`products/types/${e}`),
  /** Get all product collections with product counts */
  getProductCollections: () => r("products/collections"),
  /** Create a new product collection */
  createProductCollection: (e) => i("products/collections", e),
  /** Update a product collection */
  updateProductCollection: (e, t) => n(`products/collections/${e}`, t),
  /** Delete a product collection */
  deleteProductCollection: (e) => p(`products/collections/${e}`),
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
  createProduct: (e) => i("products", e),
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
  getVariantsByIds: (e) => i("products/variants/by-ids", e),
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
    const o = new URLSearchParams();
    return o.set("destinationCountryCode", t), s && o.set("destinationStateCode", s), r(`products/variants/${e}/fulfillment-options?${o.toString()}`);
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
  previewAddonPrice: (e, t) => i(`products/variants/${e}/preview-addon-price`, t),
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
  createShippingOption: (e) => i("shipping-options", e),
  /** Update a shipping option */
  updateShippingOption: (e, t) => n(`shipping-options/${e}`, t),
  /** Delete a shipping option */
  deleteShippingOption: (e) => p(`shipping-options/${e}`),
  /** Add a cost to a shipping option */
  addShippingCost: (e, t) => i(`shipping-options/${e}/costs`, t),
  /** Update a shipping cost */
  updateShippingCost: (e, t) => n(`shipping-costs/${e}`, t),
  /** Delete a shipping cost */
  deleteShippingCost: (e) => p(`shipping-costs/${e}`),
  /** Add a weight tier to a shipping option */
  addShippingWeightTier: (e, t) => i(`shipping-options/${e}/weight-tiers`, t),
  /** Update a weight tier */
  updateShippingWeightTier: (e, t) => n(`shipping-weight-tiers/${e}`, t),
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
  createWarehouse: (e) => i("warehouses", e),
  /** Update a warehouse */
  updateWarehouse: (e, t) => n(`warehouses/${e}`, t),
  /** Delete a warehouse */
  deleteWarehouse: (e, t = !1) => p(`warehouses/${e}${t ? "?force=true" : ""}`),
  // ============================================
  // Service Regions API
  // ============================================
  /** Add a service region to a warehouse */
  addServiceRegion: (e, t) => i(`warehouses/${e}/service-regions`, t),
  /** Update a service region */
  updateServiceRegion: (e, t, s) => n(`warehouses/${e}/service-regions/${t}`, s),
  /** Delete a service region */
  deleteServiceRegion: (e, t) => p(`warehouses/${e}/service-regions/${t}`),
  // ============================================
  // Warehouse Products API
  // ============================================
  /** Get paginated products assigned to a warehouse */
  getWarehouseProducts: (e, t = 1, s = 20, o) => {
    const a = new URLSearchParams({ page: String(t), pageSize: String(s) });
    return o && a.set("search", o), r(`warehouses/${e}/products?${a.toString()}`);
  },
  /** Add products to a warehouse */
  addProductsToWarehouse: (e, t) => i(`warehouses/${e}/products`, { productRootIds: t }),
  /** Remove products from a warehouse */
  removeProductsFromWarehouse: (e, t) => i(`warehouses/${e}/products/remove`, { productRootIds: t }),
  // ============================================
  // Warehouse Available Destinations API
  // ============================================
  /** Get countries that a warehouse can service based on its service regions */
  getAvailableDestinationsForWarehouse: (e) => r(`warehouses/${e}/available-destinations`),
  /** Get regions that a warehouse can service for a given country */
  getAvailableRegionsForWarehouse: (e, t) => r(`warehouses/${e}/available-destinations/${t}/regions`),
  /** Get available shipping options for a warehouse and destination */
  getShippingOptionsForWarehouse: (e, t, s) => {
    const o = new URLSearchParams();
    return o.set("destinationCountryCode", t), s && o.set("destinationStateCode", s), r(`warehouses/${e}/shipping-options?${o.toString()}`);
  },
  // ============================================
  // Suppliers API
  // ============================================
  /** Get all suppliers with warehouse count */
  getSuppliers: () => r("suppliers"),
  /** Get a single supplier by ID */
  getSupplier: (e) => r(`suppliers/${e}`),
  /** Create a new supplier */
  createSupplier: (e) => i("suppliers", e),
  /** Update an existing supplier */
  updateSupplier: (e, t) => n(`suppliers/${e}`, t),
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
  createCustomerSegment: (e) => i("customer-segments", e),
  /** Update a customer segment */
  updateCustomerSegment: (e, t) => n(`customer-segments/${e}`, t),
  /** Delete a customer segment */
  deleteCustomerSegment: (e) => p(`customer-segments/${e}`),
  /** Get paginated members of a segment */
  getSegmentMembers: (e, t = 1, s = 50) => r(
    `customer-segments/${e}/members?page=${t}&pageSize=${s}`
  ),
  /** Add members to a manual segment */
  addSegmentMembers: (e, t) => i(`customer-segments/${e}/members`, t),
  /** Remove members from a manual segment */
  removeSegmentMembers: (e, t) => i(`customer-segments/${e}/members/remove`, t),
  /** Preview customers matching an automated segment's criteria */
  previewSegmentMatches: (e, t = 1, s = 50) => r(
    `customer-segments/${e}/preview?page=${t}&pageSize=${s}`
  ),
  /** Get statistics for a segment */
  getSegmentStatistics: (e) => r(`customer-segments/${e}/statistics`),
  /** Get available criteria fields for automated segments */
  getCriteriaFields: () => r("customer-segments/criteria/fields"),
  /** Validate criteria rules */
  validateCriteria: (e) => i("customer-segments/criteria/validate", e),
  /** Search customers for segment member picker */
  searchCustomersForSegment: (e, t, s = 50) => {
    const o = new URLSearchParams({ search: e, pageSize: String(s) });
    return t?.length && o.set("excludeIds", t.join(",")), r(`customers/search?${o.toString()}`);
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
  testExchangeRateProvider: (e) => i(`exchange-rate-providers/${e}/test`),
  /** Force refresh the exchange rate cache */
  refreshExchangeRates: () => i("exchange-rate-providers/refresh"),
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
  testAddressLookupProvider: (e) => i(`address-lookup-providers/${e}/test`),
  // ============================================
  // Filters API
  // ============================================
  /** Get all filter groups with their filters */
  getFilterGroups: () => r("filter-groups"),
  /** Get a single filter group by ID */
  getFilterGroup: (e) => r(`filter-groups/${e}`),
  /** Create a new filter group */
  createFilterGroup: (e) => i("filter-groups", e),
  /** Update a filter group */
  updateFilterGroup: (e, t) => n(`filter-groups/${e}`, t),
  /** Delete a filter group */
  deleteFilterGroup: (e) => p(`filter-groups/${e}`),
  /** Reorder filter groups */
  reorderFilterGroups: (e) => n("filter-groups/reorder", e),
  /** Create a new filter within a group */
  createFilter: (e, t) => i(`filter-groups/${e}/filters`, t),
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
  createDiscount: (e) => i("discounts", e),
  /** Update an existing discount */
  updateDiscount: (e, t) => n(`discounts/${e}`, t),
  /** Delete a discount */
  deleteDiscount: (e) => p(`discounts/${e}`),
  /** Activate a discount */
  activateDiscount: (e) => n(`discounts/${e}/activate`),
  /** Deactivate a discount */
  deactivateDiscount: (e) => n(`discounts/${e}/deactivate`),
  /** Generate a unique discount code */
  generateDiscountCode: (e = 8) => r(`discounts/generate-code?length=${e}`),
  /** Check if a discount code is available */
  checkDiscountCodeAvailable: (e, t) => {
    const s = new URLSearchParams({ code: e });
    return t && s.set("excludeId", t), r(`discounts/check-code?${s.toString()}`);
  },
  /** Apply a promotional discount to an invoice */
  applyDiscountToInvoice: (e, t) => i(`orders/${e}/apply-discount`, { discountId: t }),
  /** Get performance metrics for a discount */
  getDiscountPerformance: (e, t, s) => {
    const o = new URLSearchParams();
    t && o.set("startDate", t), s && o.set("endDate", s);
    const a = o.toString();
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
  createUpsell: (e) => i("upsells", e),
  /** Update an existing upsell rule */
  updateUpsell: (e, t) => n(`upsells/${e}`, t),
  /** Delete an upsell rule */
  deleteUpsell: (e) => p(`upsells/${e}`),
  /** Activate an upsell rule */
  activateUpsell: (e) => i(`upsells/${e}/activate`),
  /** Deactivate an upsell rule */
  deactivateUpsell: (e) => i(`upsells/${e}/deactivate`),
  /** Get performance metrics for an upsell rule */
  getUpsellPerformance: (e, t, s) => {
    const o = new URLSearchParams();
    t && o.set("startDate", t), s && o.set("endDate", s);
    const a = o.toString();
    return r(`upsells/${e}/performance${a ? `?${a}` : ""}`);
  },
  /** Get upsell analytics dashboard data */
  getUpsellDashboard: (e, t) => {
    const s = new URLSearchParams();
    e && s.set("startDate", e), t && s.set("endDate", t);
    const o = s.toString();
    return r(`upsells/dashboard${o ? `?${o}` : ""}`);
  },
  /** Get aggregated upsell summary report */
  getUpsellSummary: (e, t, s) => {
    const o = new URLSearchParams();
    e && o.set("startDate", e), t && o.set("endDate", t), s && o.set("topN", s.toString());
    const a = o.toString();
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
  createEmailConfiguration: (e) => i("emails", e),
  /** Update an existing email configuration */
  updateEmailConfiguration: (e, t) => n(`emails/${e}`, t),
  /** Delete an email configuration */
  deleteEmailConfiguration: (e) => p(`emails/${e}`),
  /** Toggle email configuration enabled status */
  toggleEmailConfiguration: (e) => i(`emails/${e}/toggle`),
  /** Preview an email without sending */
  previewEmail: (e) => r(`emails/${e}/preview`),
  /** Send a test email */
  sendTestEmail: (e, t) => i(`emails/${e}/test`, t),
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
  createWebhookSubscription: (e) => i("webhooks", e),
  /** Update an existing webhook subscription */
  updateWebhookSubscription: (e, t) => n(`webhooks/${e}`, t),
  /** Delete a webhook subscription */
  deleteWebhookSubscription: (e) => p(`webhooks/${e}`),
  /** Regenerate HMAC secret for a webhook subscription */
  regenerateWebhookSecret: (e) => i(`webhooks/${e}/regenerate-secret`),
  /** Send a test webhook */
  testWebhookSubscription: (e) => i(`webhooks/${e}/test`),
  /** Ping a webhook URL to test connectivity */
  pingWebhookUrl: (e) => i("webhooks/ping", { url: e }),
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
  retryDelivery: (e) => i(`webhooks/deliveries/${e}/retry`),
  // ============================================
  // Webhook Stats API
  // ============================================
  /** Get webhook delivery statistics */
  getWebhookStats: (e, t) => {
    const s = {};
    e && (s.from = e), t && (s.to = t);
    const o = u(s);
    return r(`webhooks/stats${o ? `?${o}` : ""}`);
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
    const o = u(s);
    return r(`abandoned-checkouts/stats${o ? `?${o}` : ""}`);
  },
  /** Resend recovery email for an abandoned checkout */
  resendRecoveryEmail: (e) => i(`abandoned-checkouts/${e}/resend-email`),
  /** Regenerate recovery link for an abandoned checkout */
  regenerateRecoveryLink: (e) => i(`abandoned-checkouts/${e}/regenerate-link`),
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
  createFulfilmentProvider: (e) => i("fulfilment-providers", e),
  /** Update a fulfilment provider configuration */
  updateFulfilmentProvider: (e, t) => n(`fulfilment-providers/${e}`, t),
  /** Delete a fulfilment provider configuration */
  deleteFulfilmentProvider: (e) => p(`fulfilment-providers/${e}`),
  /** Toggle fulfilment provider enabled status */
  toggleFulfilmentProvider: (e, t) => n(`fulfilment-providers/${e}/toggle`, { isEnabled: t }),
  /** Test a fulfilment provider connection */
  testFulfilmentProvider: (e) => i(`fulfilment-providers/${e}/test`),
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
  triggerProductSync: (e) => i(`fulfilment-providers/${e}/sync/products`),
  /** Trigger an inventory sync for a provider */
  triggerInventorySync: (e) => i(`fulfilment-providers/${e}/sync/inventory`),
  // ============================================
  // Notifications Discovery API (Developer Tools)
  // ============================================
  /** Get all notifications and handlers for developer view */
  getNotifications: () => r("notifications")
};
export {
  w as M,
  P as s
};
//# sourceMappingURL=merchello-api-DkRa4ImO.js.map
