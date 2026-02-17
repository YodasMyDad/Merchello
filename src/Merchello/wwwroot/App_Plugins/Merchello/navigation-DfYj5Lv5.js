const f = "section/merchello";
function t(e, n) {
  return `${f}/workspace/${e}/${n}`;
}
function s(e, n) {
  history.pushState({}, "", t(e, n));
}
const u = "merchello-orders";
function p(e) {
  return t(u, `edit/orders/${e}`);
}
function D(e) {
  s(u, `edit/orders/${e}`);
}
function H() {
  return t(u, "edit/orders");
}
const T = "merchello-outstanding";
function S() {
  s(T, "edit/outstanding");
}
const i = "merchello-products";
function _(e) {
  return t(i, `edit/products/${e}`);
}
function v(e) {
  return t(i, `edit/products/${e}/tab/variants`);
}
function Y(e) {
  s(i, `edit/products/${e}`);
}
function $() {
  return t(i, "edit/products");
}
const g = "merchello-filters";
function L() {
  return t(g, "edit/filters");
}
function P(e, n) {
  return t(i, `edit/products/${e}/variant/${n}`);
}
const o = "merchello-warehouses";
function h(e) {
  return t(o, `edit/warehouses/${e}`);
}
function I() {
  return t(o, "edit/warehouses/create");
}
function N(e) {
  history.replaceState({}, "", h(e));
}
function O() {
  s(o, "edit/warehouses/create");
}
function w() {
  return t(o, "edit/warehouses");
}
function W() {
  s(o, "edit/warehouses");
}
const a = "merchello-customers";
function C(e) {
  return t(a, `edit/customers/segment/${e}`);
}
function U() {
  return t(a, "edit/customers/segment/create");
}
function k(e) {
  s(a, `edit/customers/segment/${e}`);
}
function b() {
  return t(a, "edit/customers/view/segments");
}
const r = "merchello-discounts";
function E(e) {
  return t(r, `edit/discounts/${e}`);
}
function R(e) {
  s(r, `edit/discounts/${e}`);
}
function y(e) {
  history.replaceState({}, "", E(e));
}
function A(e) {
  s(r, `edit/discounts/create?category=${e}`);
}
function M() {
  return t(r, "edit/discounts");
}
function F() {
  s(r, "edit/discounts");
}
const l = "merchello-emails";
function x(e) {
  s(l, `edit/emails/${e}`);
}
function B() {
  s(l, "edit/emails/create");
}
function G() {
  return t(l, "edit/emails");
}
const d = "merchello-webhooks";
function V(e) {
  s(d, `edit/webhooks/${e}`);
}
function j() {
  s(d, "edit/webhooks");
}
const c = "merchello-upsells";
function m(e) {
  return t(c, `edit/upsells/${e}`);
}
function q(e) {
  s(c, `edit/upsells/${e}`);
}
function z(e) {
  history.replaceState({}, "", m(e));
}
function K() {
  return t(c, "edit/upsells");
}
function J() {
  s(c, "edit/upsells");
}
export {
  M as A,
  G as B,
  j as C,
  N as D,
  W as E,
  w as F,
  z as G,
  J as H,
  K as I,
  S as a,
  Y as b,
  U as c,
  C as d,
  _ as e,
  E as f,
  p as g,
  A as h,
  R as i,
  B as j,
  x as k,
  V as l,
  O as m,
  D as n,
  h as o,
  I as p,
  q,
  H as r,
  v as s,
  L as t,
  P as u,
  $ as v,
  k as w,
  b as x,
  y,
  F as z
};
//# sourceMappingURL=navigation-DfYj5Lv5.js.map
