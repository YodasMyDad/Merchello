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

/** Entity type for order detail workspace */
export const ORDER_ENTITY_TYPE = "merchello-order";

/** Entity type for orders list workspace */
export const ORDERS_ENTITY_TYPE = "merchello-orders";

/**
 * Generate the URL to view/edit an order detail.
 * Use this in href attributes on links/buttons.
 */
export function getOrderDetailHref(orderId: string): string {
  return getMerchelloWorkspaceHref(ORDER_ENTITY_TYPE, `edit/${orderId}`);
}

/**
 * Navigate programmatically to an order detail page using SPA routing.
 */
export function navigateToOrderDetail(orderId: string): void {
  navigateToMerchelloWorkspace(ORDER_ENTITY_TYPE, `edit/${orderId}`);
}

/**
 * Generate the URL to the orders list.
 */
export function getOrdersListHref(): string {
  return getMerchelloWorkspaceHref(ORDERS_ENTITY_TYPE, "orders");
}

/**
 * Navigate programmatically to the orders list using SPA routing.
 */
export function navigateToOrdersList(): void {
  navigateToMerchelloWorkspace(ORDERS_ENTITY_TYPE, "orders");
}

/** Entity type for product detail workspace */
export const PRODUCT_ENTITY_TYPE = "merchello-product";

/** Entity type for products list workspace */
export const PRODUCTS_ENTITY_TYPE = "merchello-products";

/**
 * Generate the URL to view/edit a product detail.
 * Use this in href attributes on links/buttons.
 */
export function getProductDetailHref(productId: string): string {
  return getMerchelloWorkspaceHref(PRODUCT_ENTITY_TYPE, `edit/${productId}`);
}

/**
 * Navigate programmatically to a product detail page using SPA routing.
 */
export function navigateToProductDetail(productId: string): void {
  navigateToMerchelloWorkspace(PRODUCT_ENTITY_TYPE, `edit/${productId}`);
}

/**
 * Generate the URL to the products list.
 */
export function getProductsListHref(): string {
  return getMerchelloWorkspaceHref(PRODUCTS_ENTITY_TYPE, "products");
}

/**
 * Navigate programmatically to the products list using SPA routing.
 */
export function navigateToProductsList(): void {
  navigateToMerchelloWorkspace(PRODUCTS_ENTITY_TYPE, "products");
}

/**
 * Generate the URL to view/edit a product variant detail.
 * Use this in href attributes on links/buttons.
 */
export function getVariantDetailHref(productId: string, variantId: string): string {
  return getMerchelloWorkspaceHref(PRODUCT_ENTITY_TYPE, `edit/${productId}/variant/${variantId}`);
}

/**
 * Navigate programmatically to a product variant detail page using SPA routing.
 */
export function navigateToVariantDetail(productId: string, variantId: string): void {
  navigateToMerchelloWorkspace(PRODUCT_ENTITY_TYPE, `edit/${productId}/variant/${variantId}`);
}

/** Entity type for warehouse detail workspace */
export const WAREHOUSE_ENTITY_TYPE = "merchello-warehouse";

/** Entity type for warehouses list workspace */
export const WAREHOUSES_ENTITY_TYPE = "merchello-warehouses";

/**
 * Generate the URL to view/edit a warehouse detail.
 * Use this in href attributes on links/buttons.
 */
export function getWarehouseDetailHref(warehouseId: string): string {
  return getMerchelloWorkspaceHref(WAREHOUSE_ENTITY_TYPE, `edit/${warehouseId}`);
}

/**
 * Generate the URL to create a new warehouse.
 */
export function getWarehouseCreateHref(): string {
  return getMerchelloWorkspaceHref(WAREHOUSE_ENTITY_TYPE, "create");
}

/**
 * Navigate programmatically to a warehouse detail page using SPA routing.
 */
export function navigateToWarehouseDetail(warehouseId: string): void {
  navigateToMerchelloWorkspace(WAREHOUSE_ENTITY_TYPE, `edit/${warehouseId}`);
}

/**
 * Navigate programmatically to create a new warehouse.
 */
export function navigateToWarehouseCreate(): void {
  navigateToMerchelloWorkspace(WAREHOUSE_ENTITY_TYPE, "create");
}

/**
 * Generate the URL to the warehouses list.
 */
export function getWarehousesListHref(): string {
  return getMerchelloWorkspaceHref(WAREHOUSES_ENTITY_TYPE, "warehouses");
}

/**
 * Navigate programmatically to the warehouses list using SPA routing.
 */
export function navigateToWarehousesList(): void {
  navigateToMerchelloWorkspace(WAREHOUSES_ENTITY_TYPE, "warehouses");
}

/** Entity type for supplier detail workspace */
export const SUPPLIER_ENTITY_TYPE = "merchello-supplier";

/** Entity type for suppliers list workspace */
export const SUPPLIERS_ENTITY_TYPE = "merchello-suppliers";

/**
 * Generate the URL to view/edit a supplier detail.
 * Use this in href attributes on links/buttons.
 */
export function getSupplierDetailHref(supplierId: string): string {
  return getMerchelloWorkspaceHref(SUPPLIER_ENTITY_TYPE, `edit/${supplierId}`);
}

/**
 * Generate the URL to create a new supplier.
 */
export function getSupplierCreateHref(): string {
  return getMerchelloWorkspaceHref(SUPPLIER_ENTITY_TYPE, "create");
}

/**
 * Navigate programmatically to a supplier detail page using SPA routing.
 */
export function navigateToSupplierDetail(supplierId: string): void {
  navigateToMerchelloWorkspace(SUPPLIER_ENTITY_TYPE, `edit/${supplierId}`);
}

/**
 * Navigate programmatically to create a new supplier.
 */
export function navigateToSupplierCreate(): void {
  navigateToMerchelloWorkspace(SUPPLIER_ENTITY_TYPE, "create");
}

/**
 * Generate the URL to the suppliers list.
 */
export function getSuppliersListHref(): string {
  return getMerchelloWorkspaceHref(SUPPLIERS_ENTITY_TYPE, "suppliers");
}

/**
 * Navigate programmatically to the suppliers list using SPA routing.
 */
export function navigateToSuppliersList(): void {
  navigateToMerchelloWorkspace(SUPPLIERS_ENTITY_TYPE, "suppliers");
}

/** Entity type for customer segment detail workspace */
export const CUSTOMER_SEGMENT_ENTITY_TYPE = "merchello-customer-segment";

/**
 * Generate the URL to view/edit a customer segment detail.
 * Use this in href attributes on links/buttons.
 */
export function getSegmentDetailHref(segmentId: string): string {
  return getMerchelloWorkspaceHref(CUSTOMER_SEGMENT_ENTITY_TYPE, `edit/${segmentId}`);
}

/**
 * Generate the URL to create a new customer segment.
 */
export function getSegmentCreateHref(): string {
  return getMerchelloWorkspaceHref(CUSTOMER_SEGMENT_ENTITY_TYPE, "create");
}

/**
 * Navigate programmatically to a customer segment detail page using SPA routing.
 */
export function navigateToSegmentDetail(segmentId: string): void {
  navigateToMerchelloWorkspace(CUSTOMER_SEGMENT_ENTITY_TYPE, `edit/${segmentId}`);
}

/**
 * Navigate programmatically to create a new customer segment.
 */
export function navigateToSegmentCreate(): void {
  navigateToMerchelloWorkspace(CUSTOMER_SEGMENT_ENTITY_TYPE, "create");
}

/**
 * Generate the URL to the customer segments list (within Customers workspace).
 */
export function getSegmentsListHref(): string {
  return `${MERCHELLO_SECTION_PATH}/workspace/merchello-customers/view/segments`;
}

/**
 * Navigate programmatically to the customer segments list using SPA routing.
 */
export function navigateToSegmentsList(): void {
  history.pushState({}, "", getSegmentsListHref());
}

// ============================================
// Discount Navigation
// ============================================

/** Entity type for discount detail workspace */
export const DISCOUNT_ENTITY_TYPE = "merchello-discount";

/** Entity type for discounts list workspace */
export const DISCOUNTS_ENTITY_TYPE = "merchello-discounts";

/**
 * Generate the URL to view/edit a discount detail.
 * Use this in href attributes on links/buttons.
 */
export function getDiscountDetailHref(discountId: string): string {
  return getMerchelloWorkspaceHref(DISCOUNT_ENTITY_TYPE, `edit/${discountId}`);
}

/**
 * Generate the URL to create a new discount with the specified category.
 */
export function getDiscountCreateHref(category: number): string {
  return getMerchelloWorkspaceHref(DISCOUNT_ENTITY_TYPE, `create?category=${category}`);
}

/**
 * Navigate programmatically to a discount detail page using SPA routing.
 */
export function navigateToDiscountDetail(discountId: string): void {
  navigateToMerchelloWorkspace(DISCOUNT_ENTITY_TYPE, `edit/${discountId}`);
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
export function navigateToDiscountCreate(category: number): void {
  navigateToMerchelloWorkspace(DISCOUNT_ENTITY_TYPE, `create?category=${category}`);
}

/**
 * Generate the URL to the discounts list.
 */
export function getDiscountsListHref(): string {
  return getMerchelloWorkspaceHref(DISCOUNTS_ENTITY_TYPE, "discounts");
}

/**
 * Navigate programmatically to the discounts list using SPA routing.
 */
export function navigateToDiscountsList(): void {
  navigateToMerchelloWorkspace(DISCOUNTS_ENTITY_TYPE, "discounts");
}