import { UmbTreeRepositoryBase as r } from "@umbraco-cms/backoffice/tree";
import { UmbControllerBase as l } from "@umbraco-cms/backoffice/class-api";
const e = "merchello-root", i = "merchello-orders", o = "merchello-products", a = "merchello-customers", u = "merchello-categories", c = "merchello-filters", T = "merchello-analytics", E = "merchello-discounts", y = "merchello-tax", p = "merchello-suppliers", h = "merchello-warehouses", d = "merchello-providers";
class _ extends l {
  async getRootItems(n) {
    const t = [
      {
        entityType: i,
        unique: "orders",
        name: "Orders",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-receipt-dollar",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: o,
        unique: "products",
        name: "Products",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-box",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: a,
        unique: "customers",
        name: "Customers",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-users",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: u,
        unique: "categories",
        name: "Categories",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-tag",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: c,
        unique: "filters",
        name: "Filters",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-filter",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: T,
        unique: "analytics",
        name: "Analytics",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-chart-curve",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: E,
        unique: "discounts",
        name: "Discounts",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-megaphone",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: y,
        unique: "tax",
        name: "Tax",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-calculator",
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
        entityType: h,
        unique: "warehouses",
        name: "Warehouses",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-store",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: d,
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
class f extends r {
  constructor(n) {
    super(n, _);
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
  f as MerchelloTreeRepository,
  f as api
};
//# sourceMappingURL=repository-DfhUnTZm.js.map
