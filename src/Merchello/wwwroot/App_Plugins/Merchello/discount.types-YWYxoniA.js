var r = /* @__PURE__ */ ((e) => (e.Draft = "Draft", e.Active = "Active", e.Scheduled = "Scheduled", e.Expired = "Expired", e.Disabled = "Disabled", e))(r || {}), o = /* @__PURE__ */ ((e) => (e.AmountOffProducts = "AmountOffProducts", e.BuyXGetY = "BuyXGetY", e.AmountOffOrder = "AmountOffOrder", e.FreeShipping = "FreeShipping", e))(o || {}), t = /* @__PURE__ */ ((e) => (e.Code = "Code", e.Automatic = "Automatic", e))(t || {}), d = /* @__PURE__ */ ((e) => (e.FixedAmount = "FixedAmount", e.Percentage = "Percentage", e.Free = "Free", e))(d || {}), i = /* @__PURE__ */ ((e) => (e.None = "None", e.MinimumPurchaseAmount = "MinimumPurchaseAmount", e.MinimumQuantity = "MinimumQuantity", e))(i || {}), c = /* @__PURE__ */ ((e) => (e.AllProducts = "AllProducts", e.SpecificProducts = "SpecificProducts", e.Collections = "Collections", e.ProductFilters = "ProductFilters", e.ProductTypes = "ProductTypes", e.Suppliers = "Suppliers", e.Warehouses = "Warehouses", e))(c || {}), s = /* @__PURE__ */ ((e) => (e.AllCustomers = "AllCustomers", e.CustomerSegments = "CustomerSegments", e.SpecificCustomers = "SpecificCustomers", e))(s || {});
const n = [
  {
    category: "AmountOffProducts",
    label: "Amount off products",
    description: "Discount specific products or collections",
    icon: "icon-tags"
  },
  {
    category: "BuyXGetY",
    label: "Buy X get Y",
    description: "Buy a set of products and get others discounted",
    icon: "icon-gift"
  },
  {
    category: "AmountOffOrder",
    label: "Amount off order",
    description: "Discount the entire order total",
    icon: "icon-receipt-dollar"
  },
  {
    category: "FreeShipping",
    label: "Free shipping",
    description: "Offer free shipping on qualifying orders",
    icon: "icon-truck"
  }
], u = {
  Draft: "Draft",
  Active: "Active",
  Scheduled: "Scheduled",
  Expired: "Expired",
  Disabled: "Disabled"
}, a = {
  Draft: "default",
  Active: "positive",
  Scheduled: "warning",
  Expired: "danger",
  Disabled: "default"
};
export {
  t as D,
  d as a,
  u as b,
  r as c,
  o as d,
  i as e,
  n as f,
  a as g,
  s as h,
  c as i
};
//# sourceMappingURL=discount.types-YWYxoniA.js.map
