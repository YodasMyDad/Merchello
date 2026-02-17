/**
 * Shared navigation utilities for generating Umbraco backoffice URLs.
 *
 * IMPORTANT: All paths are RELATIVE (e.g., "section/merchello/...") to work with
 * Umbraco's SPA router. Never use absolute paths with "/umbraco/" prefix as that
 * causes full page reloads.
 *
 * Two patterns for navigation:
 * 1. href attributes (preferred): Use get*Href() functions
 *    html`<a href=${getOrderDetailHref(id)}>View</a>`
 *
 * 2. Programmatic navigation: Use navigateTo*() functions
 *    navigateToOrderDetail(id);
 */

/** Base path for all Merchello URLs (relative path for SPA routing) */
export const MERCHELLO_SECTION_PATH = "section/merchello";

/**
 * Generate a relative URL path for a Merchello workspace.
 * @param entityType - The entity type (e.g., "merchello-order", "merchello-product")
 * @param routePath - The route path within the workspace (e.g., "edit/123")
 */
export function getMerchelloWorkspaceHref(entityType: string, routePath: string): string {
  return `${MERCHELLO_SECTION_PATH}/workspace/${entityType}/${routePath}`;
}

/**
 * Navigate programmatically to a Merchello workspace using SPA routing.
 * Uses history.pushState() to avoid full page reloads.
 */
export function navigateToMerchelloWorkspace(entityType: string, routePath: string): void {
  history.pushState({}, "", getMerchelloWorkspaceHref(entityType, routePath));
}

/** Entity type for orders workspace (list and detail share same type for tree selection) */
export const ORDERS_ENTITY_TYPE = "merchello-orders";

/**
 * Generate the URL to view/edit an order detail.
 * Use this in href attributes on links/buttons.
 */
export function getOrderDetailHref(orderId: string): string {
  return getMerchelloWorkspaceHref(ORDERS_ENTITY_TYPE, `edit/orders/${orderId}`);
}

/**
 * Navigate programmatically to an order detail page using SPA routing.
 */
export function navigateToOrderDetail(orderId: string): void {
  navigateToMerchelloWorkspace(ORDERS_ENTITY_TYPE, `edit/orders/${orderId}`);
}

/**
 * Generate the URL to the orders list.
 */
export function getOrdersListHref(): string {
  return getMerchelloWorkspaceHref(ORDERS_ENTITY_TYPE, "edit/orders");
}

/**
 * Navigate programmatically to the orders list using SPA routing.
 */
export function navigateToOrdersList(): void {
  navigateToMerchelloWorkspace(ORDERS_ENTITY_TYPE, "edit/orders");
}

/** Entity type for outstanding workspace */
export const OUTSTANDING_ENTITY_TYPE = "merchello-outstanding";

/**
 * Generate the URL to the outstanding invoices list.
 */
export function getOutstandingListHref(): string {
  return getMerchelloWorkspaceHref(OUTSTANDING_ENTITY_TYPE, "edit/outstanding");
}

/**
 * Navigate programmatically to the outstanding invoices list using SPA routing.
 */
export function navigateToOutstandingList(): void {
  navigateToMerchelloWorkspace(OUTSTANDING_ENTITY_TYPE, "edit/outstanding");
}

/** Entity type for products workspace (list and detail share same type for tree selection) */
export const PRODUCTS_ENTITY_TYPE = "merchello-products";

/**
 * Generate the URL to view/edit a product detail.
 * Use this in href attributes on links/buttons.
 */
export function getProductDetailHref(productId: string): string {
  return getMerchelloWorkspaceHref(PRODUCTS_ENTITY_TYPE, `edit/products/${productId}`);
}

export function getProductVariantsTabHref(productId: string): string {
  return getMerchelloWorkspaceHref(PRODUCTS_ENTITY_TYPE, `edit/products/${productId}/tab/variants`);
}

/**
 * Navigate programmatically to a product detail page using SPA routing.
 */
export function navigateToProductDetail(productId: string): void {
  navigateToMerchelloWorkspace(PRODUCTS_ENTITY_TYPE, `edit/products/${productId}`);
}

/**
 * Generate the URL to the products list.
 */
export function getProductsListHref(): string {
  return getMerchelloWorkspaceHref(PRODUCTS_ENTITY_TYPE, "edit/products");
}

/**
 * Navigate programmatically to the products list using SPA routing.
 */
export function navigateToProductsList(): void {
  navigateToMerchelloWorkspace(PRODUCTS_ENTITY_TYPE, "edit/products");
}

/** Entity type for filters workspace */
export const FILTERS_ENTITY_TYPE = "merchello-filters";

/**
 * Generate the URL to the filters list.
 */
export function getFiltersListHref(): string {
  return getMerchelloWorkspaceHref(FILTERS_ENTITY_TYPE, "edit/filters");
}

/**
 * Navigate programmatically to the filters list using SPA routing.
 */
export function navigateToFiltersList(): void {
  navigateToMerchelloWorkspace(FILTERS_ENTITY_TYPE, "edit/filters");
}

/**
 * Generate the URL to view/edit a product variant detail.
 * Use this in href attributes on links/buttons.
 */
export function getVariantDetailHref(productId: string, variantId: string): string {
  return getMerchelloWorkspaceHref(PRODUCTS_ENTITY_TYPE, `edit/products/${productId}/variant/${variantId}`);
}

/**
 * Navigate programmatically to a product variant detail page using SPA routing.
 */
export function navigateToVariantDetail(productId: string, variantId: string): void {
  navigateToMerchelloWorkspace(PRODUCTS_ENTITY_TYPE, `edit/products/${productId}/variant/${variantId}`);
}

/** Entity type for warehouses workspace (list and detail share same type for tree selection) */
export const WAREHOUSES_ENTITY_TYPE = "merchello-warehouses";

/**
 * Generate the URL to view/edit a warehouse detail.
 * Use this in href attributes on links/buttons.
 */
export function getWarehouseDetailHref(warehouseId: string): string {
  return getMerchelloWorkspaceHref(WAREHOUSES_ENTITY_TYPE, `edit/warehouses/${warehouseId}`);
}

/**
 * Generate the URL to create a new warehouse.
 */
export function getWarehouseCreateHref(): string {
  return getMerchelloWorkspaceHref(WAREHOUSES_ENTITY_TYPE, "edit/warehouses/create");
}

/**
 * Navigate programmatically to a warehouse detail page using SPA routing.
 */
export function navigateToWarehouseDetail(warehouseId: string): void {
  navigateToMerchelloWorkspace(WAREHOUSES_ENTITY_TYPE, `edit/warehouses/${warehouseId}`);
}

/**
 * Replace current URL with warehouse detail page (no browser history entry).
 */
export function replaceToWarehouseDetail(warehouseId: string): void {
  history.replaceState({}, "", getWarehouseDetailHref(warehouseId));
}

/**
 * Navigate programmatically to create a new warehouse.
 */
export function navigateToWarehouseCreate(): void {
  navigateToMerchelloWorkspace(WAREHOUSES_ENTITY_TYPE, "edit/warehouses/create");
}

/**
 * Generate the URL to the warehouses list.
 */
export function getWarehousesListHref(): string {
  return getMerchelloWorkspaceHref(WAREHOUSES_ENTITY_TYPE, "edit/warehouses");
}

/**
 * Navigate programmatically to the warehouses list using SPA routing.
 */
export function navigateToWarehousesList(): void {
  navigateToMerchelloWorkspace(WAREHOUSES_ENTITY_TYPE, "edit/warehouses");
}

/** Entity type for suppliers workspace (list and detail share same type for tree selection) */
export const SUPPLIERS_ENTITY_TYPE = "merchello-suppliers";

/**
 * Generate the URL to view/edit a supplier detail.
 * Use this in href attributes on links/buttons.
 */
export function getSupplierDetailHref(supplierId: string): string {
  return getMerchelloWorkspaceHref(SUPPLIERS_ENTITY_TYPE, `edit/suppliers/${supplierId}`);
}

/**
 * Generate the URL to create a new supplier.
 */
export function getSupplierCreateHref(): string {
  return getMerchelloWorkspaceHref(SUPPLIERS_ENTITY_TYPE, "edit/suppliers/create");
}

/**
 * Navigate programmatically to a supplier detail page using SPA routing.
 */
export function navigateToSupplierDetail(supplierId: string): void {
  navigateToMerchelloWorkspace(SUPPLIERS_ENTITY_TYPE, `edit/suppliers/${supplierId}`);
}

/**
 * Navigate programmatically to create a new supplier.
 */
export function navigateToSupplierCreate(): void {
  navigateToMerchelloWorkspace(SUPPLIERS_ENTITY_TYPE, "edit/suppliers/create");
}

/**
 * Generate the URL to the suppliers list.
 */
export function getSuppliersListHref(): string {
  return getMerchelloWorkspaceHref(SUPPLIERS_ENTITY_TYPE, "edit/suppliers");
}

/**
 * Navigate programmatically to the suppliers list using SPA routing.
 */
export function navigateToSuppliersList(): void {
  navigateToMerchelloWorkspace(SUPPLIERS_ENTITY_TYPE, "edit/suppliers");
}

/** Entity type for customers workspace (list and segment detail share same type for tree selection) */
export const CUSTOMERS_ENTITY_TYPE = "merchello-customers";

/**
 * Generate the URL to view/edit a customer segment detail.
 * Use this in href attributes on links/buttons.
 */
export function getSegmentDetailHref(segmentId: string): string {
  return getMerchelloWorkspaceHref(CUSTOMERS_ENTITY_TYPE, `edit/customers/segment/${segmentId}`);
}

/**
 * Generate the URL to create a new customer segment.
 */
export function getSegmentCreateHref(): string {
  return getMerchelloWorkspaceHref(CUSTOMERS_ENTITY_TYPE, "edit/customers/segment/create");
}

/**
 * Navigate programmatically to a customer segment detail page using SPA routing.
 */
export function navigateToSegmentDetail(segmentId: string): void {
  navigateToMerchelloWorkspace(CUSTOMERS_ENTITY_TYPE, `edit/customers/segment/${segmentId}`);
}

/**
 * Navigate programmatically to create a new customer segment.
 */
export function navigateToSegmentCreate(): void {
  navigateToMerchelloWorkspace(CUSTOMERS_ENTITY_TYPE, "edit/customers/segment/create");
}

/**
 * Generate the URL to the customer segments list (within Customers workspace).
 */
export function getSegmentsListHref(): string {
  return getMerchelloWorkspaceHref(CUSTOMERS_ENTITY_TYPE, "edit/customers/view/segments");
}

/**
 * Navigate programmatically to the customer segments list using SPA routing.
 */
export function navigateToSegmentsList(): void {
  navigateToMerchelloWorkspace(CUSTOMERS_ENTITY_TYPE, "edit/customers/view/segments");
}

// ============================================
// Discount Navigation
// ============================================

/** Entity type for discounts workspace (list and detail share same type for tree selection) */
export const DISCOUNTS_ENTITY_TYPE = "merchello-discounts";

/**
 * Generate the URL to view/edit a discount detail.
 * Use this in href attributes on links/buttons.
 */
export function getDiscountDetailHref(discountId: string): string {
  return getMerchelloWorkspaceHref(DISCOUNTS_ENTITY_TYPE, `edit/discounts/${discountId}`);
}

/**
 * Generate the URL to create a new discount with the specified category.
 */
export function getDiscountCreateHref(category: number): string {
  return getMerchelloWorkspaceHref(DISCOUNTS_ENTITY_TYPE, `edit/discounts/create?category=${category}`);
}

/**
 * Navigate programmatically to a discount detail page using SPA routing.
 */
export function navigateToDiscountDetail(discountId: string): void {
  navigateToMerchelloWorkspace(DISCOUNTS_ENTITY_TYPE, `edit/discounts/${discountId}`);
}

/**
 * Replace current URL with discount detail page (no browser history entry).
 * Use after creating a new discount to switch from /create to /edit/{id}.
 */
export function replaceToDiscountDetail(discountId: string): void {
  history.replaceState({}, "", getDiscountDetailHref(discountId));
}

/**
 * Navigate programmatically to create a new discount with the specified category.
 */
export function navigateToDiscountCreate(category: string): void {
  navigateToMerchelloWorkspace(DISCOUNTS_ENTITY_TYPE, `edit/discounts/create?category=${category}`);
}

/**
 * Generate the URL to the discounts list.
 */
export function getDiscountsListHref(): string {
  return getMerchelloWorkspaceHref(DISCOUNTS_ENTITY_TYPE, "edit/discounts");
}

/**
 * Navigate programmatically to the discounts list using SPA routing.
 */
export function navigateToDiscountsList(): void {
  navigateToMerchelloWorkspace(DISCOUNTS_ENTITY_TYPE, "edit/discounts");
}

// ============================================
// Email Navigation
// ============================================

/** Entity type for emails workspace (list and detail share same type for tree selection) */
export const EMAILS_ENTITY_TYPE = "merchello-emails";

/**
 * Generate the URL to view/edit an email configuration detail.
 * Use this in href attributes on links/buttons.
 */
export function getEmailDetailHref(emailId: string): string {
  return getMerchelloWorkspaceHref(EMAILS_ENTITY_TYPE, `edit/emails/${emailId}`);
}

/**
 * Generate the URL to create a new email configuration.
 */
export function getEmailCreateHref(): string {
  return getMerchelloWorkspaceHref(EMAILS_ENTITY_TYPE, "edit/emails/create");
}

/**
 * Navigate programmatically to an email configuration detail page using SPA routing.
 */
export function navigateToEmailDetail(emailId: string): void {
  navigateToMerchelloWorkspace(EMAILS_ENTITY_TYPE, `edit/emails/${emailId}`);
}

/**
 * Navigate programmatically to create a new email configuration.
 */
export function navigateToEmailCreate(): void {
  navigateToMerchelloWorkspace(EMAILS_ENTITY_TYPE, "edit/emails/create");
}

/**
 * Generate the URL to the emails list.
 */
export function getEmailsListHref(): string {
  return getMerchelloWorkspaceHref(EMAILS_ENTITY_TYPE, "edit/emails");
}

/**
 * Navigate programmatically to the emails list using SPA routing.
 */
export function navigateToEmailsList(): void {
  navigateToMerchelloWorkspace(EMAILS_ENTITY_TYPE, "edit/emails");
}

// ============================================
// Webhook Navigation
// ============================================

/** Entity type for webhooks workspace (list and detail share same type for tree selection) */
export const WEBHOOKS_ENTITY_TYPE = "merchello-webhooks";

/**
 * Generate the URL to view/edit a webhook subscription detail.
 */
export function getWebhookDetailHref(webhookId: string): string {
  return getMerchelloWorkspaceHref(WEBHOOKS_ENTITY_TYPE, `edit/webhooks/${webhookId}`);
}

/**
 * Navigate programmatically to a webhook subscription detail page using SPA routing.
 */
export function navigateToWebhookDetail(webhookId: string): void {
  navigateToMerchelloWorkspace(WEBHOOKS_ENTITY_TYPE, `edit/webhooks/${webhookId}`);
}

/**
 * Generate the URL to the webhooks list.
 */
export function getWebhooksListHref(): string {
  return getMerchelloWorkspaceHref(WEBHOOKS_ENTITY_TYPE, "edit/webhooks");
}

/**
 * Navigate programmatically to the webhooks list using SPA routing.
 */
export function navigateToWebhooksList(): void {
  navigateToMerchelloWorkspace(WEBHOOKS_ENTITY_TYPE, "edit/webhooks");
}

// ============================================
// Upsell Navigation
// ============================================

/** Entity type for upsells workspace (list and detail share same type for tree selection) */
export const UPSELLS_ENTITY_TYPE = "merchello-upsells";

/**
 * Generate the URL to view/edit an upsell detail.
 */
export function getUpsellDetailHref(upsellId: string): string {
  return getMerchelloWorkspaceHref(UPSELLS_ENTITY_TYPE, `edit/upsells/${upsellId}`);
}

/**
 * Generate the URL to create a new upsell.
 */
export function getUpsellCreateHref(): string {
  return getMerchelloWorkspaceHref(UPSELLS_ENTITY_TYPE, "edit/upsells/create");
}

/**
 * Navigate programmatically to an upsell detail page using SPA routing.
 */
export function navigateToUpsellDetail(upsellId: string): void {
  navigateToMerchelloWorkspace(UPSELLS_ENTITY_TYPE, `edit/upsells/${upsellId}`);
}

/**
 * Replace current URL with upsell detail page (no browser history entry).
 */
export function replaceToUpsellDetail(upsellId: string): void {
  history.replaceState({}, "", getUpsellDetailHref(upsellId));
}

/**
 * Navigate programmatically to create a new upsell.
 */
export function navigateToUpsellCreate(): void {
  navigateToMerchelloWorkspace(UPSELLS_ENTITY_TYPE, "edit/upsells/create");
}

/**
 * Generate the URL to the upsells list.
 */
export function getUpsellsListHref(): string {
  return getMerchelloWorkspaceHref(UPSELLS_ENTITY_TYPE, "edit/upsells");
}

/**
 * Navigate programmatically to the upsells list using SPA routing.
 */
export function navigateToUpsellsList(): void {
  navigateToMerchelloWorkspace(UPSELLS_ENTITY_TYPE, "edit/upsells");
}
