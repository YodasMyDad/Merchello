const c = "section/merchello";
function t(e, r) {
  return `${c}/workspace/${e}/${r}`;
}
function s(e, r) {
  history.pushState({}, "", t(e, r));
}
const u = "merchello-orders";
function f(e) {
  return t(u, `edit/orders/${e}`);
}
function g(e) {
  s(u, `edit/orders/${e}`);
}
function l() {
  return t(u, "edit/orders");
}
const i = "merchello-products";
function T(e) {
  return t(i, `edit/products/${e}`);
}
function h(e) {
  s(i, `edit/products/${e}`);
}
function m() {
  return t(i, "edit/products");
}
function D(e, r) {
  return t(i, `edit/products/${e}/variant/${r}`);
}
const n = "merchello-warehouses";
function E(e) {
  return t(n, `edit/warehouses/${e}`);
}
function H() {
  return t(n, "edit/warehouses/create");
}
function S() {
  s(n, "edit/warehouses/create");
}
function $() {
  return t(n, "edit/warehouses");
}
function p() {
  s(n, "edit/warehouses");
}
const a = "merchello-customers";
function v(e) {
  return t(a, `edit/customers/segment/${e}`);
}
function _() {
  return t(a, "edit/customers/segment/create");
}
function O(e) {
  s(a, `edit/customers/segment/${e}`);
}
function P() {
  return t(a, "edit/customers/view/segments");
}
const o = "merchello-discounts";
function d(e) {
  return t(o, `edit/discounts/${e}`);
}
function Y(e) {
  s(o, `edit/discounts/${e}`);
}
function C(e) {
  history.replaceState({}, "", d(e));
}
function L(e) {
  s(o, `edit/discounts/create?category=${e}`);
}
function w() {
  return t(o, "edit/discounts");
}
function W() {
  s(o, "edit/discounts");
}
export {
  T as a,
  h as b,
  _ as c,
  v as d,
  d as e,
  L as f,
  f as g,
  Y as h,
  S as i,
  E as j,
  H as k,
  l,
  D as m,
  g as n,
  m as o,
  O as p,
  P as q,
  C as r,
  W as s,
  w as t,
  p as u,
  $ as v
};
//# sourceMappingURL=navigation-RFmAVsdg.js.map
