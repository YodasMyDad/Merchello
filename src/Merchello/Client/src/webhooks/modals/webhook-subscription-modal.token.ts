import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type {
  WebhookSubscriptionModalData,
  WebhookSubscriptionModalValue,
} from "@webhooks/types/webhooks.types.js";

export const MERCHELLO_WEBHOOK_SUBSCRIPTION_MODAL = new UmbModalToken<
  WebhookSubscriptionModalData,
  WebhookSubscriptionModalValue
>("Merchello.Webhook.Subscription.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
