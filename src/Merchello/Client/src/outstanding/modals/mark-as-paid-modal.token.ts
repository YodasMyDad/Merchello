import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { OrderListItemDto } from "@orders/types/order.types.js";

export interface MarkAsPaidModalData {
  /** The invoices to mark as paid */
  invoices: OrderListItemDto[];
  /** Currency code for formatting */
  currencyCode: string;
}

export interface MarkAsPaidModalValue {
  /** Number of invoices successfully marked as paid */
  successCount: number;
  /** Whether changes were made */
  changed: boolean;
}

export const MERCHELLO_MARK_AS_PAID_MODAL = new UmbModalToken<
  MarkAsPaidModalData,
  MarkAsPaidModalValue
>("Merchello.MarkAsPaid.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
