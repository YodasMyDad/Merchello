import { UmbTreeRepositoryBase as a } from "@umbraco-cms/backoffice/tree";
import { M as e, a as t, b as r, c as l, d as o, e as u, f as T, g as E, h as y, i as p, j as c, k as d, l as _, m as h, n as C, o as f } from "./bundle.manifests-D4h6iN2e.js";
import { UmbControllerBase as L } from "@umbraco-cms/backoffice/class-api";
class m extends L {
  async getRootItems(n) {
    const i = [
      {
        entityType: t,
        unique: "orders",
        name: "Orders",
        hasChildren: !0,
        isFolder: !1,
        icon: "icon-receipt-dollar",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: r,
        unique: "products",
        name: "Products",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-box",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: l,
        unique: "customers",
        name: "Customers",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-users",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: o,
        unique: "collections",
        name: "Collections",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-tag",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: u,
        unique: "filters",
        name: "Filters",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-filter",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: T,
        unique: "product-types",
        name: "Product Types",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-tags",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: E,
        unique: "product-feed",
        name: "Product Feed",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-rss",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: y,
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
        entityType: c,
        unique: "suppliers",
        name: "Suppliers",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-truck",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: d,
        unique: "warehouses",
        name: "Warehouses",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-store",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: _,
        unique: "emails",
        name: "Emails",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-mailbox",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: h,
        unique: "providers",
        name: "Providers",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-nodes",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: C,
        unique: "webhooks",
        name: "Webhooks",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-link",
        parent: { unique: null, entityType: e }
      }
    ];
    return { data: { items: i, total: i.length } };
  }
  async getChildrenOf(n) {
    if (n.parent.unique === "orders") {
      const i = [
        {
          entityType: f,
          unique: "outstanding",
          name: "Outstanding",
          hasChildren: !1,
          isFolder: !1,
          icon: "icon-timer",
          parent: { unique: "orders", entityType: t }
        }
      ];
      return { data: { items: i, total: i.length } };
    }
    return { data: { items: [], total: 0 } };
  }
  async getAncestorsOf(n) {
    return { data: [] };
  }
}
class R extends a {
  constructor(n) {
    super(n, m);
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
//# sourceMappingURL=tree-repository-C5qkdRhk.js.map
