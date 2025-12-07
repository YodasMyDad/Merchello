import { M as i } from "./merchello-api-D2U6vWKR.js";
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
  s as g,
  u as p
};
//# sourceMappingURL=store-settings-DUNXFZvt.js.map
