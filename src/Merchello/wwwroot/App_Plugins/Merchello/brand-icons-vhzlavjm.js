const a = {
  card: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h20" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="13" width="5" height="2" rx="0.5" fill="currentColor" opacity="0.5"/></svg>',
  manual: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 7h-1V6a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-8a3 3 0 0 0-3-3zM5 5h10a1 1 0 0 1 1 1v1H5a1 1 0 0 1 0-2zm15 10h-2a1 1 0 0 1 0-2h2v2z" fill="currentColor"/></svg>'
};
function t(e) {
  const r = e.toLowerCase();
  return r.includes("card") ? a.card : r.includes("manual") || r.includes("purchaseorder") || r.includes("purchase-order") ? a.manual : null;
}
function n(e) {
  return e.toLowerCase().includes("manual") ? a.manual : a.card;
}
export {
  n as a,
  t as g
};
//# sourceMappingURL=brand-icons-vhzlavjm.js.map
