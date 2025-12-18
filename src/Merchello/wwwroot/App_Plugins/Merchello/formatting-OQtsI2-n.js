import { g as s } from "./store-settings-BMDirEo-.js";
import { I as n } from "./order.types-vEwMhKjb.js";
function m(t, e, i) {
  if (e)
    try {
      return new Intl.NumberFormat(void 0, { style: "currency", currency: e }).format(t);
    } catch {
    }
  return `${i ?? s()}${t.toFixed(2)}`;
}
function f(t) {
  const e = new Date(t), o = Math.abs((/* @__PURE__ */ new Date()).getTime() - e.getTime()), r = Math.ceil(o / (1e3 * 60 * 60 * 24));
  return r === 0 ? `Today at ${a(e)}` : r === 1 ? `Yesterday at ${a(e)}` : r < 7 ? `${e.toLocaleDateString("en-US", { weekday: "long" })} at ${a(e)}` : e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function l(t) {
  const e = new Date(t);
  return e.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }) + " at " + a(e);
}
function d(t) {
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
function a(t) {
  return t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function g(t) {
  return `${t >= 0 ? "+" : ""}${t}%`;
}
function y(t) {
  switch (t) {
    case n.Paid:
      return "paid";
    case n.PartiallyPaid:
      return "partial";
    case n.Refunded:
    case n.PartiallyRefunded:
      return "refunded";
    case n.AwaitingPayment:
      return "awaiting";
    default:
      return "unpaid";
  }
}
function S(t) {
  return t.toLowerCase().replace(/\s+/g, "-");
}
function h(t) {
  return `${t} item${t !== 1 ? "s" : ""}`;
}
export {
  m as a,
  d as b,
  h as c,
  y as d,
  f as e,
  g as f,
  S as g,
  l as h
};
//# sourceMappingURL=formatting-OQtsI2-n.js.map
