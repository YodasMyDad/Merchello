import { M as c } from "./merchello-api-DPQ4r4XT.js";
let e = null, t = null;
const n = {
  currencyCode: "GBP",
  currencySymbol: "£",
  invoiceNumberPrefix: "INV-",
  lowStockThreshold: 10,
  discountCodeLength: 8,
  defaultDiscountPriority: 1e3,
  defaultPaginationPageSize: 50,
  refundQuickAmountPercentages: [50]
};
async function u() {
  return e || t || (t = (async () => {
    const { data: r, error: o } = await c.getSettings();
    return o || !r ? (console.warn("Failed to load store settings, using defaults:", o), e = n) : e = r, t = null, e;
  })(), t);
}
function a() {
  return e?.currencySymbol ?? n.currencySymbol;
}
function l() {
  return e?.currencyCode ?? n.currencyCode;
}
function s() {
  u();
}
export {
  l as a,
  a as b,
  u as g,
  s as p
};
//# sourceMappingURL=store-settings-BhzqJKNt.js.map
