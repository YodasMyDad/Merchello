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
export const MERCHELLO_PROVIDERS_ENTITY_TYPE = "merchello-providers";
export const MERCHELLO_ANALYTICS_ENTITY_TYPE = "merchello-analytics";
export const MERCHELLO_MARKETING_ENTITY_TYPE = "merchello-marketing";
export const MERCHELLO_SETTINGS_ENTITY_TYPE = "merchello-settings";

// Settings child entity types
export const MERCHELLO_WAREHOUSES_ENTITY_TYPE = "merchello-warehouses";
export const MERCHELLO_SHIPPING_ENTITY_TYPE = "merchello-shipping";
