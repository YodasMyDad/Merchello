/**
 * Shared navigation utilities for generating Umbraco backoffice URLs.
 */

/** Base path for all Merchello URLs */
export const MERCHELLO_SECTION_PATH = "/umbraco/section/merchello";

/**
 * Generate an absolute URL path for a Merchello workspace.
 * @param entityType - The entity type (e.g., "merchello-order", "merchello-product")
 * @param routePath - The route path within the workspace (e.g., "edit/123")
 */
export function getMerchelloWorkspaceHref(entityType: string, routePath: string): string {
  return `${MERCHELLO_SECTION_PATH}/workspace/${entityType}/${routePath}`;
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
