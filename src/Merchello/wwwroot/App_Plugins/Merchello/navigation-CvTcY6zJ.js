const T = "section/merchello";
function t(e, n) {
  return `${T}/workspace/${e}/${n}`;
}
function s(e, n) {
  history.pushState({}, "", t(e, n));
}
const l = "merchello-orders";
function H(e) {
  return t(l, `edit/orders/${e}`);
}
function S(e) {
  s(l, `edit/orders/${e}`);
}
function _() {
  return t(l, "edit/orders");
}
const g = "merchello-outstanding";
function P() {
  s(g, "edit/outstanding");
}
const r = "merchello-products";
function L(e) {
  return t(r, `edit/products/${e}`);
}
function Y(e) {
  return t(r, `edit/products/${e}/tab/variants`);
}
function v(e) {
  s(r, `edit/products/${e}`);
}
function $() {
  return t(r, "edit/products");
}
const E = "merchello-filters";
function I() {
  return t(E, "edit/filters");
}
function N(e, n) {
  return t(r, `edit/products/${e}/variant/${n}`);
}
const i = "merchello-warehouses";
function h(e) {
  return t(i, `edit/warehouses/${e}`);
}
function O() {
  return t(i, "edit/warehouses/create");
}
function C(e) {
  history.replaceState({}, "", h(e));
}
function w() {
  s(i, "edit/warehouses/create");
}
function U() {
  return t(i, "edit/warehouses");
}
function W() {
  s(i, "edit/warehouses");
}
const a = "merchello-customers";
function k(e) {
  return t(a, `edit/customers/segment/${e}`);
}
function F() {
  return t(a, "edit/customers/segment/create");
}
function b(e) {
  s(a, `edit/customers/segment/${e}`);
}
function R() {
  return t(a, "edit/customers/view/segments");
}
const o = "merchello-discounts";
function p(e) {
  return t(o, `edit/discounts/${e}`);
}
function y(e) {
  s(o, `edit/discounts/${e}`);
}
function M(e) {
  history.replaceState({}, "", p(e));
}
function A(e) {
  s(o, `edit/discounts/create?category=${e}`);
}
function x() {
  return t(o, "edit/discounts");
}
function B() {
  s(o, "edit/discounts");
}
const c = "merchello-product-feed";
function m(e) {
  return t(c, `edit/product-feeds/${e}`);
}
function G() {
  return t(c, "edit/product-feeds/create");
}
function K() {
  return t(c, "edit/product-feeds");
}
function V(e) {
  history.replaceState({}, "", m(e));
}
function j() {
  s(c, "edit/product-feeds");
}
const d = "merchello-emails";
function q(e) {
  s(d, `edit/emails/${e}`);
}
function z() {
  s(d, "edit/emails/create");
}
function J() {
  return t(d, "edit/emails");
}
const f = "merchello-webhooks";
function Q(e) {
  s(f, `edit/webhooks/${e}`);
}
function X() {
  s(f, "edit/webhooks");
}
const u = "merchello-upsells";
function D(e) {
  return t(u, `edit/upsells/${e}`);
}
function Z(e) {
  s(u, `edit/upsells/${e}`);
}
function ee(e) {
  history.replaceState({}, "", D(e));
}
function te() {
  return t(u, "edit/upsells");
}
function se() {
  s(u, "edit/upsells");
}
export {
  V as A,
  j as B,
  K as C,
  M as D,
  B as E,
  x as F,
  J as G,
  X as H,
  C as I,
  W as J,
  U as K,
  ee as L,
  se as M,
  te as N,
  P as a,
  v as b,
  F as c,
  k as d,
  h as e,
  L as f,
  H as g,
  G as h,
  m as i,
  p as j,
  A as k,
  y as l,
  z as m,
  S as n,
  q as o,
  Q as p,
  w as q,
  O as r,
  Z as s,
  _ as t,
  Y as u,
  I as v,
  N as w,
  $ as x,
  b as y,
  R as z
};
//# sourceMappingURL=navigation-CvTcY6zJ.js.map
