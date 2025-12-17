import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface CancelInvoiceModalData {
  /** The invoice ID to cancel */
  invoiceId: string;
  /** The invoice number for display */
  invoiceNumber: string;
}

export interface CancelInvoiceModalValue {
  /** Whether the invoice was cancelled */
  cancelled: boolean;
  /** Number of orders that were cancelled */
  cancelledOrderCount?: number;
}

export const MERCHELLO_CANCEL_INVOICE_MODAL = new UmbModalToken<
  CancelInvoiceModalData,
  CancelInvoiceModalValue
>("Merchello.CancelInvoice.Modal", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
