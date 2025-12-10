const i = "section/merchello";
function t(e, r) {
  return `${i}/workspace/${e}/${r}`;
}
function o(e, r) {
  history.pushState({}, "", t(e, r));
}
const s = "merchello-order";
function T(e) {
  return t(s, `edit/${e}`);
}
function f(e) {
  o(s, `edit/${e}`);
}
const a = "merchello-product", u = "merchello-products";
function l(e) {
  return t(a, `edit/${e}`);
}
function h(e) {
  o(a, `edit/${e}`);
}
function E() {
  return t(u, "products");
}
function d(e, r) {
  return t(a, `edit/${e}/variant/${r}`);
}
const n = "merchello-warehouse", c = "merchello-warehouses";
function g(e) {
  return t(n, `edit/${e}`);
}
function H() {
  return t(n, "create");
}
function _() {
  o(n, "create");
}
function P() {
  return t(c, "warehouses");
}
function Y() {
  o(c, "warehouses");
}
export {
  l as a,
  h as b,
  d as c,
  E as d,
  _ as e,
  g as f,
  T as g,
  H as h,
  Y as i,
  P as j,
  f as n
};
//# sourceMappingURL=navigation-DnzDaPpA.js.map
