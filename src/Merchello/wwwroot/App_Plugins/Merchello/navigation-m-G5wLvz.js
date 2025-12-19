const i = "section/merchello";
function t(e, n) {
  return `${i}/workspace/${e}/${n}`;
}
function r(e, n) {
  history.pushState({}, "", t(e, n));
}
const u = "merchello-order", f = "merchello-orders";
function d(e) {
  return t(u, `edit/${e}`);
}
function h(e) {
  r(u, `edit/${e}`);
}
function D() {
  return t(f, "orders");
}
const o = "merchello-product", g = "merchello-products";
function _(e) {
  return t(o, `edit/${e}`);
}
function m(e) {
  r(o, `edit/${e}`);
}
function H() {
  return t(g, "products");
}
function Y(e, n) {
  return t(o, `edit/${e}/variant/${n}`);
}
const s = "merchello-warehouse", T = "merchello-warehouses";
function S(e) {
  return t(s, `edit/${e}`);
}
function $() {
  return t(s, "create");
}
function P() {
  r(s, "create");
}
function O() {
  return t(T, "warehouses");
}
function N() {
  r(T, "warehouses");
}
const a = "merchello-customer-segment";
function p(e) {
  return t(a, `edit/${e}`);
}
function v() {
  return t(a, "create");
}
function I(e) {
  r(a, `edit/${e}`);
}
function C() {
  return `${i}/workspace/merchello-customers/view/segments`;
}
const c = "merchello-discount", l = "merchello-discounts";
function E(e) {
  return t(c, `edit/${e}`);
}
function R(e) {
  r(c, `edit/${e}`);
}
function L(e) {
  history.replaceState({}, "", E(e));
}
function W(e) {
  r(c, `create?category=${e}`);
}
function w() {
  return t(l, "discounts");
}
function U() {
  r(l, "discounts");
}
export {
  c as D,
  _ as a,
  m as b,
  Y as c,
  H as d,
  v as e,
  p as f,
  d as g,
  E as h,
  W as i,
  R as j,
  P as k,
  S as l,
  $ as m,
  h as n,
  N as o,
  O as p,
  D as q,
  I as r,
  C as s,
  L as t,
  U as u,
  w as v
};
//# sourceMappingURL=navigation-m-G5wLvz.js.map
