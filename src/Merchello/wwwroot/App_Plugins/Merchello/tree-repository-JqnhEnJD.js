import { UmbTreeRepositoryBase as i } from "@umbraco-cms/backoffice/tree";
import { M as e, a, b as r, c as l, d as o, e as u, f as T, g as E, h as y, i as c, j as p, k as d, l as _ } from "./bundle.manifests-DpXnf-5Q.js";
import { UmbControllerBase as C } from "@umbraco-cms/backoffice/class-api";
class h extends C {
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
        entityType: c,
        unique: "discounts",
        name: "Discounts",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-megaphone",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: p,
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
class m extends i {
  constructor(n) {
    super(n, h);
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
  m as MerchelloTreeRepository,
  m as api
};
//# sourceMappingURL=tree-repository-JqnhEnJD.js.map
