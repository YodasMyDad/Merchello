import { a as m, b as c } from "./store-settings-DKmhm5Dt.js";
function s(t, e, o) {
  const a = e ?? m();
  try {
    return new Intl.NumberFormat(void 0, {
      style: "currency",
      currency: a,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(t);
  } catch {
    const n = o ?? c(), i = new Intl.NumberFormat(void 0, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(t);
    return `${n}${i}`;
  }
}
function f(t, e = 0) {
  return new Intl.NumberFormat(void 0, {
    minimumFractionDigits: e,
    maximumFractionDigits: e
  }).format(t);
}
function g(t) {
  const e = new Date(t), a = Math.abs((/* @__PURE__ */ new Date()).getTime() - e.getTime()), n = Math.floor(a / (1e3 * 60 * 60 * 24));
  return n === 0 ? `Today at ${r(e)}` : n === 1 ? `Yesterday at ${r(e)}` : n < 7 ? `${e.toLocaleDateString("en-US", { weekday: "long" })} at ${r(e)}` : e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function D(t) {
  const e = new Date(t);
  return e.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }) + " at " + r(e);
}
function y(t) {
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
function d(t) {
  return new Date(t).toLocaleDateString();
}
function r(t) {
  return t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function l(t) {
  return `${t >= 0 ? "+" : ""}${t}%`;
}
function S(t) {
  return `${t} item${t !== 1 ? "s" : ""}`;
}
export {
  s as a,
  y as b,
  f as c,
  S as d,
  g as e,
  l as f,
  d as g,
  D as h
};
//# sourceMappingURL=formatting-YtMaawx1.js.map
