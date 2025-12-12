import { M as i } from "./merchello-api-CU-ozmmd.js";
let e = null, t = null;
const o = {
  currencyCode: "GBP",
  currencySymbol: "£",
  invoiceNumberPrefix: "INV-"
};
async function l() {
  return e || t || (t = (async () => {
    const { data: n, error: r } = await i.getSettings();
    return r || !n ? (console.warn("Failed to load store settings, using defaults:", r), e = o) : e = n, t = null, e;
  })(), t);
}
function s() {
  return e?.currencySymbol ?? o.currencySymbol;
}
function u() {
  l();
}
export {
  l as a,
  s as g,
  u as p
};
//# sourceMappingURL=store-settings-CktE3Lz_.js.map
