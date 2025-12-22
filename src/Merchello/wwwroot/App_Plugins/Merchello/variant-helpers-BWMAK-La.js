function u(t, n) {
  if (!t.variantOptionsKey)
    return null;
  const a = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, e = t.variantOptionsKey.match(a) || [], r = [];
  for (const i of e)
    for (const o of n) {
      const s = o.values.find((c) => c.id === i);
      if (s) {
        r.push(s.name);
        break;
      }
    }
  return r.length > 0 ? r.join(" / ") : null;
}
function f(t) {
  const n = t.filter((a) => a.isVariant);
  return n.length === 0 ? 0 : n.reduce((a, e) => a * (e.values.length || 1), 1);
}
function g(t) {
  switch (t) {
    case "OutOfStock":
      return "badge-danger";
    case "LowStock":
      return "badge-warning";
    case "InStock":
      return "badge-positive";
    case "Untracked":
    default:
      return "badge-default";
  }
}
function d(t) {
  return t.some((n) => !n.sku || n.price === 0);
}
function l(t, n) {
  return t > 1 && n === 0;
}
function p(t) {
  try {
    const n = new URL(t), a = n.pathname.split("/").filter((e) => e);
    return a.length === 0 ? n.hostname : `${n.hostname} › ${a.join(" › ")}`;
  } catch {
    return t;
  }
}
export {
  l as a,
  u as b,
  f as c,
  p as f,
  g,
  d as h
};
//# sourceMappingURL=variant-helpers-BWMAK-La.js.map
