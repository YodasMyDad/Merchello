import { g as o } from "./store-settings-at5wo2tR.js";
function m(t) {
  return `${o()}${t.toFixed(2)}`;
}
function s(t) {
  const e = new Date(t), a = Math.abs((/* @__PURE__ */ new Date()).getTime() - e.getTime()), r = Math.ceil(a / (1e3 * 60 * 60 * 24));
  return r === 0 ? `Today at ${n(e)}` : r === 1 ? `Yesterday at ${n(e)}` : r < 7 ? `${e.toLocaleDateString("en-US", { weekday: "long" })} at ${n(e)}` : e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function u(t) {
  const e = new Date(t);
  return e.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }) + " at " + n(e);
}
function f(t) {
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
function n(t) {
  return t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function g(t) {
  return `${t >= 0 ? "+" : ""}${t}%`;
}
export {
  m as a,
  f as b,
  s as c,
  u as d,
  g as f
};
//# sourceMappingURL=formatting-B7Ourlxi.js.map
