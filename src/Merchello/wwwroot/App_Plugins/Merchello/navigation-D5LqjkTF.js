const i = "section/merchello";
function t(e, o) {
  return `${i}/workspace/${e}/${o}`;
}
function r(e, o) {
  history.pushState({}, "", t(e, o));
}
const n = "merchello-order";
function u(e) {
  return t(n, `edit/${e}`);
}
function T(e) {
  r(n, `edit/${e}`);
}
const s = "merchello-product";
function h(e) {
  return t(s, `edit/${e}`);
}
function l(e) {
  r(s, `edit/${e}`);
}
const a = "merchello-warehouse", c = "merchello-warehouses";
function f(e) {
  return t(a, `edit/${e}`);
}
function E() {
  return t(a, "create");
}
function d() {
  r(a, "create");
}
function g() {
  return t(c, "warehouses");
}
function H() {
  r(c, "warehouses");
}
export {
  h as a,
  l as b,
  d as c,
  f as d,
  E as e,
  H as f,
  u as g,
  g as h,
  T as n
};
//# sourceMappingURL=navigation-D5LqjkTF.js.map
