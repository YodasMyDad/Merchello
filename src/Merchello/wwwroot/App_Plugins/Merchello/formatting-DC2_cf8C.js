import { a as u, b as m } from "./store-settings-Silr5K1w.js";
var l = /* @__PURE__ */ ((e) => (e[e.Payment = 0] = "Payment", e[e.Refund = 10] = "Refund", e[e.PartialRefund = 20] = "PartialRefund", e))(l || {}), t = /* @__PURE__ */ ((e) => (e[e.Unpaid = 0] = "Unpaid", e[e.AwaitingPayment = 10] = "AwaitingPayment", e[e.PartiallyPaid = 20] = "PartiallyPaid", e[e.Paid = 30] = "Paid", e[e.PartiallyRefunded = 40] = "PartiallyRefunded", e[e.Refunded = 50] = "Refunded", e))(t || {}), c = /* @__PURE__ */ ((e) => (e[e.Preparing = 0] = "Preparing", e[e.Shipped = 10] = "Shipped", e[e.Delivered = 20] = "Delivered", e[e.Cancelled = 30] = "Cancelled", e))(c || {}), f = /* @__PURE__ */ ((e) => (e[e.FixedAmount = 0] = "FixedAmount", e[e.Percentage = 1] = "Percentage", e[e.Free = 2] = "Free", e))(f || {});
const g = {
  select: "",
  invoiceNumber: "Order",
  date: "Date",
  customer: "Customer",
  channel: "Channel",
  total: "Total",
  paymentStatus: "Payment",
  fulfillmentStatus: "Fulfillment",
  itemCount: "Items",
  deliveryMethod: "Delivery"
}, D = [
  "invoiceNumber",
  "date",
  "customer",
  "total",
  "paymentStatus",
  "fulfillmentStatus"
], C = [
  "invoiceNumber",
  "date",
  "total",
  "paymentStatus",
  "fulfillmentStatus",
  "itemCount"
];
function R(e, r, o) {
  const i = r ?? u();
  try {
    return new Intl.NumberFormat(void 0, {
      style: "currency",
      currency: i,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(e);
  } catch {
    const a = o ?? m(), d = new Intl.NumberFormat(void 0, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(e);
    return `${a}${d}`;
  }
}
function w(e, r = 0) {
  return new Intl.NumberFormat(void 0, {
    minimumFractionDigits: r,
    maximumFractionDigits: r
  }).format(e);
}
function F(e) {
  const r = new Date(e), i = Math.abs((/* @__PURE__ */ new Date()).getTime() - r.getTime()), a = Math.ceil(i / (1e3 * 60 * 60 * 24));
  return a === 0 ? `Today at ${n(r)}` : a === 1 ? `Yesterday at ${n(r)}` : a < 7 ? `${r.toLocaleDateString("en-US", { weekday: "long" })} at ${n(r)}` : r.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function b(e) {
  const r = new Date(e);
  return r.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }) + " at " + n(r);
}
function L(e) {
  return new Date(e).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
function n(e) {
  return e.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function P(e) {
  return `${e >= 0 ? "+" : ""}${e}%`;
}
function y(e) {
  switch (e) {
    case t.Paid:
      return "paid";
    case t.PartiallyPaid:
      return "partial";
    case t.Refunded:
    case t.PartiallyRefunded:
      return "refunded";
    case t.AwaitingPayment:
      return "awaiting";
    default:
      return "unpaid";
  }
}
function N(e) {
  return e.toLowerCase().replace(/\s+/g, "-");
}
function U(e) {
  return `${e} item${e !== 1 ? "s" : ""}`;
}
export {
  C,
  f as D,
  g as O,
  l as P,
  c as S,
  R as a,
  L as b,
  w as c,
  D as d,
  U as e,
  P as f,
  N as g,
  y as h,
  F as i,
  b as j
};
//# sourceMappingURL=formatting-DC2_cf8C.js.map
