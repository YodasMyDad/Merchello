import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface ManualPaymentModalData {
  /** The invoice ID to record payment for */
  invoiceId: string;
  /** The balance due on the invoice */
  balanceDue: number;
}

export interface ManualPaymentModalValue {
  /** Whether a payment was recorded */
  recorded: boolean;
}

export const MERCHELLO_MANUAL_PAYMENT_MODAL = new UmbModalToken<
  ManualPaymentModalData,
  ManualPaymentModalValue
>("Merchello.ManualPayment.Modal", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
