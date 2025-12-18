var d = /* @__PURE__ */ ((r) => (r[r.Payment = 0] = "Payment", r[r.Refund = 10] = "Refund", r[r.PartialRefund = 20] = "PartialRefund", r))(d || {}), l = /* @__PURE__ */ ((r) => (r[r.Unpaid = 0] = "Unpaid", r[r.AwaitingPayment = 10] = "AwaitingPayment", r[r.PartiallyPaid = 20] = "PartiallyPaid", r[r.Paid = 30] = "Paid", r[r.PartiallyRefunded = 40] = "PartiallyRefunded", r[r.Refunded = 50] = "Refunded", r))(l || {}), a = /* @__PURE__ */ ((r) => (r[r.FixedAmount = 0] = "FixedAmount", r[r.Percentage = 1] = "Percentage", r[r.Free = 2] = "Free", r))(a || {});
const e = {
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
}, t = [
  "invoiceNumber",
  "date",
  "customer",
  "total",
  "paymentStatus",
  "fulfillmentStatus"
], i = [
  "invoiceNumber",
  "date",
  "total",
  "paymentStatus",
  "fulfillmentStatus",
  "itemCount"
];
export {
  i as C,
  a as D,
  l as I,
  e as O,
  d as P,
  t as a
};
//# sourceMappingURL=order.types-vEwMhKjb.js.map
