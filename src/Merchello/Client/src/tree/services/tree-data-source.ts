import type {
  UmbTreeAncestorsOfRequestArgs,
  UmbTreeChildrenOfRequestArgs,
  UmbTreeDataSource,
  UmbTreeRootItemsRequestArgs,
} from "@umbraco-cms/backoffice/tree";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { MerchelloTreeItemModel } from '@tree/types/tree.types.js';
import {
  MERCHELLO_ROOT_ENTITY_TYPE,
  MERCHELLO_ORDERS_ENTITY_TYPE,
  MERCHELLO_OUTSTANDING_ENTITY_TYPE,
  MERCHELLO_PRODUCTS_ENTITY_TYPE,
  MERCHELLO_CUSTOMERS_ENTITY_TYPE,
  MERCHELLO_COLLECTIONS_ENTITY_TYPE,
  MERCHELLO_FILTERS_ENTITY_TYPE,
  MERCHELLO_PRODUCT_TYPES_ENTITY_TYPE,
  MERCHELLO_PRODUCT_FEED_ENTITY_TYPE,
  MERCHELLO_ANALYTICS_ENTITY_TYPE,
  MERCHELLO_DISCOUNTS_ENTITY_TYPE,
  MERCHELLO_SUPPLIERS_ENTITY_TYPE,
  MERCHELLO_WAREHOUSES_ENTITY_TYPE,
  MERCHELLO_PROVIDERS_ENTITY_TYPE,
} from '@tree/types/tree.types.js';

export class MerchelloTreeDataSource extends UmbControllerBase implements UmbTreeDataSource<MerchelloTreeItemModel> {
  async getRootItems(_args: UmbTreeRootItemsRequestArgs) {
    const rootItems: Array<MerchelloTreeItemModel> = [
      {
        entityType: MERCHELLO_ORDERS_ENTITY_TYPE,
        unique: "orders",
        name: "Orders",
        hasChildren: true,
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
        entityType: MERCHELLO_COLLECTIONS_ENTITY_TYPE,
        unique: "collections",
        name: "Collections",
        hasChildren: false,
        isFolder: false,
        icon: "icon-tag",
        parent: { unique: null, entityType: MERCHELLO_ROOT_ENTITY_TYPE },
      },
      {
        entityType: MERCHELLO_FILTERS_ENTITY_TYPE,
        unique: "filters",
        name: "Filters",
        hasChildren: false,
        isFolder: false,
        icon: "icon-filter",
        parent: { unique: null, entityType: MERCHELLO_ROOT_ENTITY_TYPE },
      },
      {
        entityType: MERCHELLO_PRODUCT_TYPES_ENTITY_TYPE,
        unique: "product-types",
        name: "Product Types",
        hasChildren: false,
        isFolder: false,
        icon: "icon-tags",
        parent: { unique: null, entityType: MERCHELLO_ROOT_ENTITY_TYPE },
      },
      {
        entityType: MERCHELLO_PRODUCT_FEED_ENTITY_TYPE,
        unique: "product-feed",
        name: "Product Feed",
        hasChildren: false,
        isFolder: false,
        icon: "icon-rss",
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
        entityType: MERCHELLO_DISCOUNTS_ENTITY_TYPE,
        unique: "discounts",
        name: "Discounts",
        hasChildren: false,
        isFolder: false,
        icon: "icon-megaphone",
        parent: { unique: null, entityType: MERCHELLO_ROOT_ENTITY_TYPE },
      },
      {
        entityType: MERCHELLO_SUPPLIERS_ENTITY_TYPE,
        unique: "suppliers",
        name: "Suppliers",
        hasChildren: false,
        isFolder: false,
        icon: "icon-truck",
        parent: { unique: null, entityType: MERCHELLO_ROOT_ENTITY_TYPE },
      },
      {
        entityType: MERCHELLO_WAREHOUSES_ENTITY_TYPE,
        unique: "warehouses",
        name: "Warehouses",
        hasChildren: false,
        isFolder: false,
        icon: "icon-store",
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
    ];

    return { data: { items: rootItems, total: rootItems.length } };
  }

  async getChildrenOf(args: UmbTreeChildrenOfRequestArgs) {
    if (args.parent.unique === "orders") {
      const children: MerchelloTreeItemModel[] = [
        {
          entityType: MERCHELLO_OUTSTANDING_ENTITY_TYPE,
          unique: "outstanding",
          name: "Outstanding",
          hasChildren: false,
          isFolder: false,
          icon: "icon-timer",
          parent: { unique: "orders", entityType: MERCHELLO_ORDERS_ENTITY_TYPE },
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
