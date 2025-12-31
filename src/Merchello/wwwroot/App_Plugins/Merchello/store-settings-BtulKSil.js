import { M as c } from "./merchello-api-B2ha_6NF.js";
let e = null, r = null;
const n = {
  currencyCode: "GBP",
  currencySymbol: "£",
  invoiceNumberPrefix: "INV-",
  lowStockThreshold: 10
};
async function u() {
  return e || r || (r = (async () => {
    const { data: t, error: o } = await c.getSettings();
    return o || !t ? (console.warn("Failed to load store settings, using defaults:", o), e = n) : e = t, r = null, e;
  })(), r);
}
function i() {
  return e?.currencySymbol ?? n.currencySymbol;
}
function s() {
  return e?.currencyCode ?? n.currencyCode;
}
function a() {
  u();
}
export {
  i as a,
  u as b,
  s as g,
  a as p
};
//# sourceMappingURL=store-settings-BtulKSil.js.map
