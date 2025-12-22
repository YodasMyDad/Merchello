import type { UmbTreeItemModel, UmbTreeRootModel } from "@umbraco-cms/backoffice/tree";

export interface MerchelloTreeItemModel extends UmbTreeItemModel {
  entityType: string;
  unique: string;
  name: string;
  hasChildren: boolean;
  isFolder: boolean;
  icon?: string;
  parent: { unique: string | null; entityType: string };
}

export interface MerchelloTreeRootModel extends UmbTreeRootModel {
  entityType: string;
  unique: null;
  name: string;
  hasChildren: boolean;
  isFolder: boolean;
}

// Root entity type
export const MERCHELLO_ROOT_ENTITY_TYPE = "merchello-root";

// Main tree item entity types
export const MERCHELLO_ORDERS_ENTITY_TYPE = "merchello-orders";
export const MERCHELLO_ORDER_ENTITY_TYPE = "merchello-order";
export const MERCHELLO_PRODUCTS_ENTITY_TYPE = "merchello-products";
export const MERCHELLO_CUSTOMERS_ENTITY_TYPE = "merchello-customers";
export const MERCHELLO_COLLECTIONS_ENTITY_TYPE = "merchello-collections";
export const MERCHELLO_FILTERS_ENTITY_TYPE = "merchello-filters";
export const MERCHELLO_PRODUCT_TYPES_ENTITY_TYPE = "merchello-product-types";
export const MERCHELLO_PRODUCT_FEED_ENTITY_TYPE = "merchello-product-feed";
export const MERCHELLO_ANALYTICS_ENTITY_TYPE = "merchello-analytics";
export const MERCHELLO_DISCOUNTS_ENTITY_TYPE = "merchello-discounts";
export const MERCHELLO_TAX_ENTITY_TYPE = "merchello-tax";
export const MERCHELLO_SUPPLIERS_ENTITY_TYPE = "merchello-suppliers";
export const MERCHELLO_WAREHOUSES_ENTITY_TYPE = "merchello-warehouses";
export const MERCHELLO_PROVIDERS_ENTITY_TYPE = "merchello-providers";
