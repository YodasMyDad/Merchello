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
function D() {
  s(f, "edit/outstanding");
}
const o = "merchello-products";
function p(e) {
  return t(o, `edit/products/${e}`);
}
function H(e) {
  s(o, `edit/products/${e}`);
}
function S() {
  return t(o, "edit/products");
}
function _(e, n) {
  return t(o, `edit/products/${e}/variant/${n}`);
}
const i = "merchello-warehouses";
function $(e) {
  return t(i, `edit/warehouses/${e}`);
}
function v() {
  return t(i, "edit/warehouses/create");
}
function L() {
  s(i, "edit/warehouses/create");
}
function Y() {
  return t(i, "edit/warehouses");
}
function P() {
  s(i, "edit/warehouses");
}
const a = "merchello-customers";
function I(e) {
  return t(a, `edit/customers/segment/${e}`);
}
function N() {
  return t(a, "edit/customers/segment/create");
}
function O(e) {
  s(a, `edit/customers/segment/${e}`);
}
function C() {
  return t(a, "edit/customers/view/segments");
}
const r = "merchello-discounts";
function T(e) {
  return t(r, `edit/discounts/${e}`);
}
function U(e) {
  s(r, `edit/discounts/${e}`);
}
function w(e) {
  history.replaceState({}, "", T(e));
}
function W(e) {
  s(r, `edit/discounts/create?category=${e}`);
}
function R() {
  return t(r, "edit/discounts");
}
function y() {
  s(r, "edit/discounts");
}
const l = "merchello-emails";
function A(e) {
  s(l, `edit/emails/${e}`);
}
function M() {
  s(l, "edit/emails/create");
}
function k() {
  return t(l, "edit/emails");
}
const u = "merchello-upsells";
function g(e) {
  return t(u, `edit/upsells/${e}`);
}
function x(e) {
  s(u, `edit/upsells/${e}`);
}
function b(e) {
  history.replaceState({}, "", g(e));
}
function j() {
  return t(u, "edit/upsells");
}
function q() {
  s(u, "edit/upsells");
}
export {
  Y as A,
  b as B,
  q as C,
  j as D,
  D as a,
  H as b,
  N as c,
  I as d,
  p as e,
  T as f,
  m as g,
  W as h,
  U as i,
  M as j,
  A as k,
  L as l,
  $ as m,
  E as n,
  v as o,
  x as p,
  h as q,
  _ as r,
  S as s,
  O as t,
  C as u,
  w as v,
  y as w,
  R as x,
  k as y,
  P as z
};
//# sourceMappingURL=navigation-Bu0pwyW2.js.map
