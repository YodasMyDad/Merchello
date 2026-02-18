import { M as c } from "./merchello-api-COnU_HX2.js";
let e = null, r = null;
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
  return e || r || (r = (async () => {
    const { data: t, error: o } = await c.getSettings();
    return o || !t ? e = n : e = t, r = null, e;
  })(), r);
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
//# sourceMappingURL=store-settings-BKyRkVmT.js.map
