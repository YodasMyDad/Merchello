import { UmbTreeRepositoryBase as s } from "@umbraco-cms/backoffice/tree";
import { M as e, a, b as r, c as l, d as o, e as u, f as T, g as E, h as y, i as c, j as p, k as d, l as _, m as C } from "./bundle.manifests-BeYhXq8T.js";
import { UmbControllerBase as h } from "@umbraco-cms/backoffice/class-api";
class f extends h {
  async getRootItems(n) {
    const t = [
      {
        entityType: a,
        unique: "orders",
        name: "Orders",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-receipt-dollar",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: r,
        unique: "outstanding",
        name: "Outstanding",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-timer",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: l,
        unique: "products",
        name: "Products",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-box",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: o,
        unique: "customers",
        name: "Customers",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-users",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: u,
        unique: "collections",
        name: "Collections",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-tag",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: T,
        unique: "filters",
        name: "Filters",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-filter",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: E,
        unique: "product-types",
        name: "Product Types",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-tags",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: y,
        unique: "product-feed",
        name: "Product Feed",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-rss",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: c,
        unique: "analytics",
        name: "Analytics",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-chart-curve",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: p,
        unique: "discounts",
        name: "Discounts",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-megaphone",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: d,
        unique: "suppliers",
        name: "Suppliers",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-truck",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: _,
        unique: "warehouses",
        name: "Warehouses",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-store",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: C,
        unique: "providers",
        name: "Providers",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-nodes",
        parent: { unique: null, entityType: e }
      }
    ];
    return { data: { items: t, total: t.length } };
  }
  async getChildrenOf(n) {
    return { data: { items: [], total: 0 } };
  }
  async getAncestorsOf(n) {
    return { data: [] };
  }
}
class R extends s {
  constructor(n) {
    super(n, f);
  }
  async requestTreeRoot() {
    return { data: {
      unique: null,
      entityType: e,
      name: "Merchello",
      hasChildren: !0,
      isFolder: !0
    } };
  }
}
export {
  R as MerchelloTreeRepository,
  R as api
};
//# sourceMappingURL=tree-repository-CDqMSkPm.js.map
