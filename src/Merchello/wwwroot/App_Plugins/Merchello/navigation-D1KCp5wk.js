const i = "section/merchello";
function t(e, r) {
  return `${i}/workspace/${e}/${r}`;
}
function o(e, r) {
  history.pushState({}, "", t(e, r));
}
const s = "merchello-order", u = "merchello-orders";
function f(e) {
  return t(s, `edit/${e}`);
}
function l(e) {
  o(s, `edit/${e}`);
}
function h() {
  return t(u, "orders");
}
const n = "merchello-product", T = "merchello-products";
function E(e) {
  return t(n, `edit/${e}`);
}
function d(e) {
  o(n, `edit/${e}`);
}
function g() {
  return t(T, "products");
}
function _(e, r) {
  return t(n, `edit/${e}/variant/${r}`);
}
const a = "merchello-warehouse", c = "merchello-warehouses";
function H(e) {
  return t(a, `edit/${e}`);
}
function P() {
  return t(a, "create");
}
function Y() {
  o(a, "create");
}
function O() {
  return t(c, "warehouses");
}
function D() {
  o(c, "warehouses");
}
export {
  E as a,
  d as b,
  _ as c,
  g as d,
  Y as e,
  H as f,
  f as g,
  P as h,
  D as i,
  O as j,
  h as k,
  l as n
};
//# sourceMappingURL=navigation-D1KCp5wk.js.map
