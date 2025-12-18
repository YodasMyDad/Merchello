const i = "section/merchello";
function t(e, n) {
  return `${i}/workspace/${e}/${n}`;
}
function r(e, n) {
  history.pushState({}, "", t(e, n));
}
const u = "merchello-order", l = "merchello-orders";
function E(e) {
  return t(u, `edit/${e}`);
}
function d(e) {
  r(u, `edit/${e}`);
}
function h() {
  return t(l, "orders");
}
const o = "merchello-product", f = "merchello-products";
function D(e) {
  return t(o, `edit/${e}`);
}
function _(e) {
  r(o, `edit/${e}`);
}
function m() {
  return t(f, "products");
}
function Y(e, n) {
  return t(o, `edit/${e}/variant/${n}`);
}
const s = "merchello-warehouse", T = "merchello-warehouses";
function H(e) {
  return t(s, `edit/${e}`);
}
function S() {
  return t(s, "create");
}
function $() {
  r(s, "create");
}
function P() {
  return t(T, "warehouses");
}
function O() {
  r(T, "warehouses");
}
const a = "merchello-customer-segment";
function N(e) {
  return t(a, `edit/${e}`);
}
function I() {
  return t(a, "create");
}
function v(e) {
  r(a, `edit/${e}`);
}
function C() {
  return `${i}/workspace/merchello-customers/view/segments`;
}
const c = "merchello-discount", g = "merchello-discounts";
function p(e) {
  return t(c, `edit/${e}`);
}
function R(e) {
  r(c, `edit/${e}`);
}
function W(e) {
  r(c, `create?category=${e}`);
}
function L() {
  r(g, "discounts");
}
export {
  c as D,
  D as a,
  _ as b,
  Y as c,
  m as d,
  I as e,
  N as f,
  E as g,
  p as h,
  W as i,
  R as j,
  $ as k,
  H as l,
  S as m,
  d as n,
  O as o,
  P as p,
  h as q,
  v as r,
  C as s,
  L as t
};
//# sourceMappingURL=navigation-BP2IjQvn.js.map
