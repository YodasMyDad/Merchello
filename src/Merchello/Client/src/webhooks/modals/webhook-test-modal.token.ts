import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type {
  WebhookTestModalData,
  WebhookTestModalValue,
} from "@webhooks/types/webhooks.types.js";

export const MERCHELLO_WEBHOOK_TEST_MODAL = new UmbModalToken<
  WebhookTestModalData,
  WebhookTestModalValue
>("Merchello.Webhook.Test.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
