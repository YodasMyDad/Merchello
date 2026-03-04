import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { PaymentDto } from "@orders/types/order.types.js";

export interface RefundModalData {
  /** The payment to refund */
  payment: PaymentDto;
  /** Suggested refund amount (e.g., overpayment credit due). If provided, defaults the amount field. */
  suggestedRefundAmount?: number;
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
    size: "medium",
  },
});
