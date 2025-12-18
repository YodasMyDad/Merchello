const c = "section/merchello";
function t(e, r) {
  return `${c}/workspace/${e}/${r}`;
}
function n(e, r) {
  history.pushState({}, "", t(e, r));
}
const i = "merchello-order", T = "merchello-orders";
function l(e) {
  return t(i, `edit/${e}`);
}
function E(e) {
  n(i, `edit/${e}`);
}
function g() {
  return t(T, "orders");
}
const o = "merchello-product", f = "merchello-products";
function h(e) {
  return t(o, `edit/${e}`);
}
function d(e) {
  n(o, `edit/${e}`);
}
function m() {
  return t(f, "products");
}
function _(e, r) {
  return t(o, `edit/${e}/variant/${r}`);
}
const s = "merchello-warehouse", u = "merchello-warehouses";
function H(e) {
  return t(s, `edit/${e}`);
}
function Y() {
  return t(s, "create");
}
function P() {
  n(s, "create");
}
function S() {
  return t(u, "warehouses");
}
function $() {
  n(u, "warehouses");
}
const a = "merchello-customer-segment";
function D(e) {
  return t(a, `edit/${e}`);
}
function O() {
  return t(a, "create");
}
function p(e) {
  n(a, `edit/${e}`);
}
function R() {
  return `${c}/workspace/merchello-customers/view/segments`;
}
export {
  h as a,
  d as b,
  _ as c,
  m as d,
  O as e,
  D as f,
  l as g,
  P as h,
  H as i,
  Y as j,
  $ as k,
  S as l,
  g as m,
  E as n,
  p as o,
  R as p
};
//# sourceMappingURL=navigation-m-idaC9i.js.map
