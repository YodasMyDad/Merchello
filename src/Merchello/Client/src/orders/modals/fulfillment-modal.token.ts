import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface FulfillmentModalData {
  invoiceId: string;
  hasOutstandingBalance?: boolean;
  paymentStatusDisplay?: string;
  balanceDue?: number;
  currencyCode?: string;
  currencySymbol?: string;
}

export interface FulfillmentModalValue {
  shipmentsCreated: number;
}

export const MERCHELLO_FULFILLMENT_MODAL = new UmbModalToken<
  FulfillmentModalData,
  FulfillmentModalValue
>("Merchello.Fulfillment.Modal", {
  modal: {
    type: "sidebar",
    size: "large",
  },
});
