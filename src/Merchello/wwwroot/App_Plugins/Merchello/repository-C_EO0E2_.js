import { UmbTreeRepositoryBase as i } from "@umbraco-cms/backoffice/tree";
import { UmbControllerBase as o } from "@umbraco-cms/backoffice/class-api";
const e = "merchello-root", l = "merchello-orders", a = "merchello-products", u = "merchello-customers", c = "merchello-providers", T = "merchello-analytics", p = "merchello-marketing", s = "merchello-settings", y = "merchello-warehouses", E = "merchello-shipping";
class h extends o {
  async getRootItems(n) {
    const t = [
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
        entityType: p,
        unique: "marketing",
        name: "Marketing",
        hasChildren: !1,
        isFolder: !1,
        icon: "icon-megaphone",
        parent: { unique: null, entityType: e }
      },
      {
        entityType: s,
        unique: "settings",
        name: "Settings",
        hasChildren: !0,
        isFolder: !0,
        icon: "icon-settings",
        parent: { unique: null, entityType: e }
      }
    ];
    return { data: { items: t, total: t.length } };
  }
  async getChildrenOf(n) {
    if (n.parent.unique === "settings") {
      const t = [
        {
          entityType: y,
          unique: "warehouses",
          name: "Warehouses",
          hasChildren: !1,
          isFolder: !1,
          icon: "icon-store",
          parent: { unique: "settings", entityType: s }
        },
        {
          entityType: E,
          unique: "shipping",
          name: "Shipping",
          hasChildren: !1,
          isFolder: !1,
          icon: "icon-truck",
          parent: { unique: "settings", entityType: s }
        }
      ];
      return { data: { items: t, total: t.length } };
    }
    return { data: { items: [], total: 0 } };
  }
  async getAncestorsOf(n) {
    return { data: [] };
  }
}
class _ extends i {
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
  _ as MerchelloTreeRepository,
  _ as api
};
//# sourceMappingURL=repository-C_EO0E2_.js.map
