import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface EmailPreviewModalData {
  configurationId: string;
}

export interface EmailPreviewModalValue {
  testSent?: boolean;
}

export const MERCHELLO_EMAIL_PREVIEW_MODAL = new UmbModalToken<
  EmailPreviewModalData,
  EmailPreviewModalValue
>("Merchello.Email.Preview.Modal", {
  modal: {
    type: "sidebar",
    size: "large",
  },
});
