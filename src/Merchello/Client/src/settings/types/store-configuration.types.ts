import type {
  StoreConfigurationAbandonedCheckoutDto,
  StoreConfigurationCheckoutDto,
  StoreConfigurationDto,
  StoreConfigurationEmailDto,
  StoreConfigurationEmailThemeDto,
  StoreConfigurationInvoiceRemindersDto,
  StoreConfigurationOrderTermsDto,
  StoreConfigurationPoliciesDto,
  StoreConfigurationStorePanelDto,
  StoreConfigurationUcpDto,
} from "@api/merchello-api.js";

export type {
  StoreConfigurationDto,
  StoreConfigurationStorePanelDto,
  StoreConfigurationInvoiceRemindersDto,
  StoreConfigurationPoliciesDto,
  StoreConfigurationOrderTermsDto,
  StoreConfigurationCheckoutDto,
  StoreConfigurationAbandonedCheckoutDto,
  StoreConfigurationEmailDto,
  StoreConfigurationEmailThemeDto,
  StoreConfigurationUcpDto,
};

export type SettingsTabKey = "store" | "policies" | "checkout" | "email" | "ucp";

export interface RichTextEditorValue {
  markup: string;
  blocks: unknown;
}
