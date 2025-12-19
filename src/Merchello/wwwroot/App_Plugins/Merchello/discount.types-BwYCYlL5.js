var r = /* @__PURE__ */ ((e) => (e.Draft = "Draft", e.Active = "Active", e.Scheduled = "Scheduled", e.Expired = "Expired", e.Disabled = "Disabled", e))(r || {}), t = /* @__PURE__ */ ((e) => (e.AmountOffProducts = "AmountOffProducts", e.BuyXGetY = "BuyXGetY", e.AmountOffOrder = "AmountOffOrder", e.FreeShipping = "FreeShipping", e))(t || {}), d = /* @__PURE__ */ ((e) => (e.Code = "Code", e.Automatic = "Automatic", e))(d || {}), i = /* @__PURE__ */ ((e) => (e.FixedAmount = "FixedAmount", e.Percentage = "Percentage", e.Free = "Free", e))(i || {}), o = /* @__PURE__ */ ((e) => (e.None = "None", e.MinimumPurchaseAmount = "MinimumPurchaseAmount", e.MinimumQuantity = "MinimumQuantity", e))(o || {}), c = /* @__PURE__ */ ((e) => (e.AllProducts = "AllProducts", e.SpecificProducts = "SpecificProducts", e.Categories = "Categories", e.ProductFilters = "ProductFilters", e.ProductTypes = "ProductTypes", e.Suppliers = "Suppliers", e.Warehouses = "Warehouses", e))(c || {}), s = /* @__PURE__ */ ((e) => (e.AllCustomers = "AllCustomers", e.CustomerSegments = "CustomerSegments", e.SpecificCustomers = "SpecificCustomers", e))(s || {});
const a = [
  {
    category: "AmountOffProducts",
    label: "Amount off products",
    description: "Discount specific products or categories",
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
}, n = {
  Draft: "default",
  Active: "positive",
  Scheduled: "warning",
  Expired: "danger",
  Disabled: "default"
};
export {
  d as D,
  i as a,
  u as b,
  r as c,
  t as d,
  o as e,
  a as f,
  n as g,
  s as h,
  c as i
};
//# sourceMappingURL=discount.types-BwYCYlL5.js.map
