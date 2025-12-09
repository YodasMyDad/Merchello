const u = "section/merchello";
function t(e, o) {
  return `${u}/workspace/${e}/${o}`;
}
function r(e, o) {
  history.pushState({}, "", t(e, o));
}
const a = "merchello-order";
function T(e) {
  return t(a, `edit/${e}`);
}
function l(e) {
  r(a, `edit/${e}`);
}
const s = "merchello-product", i = "merchello-products";
function f(e) {
  return t(s, `edit/${e}`);
}
function h(e) {
  r(s, `edit/${e}`);
}
function E() {
  return t(i, "products");
}
const n = "merchello-warehouse", c = "merchello-warehouses";
function d(e) {
  return t(n, `edit/${e}`);
}
function g() {
  return t(n, "create");
}
function _() {
  r(n, "create");
}
function H() {
  return t(c, "warehouses");
}
function P() {
  r(c, "warehouses");
}
export {
  f as a,
  h as b,
  E as c,
  _ as d,
  d as e,
  g as f,
  T as g,
  P as h,
  H as i,
  l as n
};
//# sourceMappingURL=navigation-Cp3wi1pC.js.map
