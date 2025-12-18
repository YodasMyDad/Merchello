import { M as c } from "./merchello-api-CCwReUh_.js";
let e = null, r = null;
const n = {
  currencyCode: "GBP",
  currencySymbol: "£",
  invoiceNumberPrefix: "INV-"
};
async function u() {
  return e || r || (r = (async () => {
    const { data: t, error: o } = await c.getSettings();
    return o || !t ? (console.warn("Failed to load store settings, using defaults:", o), e = n) : e = t, r = null, e;
  })(), r);
}
function l() {
  return e?.currencySymbol ?? n.currencySymbol;
}
function s() {
  return e?.currencyCode ?? n.currencyCode;
}
function a() {
  u();
}
export {
  u as a,
  s as b,
  l as g,
  a as p
};
//# sourceMappingURL=store-settings-BMDirEo-.js.map
