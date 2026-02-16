const f = "section/merchello";
function t(e, n) {
  return `${f}/workspace/${e}/${n}`;
}
function s(e, n) {
  history.pushState({}, "", t(e, n));
}
const c = "merchello-orders";
function E(e) {
  return t(c, `edit/orders/${e}`);
}
function m(e) {
  s(c, `edit/orders/${e}`);
}
function D() {
  return t(c, "edit/orders");
}
const T = "merchello-outstanding";
function p() {
  s(T, "edit/outstanding");
}
const i = "merchello-products";
function H(e) {
  return t(i, `edit/products/${e}`);
}
function S(e) {
  return t(i, `edit/products/${e}/tab/variants`);
}
function v(e) {
  s(i, `edit/products/${e}`);
}
function _() {
  return t(i, "edit/products");
}
function $(e, n) {
  return t(i, `edit/products/${e}/variant/${n}`);
}
const o = "merchello-warehouses";
function Y(e) {
  return t(o, `edit/warehouses/${e}`);
}
function L() {
  return t(o, "edit/warehouses/create");
}
function P() {
  s(o, "edit/warehouses/create");
}
function O() {
  return t(o, "edit/warehouses");
}
function I() {
  s(o, "edit/warehouses");
}
const r = "merchello-customers";
function N(e) {
  return t(r, `edit/customers/segment/${e}`);
}
function w() {
  return t(r, "edit/customers/segment/create");
}
function C(e) {
  s(r, `edit/customers/segment/${e}`);
}
function U() {
  return t(r, "edit/customers/view/segments");
}
const a = "merchello-discounts";
function g(e) {
  return t(a, `edit/discounts/${e}`);
}
function W(e) {
  s(a, `edit/discounts/${e}`);
}
function k(e) {
  history.replaceState({}, "", g(e));
}
function b(e) {
  s(a, `edit/discounts/create?category=${e}`);
}
function R() {
  return t(a, "edit/discounts");
}
function y() {
  s(a, "edit/discounts");
}
const l = "merchello-emails";
function A(e) {
  s(l, `edit/emails/${e}`);
}
function M() {
  s(l, "edit/emails/create");
}
function x() {
  return t(l, "edit/emails");
}
const d = "merchello-webhooks";
function B(e) {
  s(d, `edit/webhooks/${e}`);
}
function G() {
  s(d, "edit/webhooks");
}
const u = "merchello-upsells";
function h(e) {
  return t(u, `edit/upsells/${e}`);
}
function V(e) {
  s(u, `edit/upsells/${e}`);
}
function j(e) {
  history.replaceState({}, "", h(e));
}
function q() {
  return t(u, "edit/upsells");
}
function z() {
  s(u, "edit/upsells");
}
export {
  x as A,
  G as B,
  I as C,
  O as D,
  j as E,
  z as F,
  q as G,
  p as a,
  v as b,
  w as c,
  N as d,
  H as e,
  g as f,
  E as g,
  b as h,
  W as i,
  M as j,
  A as k,
  B as l,
  P as m,
  m as n,
  Y as o,
  L as p,
  V as q,
  D as r,
  S as s,
  $ as t,
  _ as u,
  C as v,
  U as w,
  k as x,
  y,
  R as z
};
//# sourceMappingURL=navigation-CURxaj93.js.map
