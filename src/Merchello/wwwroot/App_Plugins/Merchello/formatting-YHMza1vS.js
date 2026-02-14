import { a as u, b as c } from "./store-settings-BPUUVKYl.js";
const i = 1e3 * 60 * 60 * 24, s = /(?:[zZ]|[+-]\d{2}:\d{2})$/;
function D(e, t, n) {
  const r = t ?? u();
  try {
    return new Intl.NumberFormat(void 0, {
      style: "currency",
      currency: r,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(e);
  } catch {
    const o = n ?? c(), m = new Intl.NumberFormat(void 0, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(e);
    return `${o}${m}`;
  }
}
function f(e, t = 0) {
  return new Intl.NumberFormat(void 0, {
    minimumFractionDigits: t,
    maximumFractionDigits: t
  }).format(e);
}
function d(e) {
  const t = new Date(e);
  if (Number.isNaN(t.getTime()))
    return e;
  const n = s.test(e), r = /* @__PURE__ */ new Date(), o = Math.round(
    n ? (Date.UTC(r.getUTCFullYear(), r.getUTCMonth(), r.getUTCDate()) - Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())) / i : (new Date(r.getFullYear(), r.getMonth(), r.getDate()).getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / i
  );
  return o === 0 ? `Today at ${a(t, n ? "UTC" : void 0)}` : o === 1 ? `Yesterday at ${a(t, n ? "UTC" : void 0)}` : o < 7 ? `${t.toLocaleDateString("en-US", { weekday: "long", timeZone: n ? "UTC" : void 0 })} at ${a(t, n ? "UTC" : void 0)}` : t.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: n ? "UTC" : void 0
  });
}
function l(e) {
  const t = new Date(e);
  return t.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }) + " at " + a(t);
}
function T(e) {
  return new Date(e).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
function U(e) {
  return new Date(e).toLocaleDateString();
}
function a(e, t) {
  return e.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: t });
}
function C(e) {
  return `${e >= 0 ? "+" : ""}${e}%`;
}
function y(e) {
  return `${e} item${e !== 1 ? "s" : ""}`;
}
export {
  D as a,
  T as b,
  f as c,
  y as d,
  d as e,
  C as f,
  U as g,
  l as h
};
//# sourceMappingURL=formatting-YHMza1vS.js.map
