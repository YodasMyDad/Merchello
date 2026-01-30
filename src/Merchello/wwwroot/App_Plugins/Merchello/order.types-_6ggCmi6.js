var r = /* @__PURE__ */ ((e) => (e[e.Payment = 0] = "Payment", e[e.Refund = 10] = "Refund", e[e.PartialRefund = 20] = "PartialRefund", e))(r || {}), a = /* @__PURE__ */ ((e) => (e[e.Preparing = 0] = "Preparing", e[e.Shipped = 10] = "Shipped", e[e.Delivered = 20] = "Delivered", e[e.Cancelled = 30] = "Cancelled", e))(a || {}), t = /* @__PURE__ */ ((e) => (e[e.FixedAmount = 0] = "FixedAmount", e[e.Percentage = 1] = "Percentage", e[e.Free = 2] = "Free", e))(t || {});
const l = {
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
}, n = [
  "invoiceNumber",
  "date",
  "customer",
  "total",
  "paymentStatus",
  "fulfillmentStatus"
], d = [
  "invoiceNumber",
  "date",
  "total",
  "paymentStatus",
  "fulfillmentStatus",
  "itemCount"
];
export {
  d as C,
  t as D,
  l as O,
  r as P,
  a as S,
  n as a
};
//# sourceMappingURL=order.types-_6ggCmi6.js.map
