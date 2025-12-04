import { UmbTreeRepositoryBase as o } from "@umbraco-cms/backoffice/tree";
import { UmbControllerBase as i } from "@umbraco-cms/backoffice/class-api";
const e = "merchello-root", l = "merchello-orders", a = "merchello-products", u = "merchello-customers", c = "merchello-providers", T = "merchello-analytics", y = "merchello-marketing", r = "merchello-settings", E = "merchello-warehouses";
class h extends i {
  async getRootItems(t) {
    const n = [
      {
        entityType: l,
        unique: "orders",
        name: "Orders",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-receipt-dollar",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: a,
        unique: "products",
        name: "Products",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-box",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: u,
        unique: "customers",
        name: "Customers",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-users",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: c,
        unique: "providers",
        name: "Providers",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-nodes",
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
        entityType: y,
        unique: "marketing",
        name: "Marketing",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-megaphone",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: r,
        unique: "settings",
        name: "Settings",
        hasChildren: !0,
        isFolder: !0,
        icon: "icon-settings",
        parent: { unique: null, entityType: e }
      }
    ];
    return { data: { items: n, total: n.length } };
  }
  async getChildrenOf(t) {
    if (t.parent.unique === "settings") {
      const n = [
        {
          entityType: E,
          unique: "warehouses",
          name: "Warehouses",
          hasChildren: !1,
          isFolder: !1,
          icon: "icon-store",
          parent: { unique: "settings", entityType: r }
        }
      ];
      return { data: { items: n, total: n.length } };
    }
    return { data: { items: [], total: 0 } };
  }
  async getAncestorsOf(t) {
    return { data: [] };
  }
}
class m extends o {
  constructor(t) {
    super(t, h);
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
//# sourceMappingURL=repository-CEyfo-d8.js.map
