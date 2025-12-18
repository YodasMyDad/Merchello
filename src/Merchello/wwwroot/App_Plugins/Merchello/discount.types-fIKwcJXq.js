var e = /* @__PURE__ */ ((r) => (r[r.Draft = 0] = "Draft", r[r.Active = 1] = "Active", r[r.Scheduled = 2] = "Scheduled", r[r.Expired = 3] = "Expired", r[r.Disabled = 4] = "Disabled", r))(e || {}), d = /* @__PURE__ */ ((r) => (r[r.AmountOffProducts = 0] = "AmountOffProducts", r[r.BuyXGetY = 1] = "BuyXGetY", r[r.AmountOffOrder = 2] = "AmountOffOrder", r[r.FreeShipping = 3] = "FreeShipping", r))(d || {}), f = /* @__PURE__ */ ((r) => (r[r.Code = 0] = "Code", r[r.Automatic = 1] = "Automatic", r))(f || {}), m = /* @__PURE__ */ ((r) => (r[r.FixedAmount = 0] = "FixedAmount", r[r.Percentage = 1] = "Percentage", r[r.Free = 2] = "Free", r))(m || {}), A = /* @__PURE__ */ ((r) => (r[r.None = 0] = "None", r[r.MinimumPurchaseAmount = 1] = "MinimumPurchaseAmount", r[r.MinimumQuantity = 2] = "MinimumQuantity", r))(A || {}), a = /* @__PURE__ */ ((r) => (r[r.AllProducts = 0] = "AllProducts", r[r.SpecificProducts = 1] = "SpecificProducts", r[r.Categories = 2] = "Categories", r[r.ProductFilters = 3] = "ProductFilters", r[r.ProductTypes = 4] = "ProductTypes", r[r.Suppliers = 5] = "Suppliers", r[r.Warehouses = 6] = "Warehouses", r))(a || {}), o = /* @__PURE__ */ ((r) => (r[r.AllCustomers = 0] = "AllCustomers", r[r.CustomerSegments = 1] = "CustomerSegments", r[r.SpecificCustomers = 2] = "SpecificCustomers", r))(o || {});
const l = [
  {
    category: 0,
    label: "Amount off products",
    description: "Discount specific products or categories",
    icon: "icon-tags"
  },
  {
    category: 1,
    label: "Buy X get Y",
    description: "Buy a set of products and get others discounted",
    icon: "icon-gift"
  },
  {
    category: 2,
    label: "Amount off order",
    description: "Discount the entire order total",
    icon: "icon-receipt-dollar"
  },
  {
    category: 3,
    label: "Free shipping",
    description: "Offer free shipping on qualifying orders",
    icon: "icon-truck"
  }
], c = {
  0: "Draft",
  1: "Active",
  2: "Scheduled",
  3: "Expired",
  4: "Disabled"
}, P = {
  0: "default",
  1: "positive",
  2: "warning",
  3: "danger",
  4: "default"
};
export {
  e as D,
  d as a,
  f as b,
  m as c,
  c as d,
  l as e,
  P as f,
  A as g,
  o as h,
  a as i
};
//# sourceMappingURL=discount.types-fIKwcJXq.js.map
