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

/** Entity type for product detail workspace */
export const PRODUCT_ENTITY_TYPE = "merchello-product";

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
