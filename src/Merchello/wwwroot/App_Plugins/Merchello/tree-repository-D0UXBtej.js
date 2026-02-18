import { UmbTreeRepositoryBase as l } from "@umbraco-cms/backoffice/tree";
import { M as e, a as t, b as s, c as r, d as o, e as u, f as T, g as E, h as p, i as y, j as c, k as d, l as _, m as h, n as C, o as f, p as L, q as O, r as m } from "./bundle.manifests-CRGcATB_.js";
import { UmbControllerBase as q } from "@umbraco-cms/backoffice/class-api";
class Y extends q {
  async getRootItems(i) {
    const n = [
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
        entityType: s,
        unique: "products",
        name: "Products",
        hasChildren: !0,
        isFolder: !1,
        icon: "icon-box",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: r,
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
        unique: "product-feeds",
        name: "Product Feed",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-rss",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: p,
        unique: "analytics",
        name: "Analytics",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-chart-curve",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: y,
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
      },
      {
        entityType: f,
        unique: "notifications",
        name: "Notifications",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-bell",
        parent: { unique: null, entityType: e }
      }
    ];
    return { data: { items: n, total: n.length } };
  }
  async getChildrenOf(i) {
    if (i.parent.unique === "orders") {
      const n = [
        {
          entityType: L,
          unique: "outstanding",
          name: "Outstanding",
          hasChildren: !1,
          isFolder: !1,
          icon: "icon-timer",
          parent: { unique: "orders", entityType: t }
        },
        {
          entityType: O,
          unique: "abandoned-checkouts",
          name: "Abandoned Checkouts",
          hasChildren: !1,
          isFolder: !1,
          icon: "icon-shopping-basket-alt-2",
          parent: { unique: "orders", entityType: t }
        }
      ];
      return { data: { items: n, total: n.length } };
    }
    if (i.parent.unique === "products") {
      const n = [
        {
          entityType: m,
          unique: "upsells",
          name: "Upsells",
          hasChildren: !1,
          isFolder: !1,
          icon: "icon-chart-curve",
          parent: { unique: "products", entityType: s }
        }
      ];
      return { data: { items: n, total: n.length } };
    }
    return { data: { items: [], total: 0 } };
  }
  async getAncestorsOf(i) {
    return { data: [] };
  }
}
class N extends l {
  constructor(i) {
    super(i, Y);
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
  N as MerchelloTreeRepository,
  N as api
};
//# sourceMappingURL=tree-repository-D0UXBtej.js.map
