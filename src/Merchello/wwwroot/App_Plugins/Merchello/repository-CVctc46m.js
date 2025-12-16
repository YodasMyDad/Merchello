import { UmbTreeRepositoryBase as r } from "@umbraco-cms/backoffice/tree";
import { UmbControllerBase as l } from "@umbraco-cms/backoffice/class-api";
const e = "merchello-root", i = "merchello-orders", o = "merchello-products", a = "merchello-customers", u = "merchello-categories", c = "merchello-filters", T = "merchello-product-types", E = "merchello-product-feed", p = "merchello-analytics", y = "merchello-discounts", d = "merchello-tax", h = "merchello-suppliers", _ = "merchello-warehouses", m = "merchello-providers";
class C extends l {
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
        entityType: d,
        unique: "tax",
        name: "Tax",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-calculator",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: h,
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
        entityType: m,
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
class R extends r {
  constructor(n) {
    super(n, C);
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
//# sourceMappingURL=repository-CVctc46m.js.map
