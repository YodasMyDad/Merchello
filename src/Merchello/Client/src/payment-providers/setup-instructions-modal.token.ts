import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface SetupInstructionsModalData {
  /** Provider display name for the headline */
  providerName: string;
  /** Markdown content for the setup instructions */
  instructions: string;
}

export interface SetupInstructionsModalValue {
  // No value returned
}

export const MERCHELLO_SETUP_INSTRUCTIONS_MODAL = new UmbModalToken<
  SetupInstructionsModalData,
  SetupInstructionsModalValue
>("Merchello.SetupInstructions.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});

