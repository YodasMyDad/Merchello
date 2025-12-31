import { g as u, a as d } from "./store-settings-BtulKSil.js";
var s = /* @__PURE__ */ ((t) => (t[t.Payment = 0] = "Payment", t[t.Refund = 10] = "Refund", t[t.PartialRefund = 20] = "PartialRefund", t))(s || {}), r = /* @__PURE__ */ ((t) => (t[t.Unpaid = 0] = "Unpaid", t[t.AwaitingPayment = 10] = "AwaitingPayment", t[t.PartiallyPaid = 20] = "PartiallyPaid", t[t.Paid = 30] = "Paid", t[t.PartiallyRefunded = 40] = "PartiallyRefunded", t[t.Refunded = 50] = "Refunded", t))(r || {}), l = /* @__PURE__ */ ((t) => (t[t.FixedAmount = 0] = "FixedAmount", t[t.Percentage = 1] = "Percentage", t[t.Free = 2] = "Free", t))(l || {});
const c = {
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
}, g = [
  "invoiceNumber",
  "date",
  "customer",
  "total",
  "paymentStatus",
  "fulfillmentStatus"
], D = [
  "invoiceNumber",
  "date",
  "total",
  "paymentStatus",
  "fulfillmentStatus",
  "itemCount"
];
function C(t, e, o) {
  const i = e ?? u();
  try {
    return new Intl.NumberFormat(void 0, {
      style: "currency",
      currency: i,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(t);
  } catch {
    const a = o ?? d(), m = new Intl.NumberFormat(void 0, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(t);
    return `${a}${m}`;
  }
}
function R(t, e = 0) {
  return new Intl.NumberFormat(void 0, {
    minimumFractionDigits: e,
    maximumFractionDigits: e
  }).format(t);
}
function w(t) {
  const e = new Date(t), i = Math.abs((/* @__PURE__ */ new Date()).getTime() - e.getTime()), a = Math.ceil(i / (1e3 * 60 * 60 * 24));
  return a === 0 ? `Today at ${n(e)}` : a === 1 ? `Yesterday at ${n(e)}` : a < 7 ? `${e.toLocaleDateString("en-US", { weekday: "long" })} at ${n(e)}` : e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function F(t) {
  const e = new Date(t);
  return e.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }) + " at " + n(e);
}
function h(t) {
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
function n(t) {
  return t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function b(t) {
  return `${t >= 0 ? "+" : ""}${t}%`;
}
function L(t) {
  switch (t) {
    case r.Paid:
      return "paid";
    case r.PartiallyPaid:
      return "partial";
    case r.Refunded:
    case r.PartiallyRefunded:
      return "refunded";
    case r.AwaitingPayment:
      return "awaiting";
    default:
      return "unpaid";
  }
}
function S(t) {
  return t.toLowerCase().replace(/\s+/g, "-");
}
function y(t) {
  return `${t} item${t !== 1 ? "s" : ""}`;
}
export {
  D as C,
  l as D,
  c as O,
  s as P,
  C as a,
  h as b,
  R as c,
  g as d,
  y as e,
  b as f,
  S as g,
  L as h,
  w as i,
  F as j
};
//# sourceMappingURL=formatting-CN-xeS_g.js.map
