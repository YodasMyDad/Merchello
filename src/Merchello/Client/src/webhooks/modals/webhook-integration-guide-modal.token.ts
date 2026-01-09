import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface WebhookIntegrationGuideModalData {
  /** The authentication type being used */
  authType: string;
}

export interface WebhookIntegrationGuideModalValue {
  // No value returned
}

export const MERCHELLO_WEBHOOK_INTEGRATION_GUIDE_MODAL = new UmbModalToken<
  WebhookIntegrationGuideModalData,
  WebhookIntegrationGuideModalValue
>("Merchello.WebhookIntegrationGuide.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
