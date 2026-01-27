import { a as d, b as m } from "./store-settings-B0mEEUwl.js";
var l = /* @__PURE__ */ ((e) => (e[e.Payment = 0] = "Payment", e[e.Refund = 10] = "Refund", e[e.PartialRefund = 20] = "PartialRefund", e))(l || {}), t = /* @__PURE__ */ ((e) => (e[e.Unpaid = 0] = "Unpaid", e[e.AwaitingPayment = 10] = "AwaitingPayment", e[e.PartiallyPaid = 20] = "PartiallyPaid", e[e.Paid = 30] = "Paid", e[e.PartiallyRefunded = 40] = "PartiallyRefunded", e[e.Refunded = 50] = "Refunded", e))(t || {}), f = /* @__PURE__ */ ((e) => (e[e.Preparing = 0] = "Preparing", e[e.Shipped = 10] = "Shipped", e[e.Delivered = 20] = "Delivered", e[e.Cancelled = 30] = "Cancelled", e))(f || {}), c = /* @__PURE__ */ ((e) => (e[e.FixedAmount = 0] = "FixedAmount", e[e.Percentage = 1] = "Percentage", e[e.Free = 2] = "Free", e))(c || {});
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
function w(e, r, o) {
  const i = r ?? d();
  try {
    return new Intl.NumberFormat(void 0, {
      style: "currency",
      currency: i,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(e);
  } catch {
    const a = o ?? m(), u = new Intl.NumberFormat(void 0, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(e);
    return `${a}${u}`;
  }
}
function R(e, r = 0) {
  return new Intl.NumberFormat(void 0, {
    minimumFractionDigits: r,
    maximumFractionDigits: r
  }).format(e);
}
function F(e) {
  const r = new Date(e), i = Math.abs((/* @__PURE__ */ new Date()).getTime() - r.getTime()), a = Math.floor(i / (1e3 * 60 * 60 * 24));
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
function P(e) {
  return new Date(e).toLocaleDateString();
}
function n(e) {
  return e.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function y(e) {
  return `${e >= 0 ? "+" : ""}${e}%`;
}
function N(e) {
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
function U(e) {
  return e.toLowerCase().replace(/\s+/g, "-");
}
function h(e) {
  return `${e} item${e !== 1 ? "s" : ""}`;
}
export {
  C,
  c as D,
  g as O,
  l as P,
  f as S,
  w as a,
  L as b,
  R as c,
  D as d,
  h as e,
  y as f,
  U as g,
  F as h,
  P as i,
  N as j,
  b as k
};
//# sourceMappingURL=formatting-nNQcXJwZ.js.map
