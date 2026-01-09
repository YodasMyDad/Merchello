import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type {
  DeliveryDetailModalData,
  DeliveryDetailModalValue,
} from "@webhooks/types/webhooks.types.js";

export const MERCHELLO_DELIVERY_DETAIL_MODAL = new UmbModalToken<
  DeliveryDetailModalData,
  DeliveryDetailModalValue
>("Merchello.Webhook.Delivery.Modal", {
  modal: {
    type: "sidebar",
    size: "large",
  },
});
