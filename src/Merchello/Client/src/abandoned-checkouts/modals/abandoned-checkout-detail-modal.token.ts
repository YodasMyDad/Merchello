import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type {
  AbandonedCheckoutDetailModalData,
  AbandonedCheckoutDetailModalValue,
} from "@abandoned-checkouts/types/abandoned-checkout.types.js";

export const MERCHELLO_ABANDONED_CHECKOUT_DETAIL_MODAL = new UmbModalToken<
  AbandonedCheckoutDetailModalData,
  AbandonedCheckoutDetailModalValue
>("Merchello.AbandonedCheckout.Detail.Modal", {
  modal: {
    type: "sidebar",
    size: "large",
  },
});
