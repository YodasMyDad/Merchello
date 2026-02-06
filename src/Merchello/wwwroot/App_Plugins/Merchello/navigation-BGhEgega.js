const d = "section/merchello";
function t(e, n) {
  return `${d}/workspace/${e}/${n}`;
}
function s(e, n) {
  history.pushState({}, "", t(e, n));
}
const c = "merchello-orders";
function m(e) {
  return t(c, `edit/orders/${e}`);
}
function E(e) {
  s(c, `edit/orders/${e}`);
}
function h() {
  return t(c, "edit/orders");
}
const f = "merchello-outstanding";
function p() {
  s(f, "edit/outstanding");
}
const i = "merchello-products";
function D(e) {
  return t(i, `edit/products/${e}`);
}
function H(e) {
  return t(i, `edit/products/${e}/tab/variants`);
}
function S(e) {
  s(i, `edit/products/${e}`);
}
function $() {
  return t(i, "edit/products");
}
function v(e, n) {
  return t(i, `edit/products/${e}/variant/${n}`);
}
const r = "merchello-warehouses";
function _(e) {
  return t(r, `edit/warehouses/${e}`);
}
function L() {
  return t(r, "edit/warehouses/create");
}
function Y() {
  s(r, "edit/warehouses/create");
}
function P() {
  return t(r, "edit/warehouses");
}
function I() {
  s(r, "edit/warehouses");
}
const o = "merchello-customers";
function N(e) {
  return t(o, `edit/customers/segment/${e}`);
}
function O() {
  return t(o, "edit/customers/segment/create");
}
function C(e) {
  s(o, `edit/customers/segment/${e}`);
}
function U() {
  return t(o, "edit/customers/view/segments");
}
const a = "merchello-discounts";
function T(e) {
  return t(a, `edit/discounts/${e}`);
}
function w(e) {
  s(a, `edit/discounts/${e}`);
}
function W(e) {
  history.replaceState({}, "", T(e));
}
function R(e) {
  s(a, `edit/discounts/create?category=${e}`);
}
function y() {
  return t(a, "edit/discounts");
}
function A() {
  s(a, "edit/discounts");
}
const l = "merchello-emails";
function M(e) {
  s(l, `edit/emails/${e}`);
}
function k() {
  s(l, "edit/emails/create");
}
function b() {
  return t(l, "edit/emails");
}
const u = "merchello-upsells";
function g(e) {
  return t(u, `edit/upsells/${e}`);
}
function x(e) {
  s(u, `edit/upsells/${e}`);
}
function V(e) {
  history.replaceState({}, "", g(e));
}
function j() {
  return t(u, "edit/upsells");
}
function q() {
  s(u, "edit/upsells");
}
export {
  I as A,
  P as B,
  V as C,
  q as D,
  j as E,
  p as a,
  S as b,
  O as c,
  N as d,
  D as e,
  T as f,
  m as g,
  R as h,
  w as i,
  k as j,
  M as k,
  Y as l,
  _ as m,
  E as n,
  L as o,
  x as p,
  h as q,
  H as r,
  v as s,
  $ as t,
  C as u,
  U as v,
  W as w,
  A as x,
  y,
  b as z
};
//# sourceMappingURL=navigation-BGhEgega.js.map
