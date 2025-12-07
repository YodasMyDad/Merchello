var a = /* @__PURE__ */ ((l) => (l[l.Payment = 0] = "Payment", l[l.Refund = 10] = "Refund", l[l.PartialRefund = 20] = "PartialRefund", l))(a || {}), r = /* @__PURE__ */ ((l) => (l[l.Unpaid = 0] = "Unpaid", l[l.AwaitingPayment = 10] = "AwaitingPayment", l[l.PartiallyPaid = 20] = "PartiallyPaid", l[l.Paid = 30] = "Paid", l[l.PartiallyRefunded = 40] = "PartiallyRefunded", l[l.Refunded = 50] = "Refunded", l))(r || {}), e = /* @__PURE__ */ ((l) => (l[l.Amount = 0] = "Amount", l[l.Percentage = 1] = "Percentage", l))(e || {});
const d = {
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
], u = [
  "invoiceNumber",
  "date",
  "total",
  "paymentStatus",
  "fulfillmentStatus",
  "itemCount"
];
export {
  u as C,
  e as D,
  r as I,
  d as O,
  a as P,
  t as a
};
//# sourceMappingURL=order.types-B45a7FtJ.js.map
