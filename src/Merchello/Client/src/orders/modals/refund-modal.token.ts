import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { PaymentDto } from "../types/order.types.js";

export interface RefundModalData {
  /** The payment to refund */
  payment: PaymentDto;
}

export interface RefundModalValue {
  /** Whether a refund was processed */
  refunded: boolean;
}

export const MERCHELLO_REFUND_MODAL = new UmbModalToken<
  RefundModalData,
  RefundModalValue
>("Merchello.Refund.Modal", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
