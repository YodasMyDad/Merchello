import { a as o } from "./store-settings-tgn1o2ap.js";
import { I as a } from "./order.types-B45a7FtJ.js";
function m(e) {
  return `${o()}${e.toFixed(2)}`;
}
function f(e) {
  const t = new Date(e), i = Math.abs((/* @__PURE__ */ new Date()).getTime() - t.getTime()), r = Math.ceil(i / (1e3 * 60 * 60 * 24));
  return r === 0 ? `Today at ${n(t)}` : r === 1 ? `Yesterday at ${n(t)}` : r < 7 ? `${t.toLocaleDateString("en-US", { weekday: "long" })} at ${n(t)}` : t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function d(e) {
  const t = new Date(e);
  return t.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }) + " at " + n(t);
}
function l(e) {
  return new Date(e).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
function n(e) {
  return e.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function g(e) {
  return `${e >= 0 ? "+" : ""}${e}%`;
}
function y(e) {
  switch (e) {
    case a.Paid:
      return "paid";
    case a.PartiallyPaid:
      return "partial";
    case a.Refunded:
    case a.PartiallyRefunded:
      return "refunded";
    case a.AwaitingPayment:
      return "awaiting";
    default:
      return "unpaid";
  }
}
function S(e) {
  return e.toLowerCase().replace(/\s+/g, "-");
}
function D(e) {
  return `${e} item${e !== 1 ? "s" : ""}`;
}
export {
  m as a,
  l as b,
  D as c,
  y as d,
  f as e,
  g as f,
  S as g,
  d as h
};
//# sourceMappingURL=formatting-CO_ATfL6.js.map
