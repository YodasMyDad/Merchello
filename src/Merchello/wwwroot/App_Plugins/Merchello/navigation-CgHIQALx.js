const c = "section/merchello";
function t(e, n) {
  return `${c}/workspace/${e}/${n}`;
}
function s(e, n) {
  history.pushState({}, "", t(e, n));
}
const u = "merchello-orders";
function g(e) {
  return t(u, `edit/orders/${e}`);
}
function T(e) {
  s(u, `edit/orders/${e}`);
}
function l() {
  return t(u, "edit/orders");
}
const d = "merchello-outstanding";
function h() {
  s(d, "edit/outstanding");
}
const i = "merchello-products";
function m(e) {
  return t(i, `edit/products/${e}`);
}
function D(e) {
  s(i, `edit/products/${e}`);
}
function E() {
  return t(i, "edit/products");
}
function H(e, n) {
  return t(i, `edit/products/${e}/variant/${n}`);
}
const r = "merchello-warehouses";
function S(e) {
  return t(r, `edit/warehouses/${e}`);
}
function $() {
  return t(r, "edit/warehouses/create");
}
function _() {
  s(r, "edit/warehouses/create");
}
function p() {
  return t(r, "edit/warehouses");
}
function v() {
  s(r, "edit/warehouses");
}
const a = "merchello-customers";
function O(e) {
  return t(a, `edit/customers/segment/${e}`);
}
function Y() {
  return t(a, "edit/customers/segment/create");
}
function P(e) {
  s(a, `edit/customers/segment/${e}`);
}
function L() {
  return t(a, "edit/customers/view/segments");
}
const o = "merchello-discounts";
function f(e) {
  return t(o, `edit/discounts/${e}`);
}
function N(e) {
  s(o, `edit/discounts/${e}`);
}
function w(e) {
  history.replaceState({}, "", f(e));
}
function C(e) {
  s(o, `edit/discounts/create?category=${e}`);
}
function I() {
  return t(o, "edit/discounts");
}
function W() {
  s(o, "edit/discounts");
}
export {
  h as a,
  m as b,
  D as c,
  Y as d,
  O as e,
  f,
  g,
  C as h,
  N as i,
  _ as j,
  S as k,
  $ as l,
  l as m,
  T as n,
  H as o,
  E as p,
  P as q,
  L as r,
  w as s,
  W as t,
  I as u,
  v,
  p as w
};
//# sourceMappingURL=navigation-CgHIQALx.js.map
