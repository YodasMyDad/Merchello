import type {
  UmbTreeAncestorsOfRequestArgs,
  UmbTreeChildrenOfRequestArgs,
  UmbTreeDataSource,
  UmbTreeRootItemsRequestArgs,
} from "@umbraco-cms/backoffice/tree";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { MerchelloTreeItemModel } from "./types.js";
import {
  MERCHELLO_ROOT_ENTITY_TYPE,
  MERCHELLO_ORDERS_ENTITY_TYPE,
  MERCHELLO_PRODUCTS_ENTITY_TYPE,
  MERCHELLO_CUSTOMERS_ENTITY_TYPE,
  MERCHELLO_PROVIDERS_ENTITY_TYPE,
  MERCHELLO_ANALYTICS_ENTITY_TYPE,
  MERCHELLO_MARKETING_ENTITY_TYPE,
  MERCHELLO_SETTINGS_ENTITY_TYPE,
  MERCHELLO_WAREHOUSES_ENTITY_TYPE,
  MERCHELLO_SHIPPING_ENTITY_TYPE,
} from "./types.js";

export class MerchelloTreeDataSource extends UmbControllerBase implements UmbTreeDataSource<MerchelloTreeItemModel> {
  async getRootItems(_args: UmbTreeRootItemsRequestArgs) {
    const rootItems: Array<MerchelloTreeItemModel> = [
      {
        entityType: MERCHELLO_ORDERS_ENTITY_TYPE,
        unique: "orders",
        name: "Orders",
        hasChildren: false,
        isFolder: false,
        icon: "icon-receipt-dollar",
        parent: { unique: null, entityType: MERCHELLO_ROOT_ENTITY_TYPE },
      },
      {
        entityType: MERCHELLO_PRODUCTS_ENTITY_TYPE,
        unique: "products",
        name: "Products",
        hasChildren: false,
        isFolder: false,
        icon: "icon-box",
        parent: { unique: null, entityType: MERCHELLO_ROOT_ENTITY_TYPE },
      },
      {
        entityType: MERCHELLO_CUSTOMERS_ENTITY_TYPE,
        unique: "customers",
        name: "Customers",
        hasChildren: false,
        isFolder: false,
        icon: "icon-users",
        parent: { unique: null, entityType: MERCHELLO_ROOT_ENTITY_TYPE },
      },
      {
        entityType: MERCHELLO_PROVIDERS_ENTITY_TYPE,
        unique: "providers",
        name: "Providers",
        hasChildren: false,
        isFolder: false,
        icon: "icon-nodes",
        parent: { unique: null, entityType: MERCHELLO_ROOT_ENTITY_TYPE },
      },
      {
        entityType: MERCHELLO_ANALYTICS_ENTITY_TYPE,
        unique: "analytics",
        name: "Analytics",
        hasChildren: false,
        isFolder: false,
        icon: "icon-chart-curve",
        parent: { unique: null, entityType: MERCHELLO_ROOT_ENTITY_TYPE },
      },
      {
        entityType: MERCHELLO_MARKETING_ENTITY_TYPE,
        unique: "marketing",
        name: "Marketing",
        hasChildren: false,
        isFolder: false,
        icon: "icon-megaphone",
        parent: { unique: null, entityType: MERCHELLO_ROOT_ENTITY_TYPE },
      },
      {
        entityType: MERCHELLO_SETTINGS_ENTITY_TYPE,
        unique: "settings",
        name: "Settings",
        hasChildren: true,
        isFolder: true,
        icon: "icon-settings",
        parent: { unique: null, entityType: MERCHELLO_ROOT_ENTITY_TYPE },
      },
    ];

    return { data: { items: rootItems, total: rootItems.length } };
  }

  async getChildrenOf(args: UmbTreeChildrenOfRequestArgs) {
    // Settings has child items: Warehouses and Shipping
    if (args.parent.unique === "settings") {
      const children: Array<MerchelloTreeItemModel> = [
        {
          entityType: MERCHELLO_WAREHOUSES_ENTITY_TYPE,
          unique: "warehouses",
          name: "Warehouses",
          hasChildren: false,
          isFolder: false,
          icon: "icon-store",
          parent: { unique: "settings", entityType: MERCHELLO_SETTINGS_ENTITY_TYPE },
        },
        {
          entityType: MERCHELLO_SHIPPING_ENTITY_TYPE,
          unique: "shipping",
          name: "Shipping",
          hasChildren: false,
          isFolder: false,
          icon: "icon-truck",
          parent: { unique: "settings", entityType: MERCHELLO_SETTINGS_ENTITY_TYPE },
        },
      ];
      return { data: { items: children, total: children.length } };
    }

    return { data: { items: [], total: 0 } };
  }

  async getAncestorsOf(_args: UmbTreeAncestorsOfRequestArgs) {
    return { data: [] };
  }
}
