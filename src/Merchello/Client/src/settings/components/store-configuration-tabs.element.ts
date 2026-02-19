import {
  LitElement,
  css,
  html,
  nothing,
  customElement,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { UmbDataTypeDetailRepository } from "@umbraco-cms/backoffice/data-type";
import type { UmbPropertyDatasetElement, UmbPropertyValueData } from "@umbraco-cms/backoffice/property";
import { UmbPropertyEditorConfigCollection } from "@umbraco-cms/backoffice/property-editor";
import type {
  UmbPropertyEditorConfig,
  UmbPropertyEditorConfigCollection as UmbPropertyEditorConfigCollectionType,
} from "@umbraco-cms/backoffice/property-editor";
import { MerchelloApi } from "@api/merchello-api.js";
import type {
  RichTextEditorValue,
  SettingsTabKey,
  StoreConfigurationDto,
} from "@settings/types/store-configuration.types.js";
import "@umbraco-cms/backoffice/tiptap";
import "@settings/components/ucp-flow-tester.element.js";

type CheckoutColorField = "headerBackgroundColor" | "primaryColor" | "accentColor" | "backgroundColor" | "textColor" | "errorColor";
type EmailThemeColorField = "primaryColor" | "textColor" | "backgroundColor" | "secondaryTextColor" | "contentBackgroundColor";

@customElement("merchello-store-configuration-tabs")
export class MerchelloStoreConfigurationTabsElement extends UmbElementMixin(LitElement) {
  @state()
  private _isLoading = true;

  @state()
  private _isSaving = false;

  @state()
  private _errorMessage: string | null = null;

  @state()
  private _activeTab: SettingsTabKey = "store";

  @state()
  private _configuration: StoreConfigurationDto | null = null;

  @state()
  private _descriptionEditorConfig: UmbPropertyEditorConfigCollectionType | undefined = undefined;

  readonly #dataTypeRepository = new UmbDataTypeDetailRepository(this);
  #notificationContext?: UmbNotificationContext;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void this._loadConfiguration();
  }

  private async _loadConfiguration(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const [configurationResult, editorSettingsResult] = await Promise.all([
      MerchelloApi.getStoreConfiguration(),
      MerchelloApi.getDescriptionEditorSettings(),
    ]);

    if (configurationResult.error || !configurationResult.data) {
      this._errorMessage = configurationResult.error?.message ?? "Failed to load store settings.";
      this._isLoading = false;
      this._setFallbackEditorConfig();
      return;
    }

    this._configuration = configurationResult.data;

    if (editorSettingsResult.data?.dataTypeKey) {
      await this._loadDataTypeConfig(editorSettingsResult.data.dataTypeKey);
    } else {
      this._setFallbackEditorConfig();
    }

    this._isLoading = false;
  }

  private async _loadDataTypeConfig(dataTypeKey: string): Promise<void> {
    try {
      const { error } = await this.#dataTypeRepository.requestByUnique(dataTypeKey);

      if (error) {
        this._setFallbackEditorConfig();
        return;
      }

      this.observe(
        await this.#dataTypeRepository.byUnique(dataTypeKey),
        (dataType) => {
          if (!dataType) {
            this._setFallbackEditorConfig();
            return;
          }

          this._descriptionEditorConfig = new UmbPropertyEditorConfigCollection(dataType.values);
        },
        "_observeSettingsDescriptionDataType",
      );
    } catch {
      this._setFallbackEditorConfig();
    }
  }

  private _setFallbackEditorConfig(): void {
    this._descriptionEditorConfig = new UmbPropertyEditorConfigCollection([
      {
        alias: "toolbar",
        value: [
          [
            ["Umb.Tiptap.Toolbar.Bold", "Umb.Tiptap.Toolbar.Italic", "Umb.Tiptap.Toolbar.Underline"],
            ["Umb.Tiptap.Toolbar.BulletList", "Umb.Tiptap.Toolbar.OrderedList"],
            ["Umb.Tiptap.Toolbar.Link", "Umb.Tiptap.Toolbar.Unlink"],
          ],
        ],
      },
      {
        alias: "extensions",
        value: [
          "Umb.Tiptap.RichTextEssentials",
          "Umb.Tiptap.Bold",
          "Umb.Tiptap.Italic",
          "Umb.Tiptap.Underline",
          "Umb.Tiptap.Link",
          "Umb.Tiptap.BulletList",
          "Umb.Tiptap.OrderedList",
        ],
      },
    ]);
  }

  private async _handleSave(): Promise<void> {
    if (!this._configuration || this._isSaving) {
      return;
    }

    this._isSaving = true;
    const { data, error } = await MerchelloApi.saveStoreConfiguration(this._configuration);
    if (error || !data) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Failed to save settings",
          message: error?.message ?? "An unknown error occurred while saving settings.",
        },
      });
      this._isSaving = false;
      return;
    }

    this._configuration = data;
    this._errorMessage = null;
    this.#notificationContext?.peek("positive", {
      data: {
        headline: "Settings saved",
        message: "Store configuration has been updated.",
      },
    });

    this._isSaving = false;
  }

  private _toPropertyValueMap(values: UmbPropertyValueData[]): Record<string, unknown> {
    const map: Record<string, unknown> = {};
    for (const value of values) {
      map[value.alias] = value.value;
    }
    return map;
  }

  private _getStringFromPropertyValue(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private _getStringOrNullFromPropertyValue(value: unknown): string | null {
    const normalized = this._getStringFromPropertyValue(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private _getNumberFromPropertyValue(value: unknown, fallback: number): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }

  private _getBooleanFromPropertyValue(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
    return fallback;
  }

  private _getNullableBoolFromPropertyValue(value: unknown): boolean | null {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
    return null;
  }

  private _getNullableIntFromPropertyValue(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private _getFirstDropdownValue(value: unknown): string {
    if (Array.isArray(value)) {
      const first = value.find((x) => typeof x === "string");
      return typeof first === "string" ? first : "";
    }
    if (typeof value === "string") return value;
    return "";
  }

  private _getMediaKeysFromPropertyValue(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") return "";
        const mediaEntry = entry as { mediaKey?: unknown; key?: unknown };
        if (typeof mediaEntry.mediaKey === "string" && mediaEntry.mediaKey) return mediaEntry.mediaKey;
        if (typeof mediaEntry.key === "string" && mediaEntry.key) return mediaEntry.key;
        return "";
      })
      .filter(Boolean);
  }

  private _createMediaPickerValue(keys: string[]): Array<{ key: string; mediaKey: string }> {
    return keys.map((key) => ({ key, mediaKey: key }));
  }

  private _getSingleMediaPickerValue(value: unknown): string | null {
    return this._getMediaKeysFromPropertyValue(value)[0] ?? null;
  }

  private _deserializeRichTextPropertyValue(value: string | null | undefined): RichTextEditorValue {
    if (!value) {
      return { markup: "", blocks: null };
    }

    try {
      const parsed = JSON.parse(value) as Partial<RichTextEditorValue>;
      if (typeof parsed.markup === "string" || parsed.blocks !== undefined) {
        return {
          markup: parsed.markup ?? "",
          blocks: parsed.blocks ?? null,
        };
      }
    } catch {
      // Backwards compatibility: treat existing plain HTML as markup.
    }

    return {
      markup: value,
      blocks: null,
    };
  }

  private _serializeRichTextPropertyValue(value: unknown): string | null {
    if (value === null || value === undefined) return null;

    if (typeof value === "string") {
      return JSON.stringify({ markup: value, blocks: null } satisfies RichTextEditorValue);
    }

    if (typeof value === "object") {
      const parsed = value as Partial<RichTextEditorValue>;
      if (typeof parsed.markup === "string" || parsed.blocks !== undefined) {
        return JSON.stringify({
          markup: parsed.markup ?? "",
          blocks: parsed.blocks ?? null,
        } satisfies RichTextEditorValue);
      }
      return JSON.stringify(value);
    }

    return null;
  }

  private _getLogoPositionConfig(): UmbPropertyEditorConfig {
    return [
      {
        alias: "items",
        value: [
          { name: "Left", value: "Left" },
          { name: "Center", value: "Center" },
          { name: "Right", value: "Right" },
        ],
      },
    ];
  }

  private _getColorValueFromEvent(e: Event): string {
    return (e.target as HTMLInputElement).value?.trim() ?? "";
  }

  private _t(key: string, fallback: string): string {
    const localize = (this as { localize?: { termOrDefault?: (termKey: string, defaultValue: string) => string } }).localize;
    if (localize?.termOrDefault) {
      return localize.termOrDefault(key, fallback);
    }

    return fallback;
  }

  private _handleCheckoutColorChange(field: CheckoutColorField, e: Event): void {
    if (!this._configuration) return;
    const value = this._getColorValueFromEvent(e);

    switch (field) {
      case "headerBackgroundColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            headerBackgroundColor: value || null,
          },
        };
        return;
      case "primaryColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            primaryColor: value || this._configuration.checkout.primaryColor,
          },
        };
        return;
      case "accentColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            accentColor: value || this._configuration.checkout.accentColor,
          },
        };
        return;
      case "backgroundColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            backgroundColor: value || this._configuration.checkout.backgroundColor,
          },
        };
        return;
      case "textColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            textColor: value || this._configuration.checkout.textColor,
          },
        };
        return;
      case "errorColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            errorColor: value || this._configuration.checkout.errorColor,
          },
        };
        return;
    }
  }

  private _handleEmailThemeColorChange(field: EmailThemeColorField, e: Event): void {
    if (!this._configuration) return;
    const value = this._getColorValueFromEvent(e);
    if (!value) return;

    switch (field) {
      case "primaryColor":
        this._configuration = {
          ...this._configuration,
          email: {
            ...this._configuration.email,
            theme: {
              ...this._configuration.email.theme,
              primaryColor: value,
            },
          },
        };
        return;
      case "textColor":
        this._configuration = {
          ...this._configuration,
          email: {
            ...this._configuration.email,
            theme: {
              ...this._configuration.email.theme,
              textColor: value,
            },
          },
        };
        return;
      case "backgroundColor":
        this._configuration = {
          ...this._configuration,
          email: {
            ...this._configuration.email,
            theme: {
              ...this._configuration.email.theme,
              backgroundColor: value,
            },
          },
        };
        return;
      case "secondaryTextColor":
        this._configuration = {
          ...this._configuration,
          email: {
            ...this._configuration.email,
            theme: {
              ...this._configuration.email.theme,
              secondaryTextColor: value,
            },
          },
        };
        return;
      case "contentBackgroundColor":
        this._configuration = {
          ...this._configuration,
          email: {
            ...this._configuration.email,
            theme: {
              ...this._configuration.email.theme,
              contentBackgroundColor: value,
            },
          },
        };
        return;
    }
  }

  private _renderColorProperty(label: string, value: string, onChange: (event: Event) => void): unknown {
    return html`
      <umb-property-layout .label=${label}>
        <div slot="editor" class="color-picker-field">
          <uui-color-picker .label=${label} .value=${value} @change=${onChange}></uui-color-picker>
        </div>
      </umb-property-layout>
    `;
  }

  private _getStoreSettingsDatasetValue(): UmbPropertyValueData[] {
    const configuration = this._configuration!;
    return [
      { alias: "invoiceNumberPrefix", value: configuration.store.invoiceNumberPrefix },
      { alias: "name", value: configuration.store.name },
      { alias: "email", value: configuration.store.email ?? "" },
      { alias: "supportEmail", value: configuration.store.supportEmail ?? "" },
      { alias: "phone", value: configuration.store.phone ?? "" },
      {
        alias: "logoMediaKey",
        value: configuration.store.logoMediaKey
          ? this._createMediaPickerValue([configuration.store.logoMediaKey])
          : [],
      },
      { alias: "websiteUrl", value: configuration.store.websiteUrl ?? "" },
      { alias: "address", value: configuration.store.address ?? "" },
      { alias: "displayPricesIncTax", value: configuration.store.displayPricesIncTax },
      { alias: "showStockLevels", value: configuration.store.showStockLevels },
      { alias: "lowStockThreshold", value: configuration.store.lowStockThreshold },
    ];
  }

  private _handleStoreSettingsDatasetChange(e: Event): void {
    if (!this._configuration) return;
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);

    this._configuration = {
      ...this._configuration,
      store: {
        ...this._configuration.store,
        invoiceNumberPrefix: this._getStringFromPropertyValue(values.invoiceNumberPrefix),
        name: this._getStringFromPropertyValue(values.name),
        email: this._getStringOrNullFromPropertyValue(values.email),
        supportEmail: this._getStringOrNullFromPropertyValue(values.supportEmail),
        phone: this._getStringOrNullFromPropertyValue(values.phone),
        logoMediaKey: this._getSingleMediaPickerValue(values.logoMediaKey),
        websiteUrl: this._getStringOrNullFromPropertyValue(values.websiteUrl),
        address: this._getStringFromPropertyValue(values.address),
        displayPricesIncTax: this._getBooleanFromPropertyValue(
          values.displayPricesIncTax,
          this._configuration.store.displayPricesIncTax,
        ),
        showStockLevels: this._getBooleanFromPropertyValue(
          values.showStockLevels,
          this._configuration.store.showStockLevels,
        ),
        lowStockThreshold: this._getNumberFromPropertyValue(
          values.lowStockThreshold,
          this._configuration.store.lowStockThreshold,
        ),
      },
    };
  }

  private _getInvoiceRemindersDatasetValue(): UmbPropertyValueData[] {
    const configuration = this._configuration!;
    return [
      { alias: "reminderDaysBeforeDue", value: configuration.invoiceReminders.reminderDaysBeforeDue },
      { alias: "overdueReminderIntervalDays", value: configuration.invoiceReminders.overdueReminderIntervalDays },
      { alias: "maxOverdueReminders", value: configuration.invoiceReminders.maxOverdueReminders },
      { alias: "checkIntervalHours", value: configuration.invoiceReminders.checkIntervalHours },
    ];
  }

  private _handleInvoiceRemindersDatasetChange(e: Event): void {
    if (!this._configuration) return;
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);

    this._configuration = {
      ...this._configuration,
      invoiceReminders: {
        ...this._configuration.invoiceReminders,
        reminderDaysBeforeDue: this._getNumberFromPropertyValue(
          values.reminderDaysBeforeDue,
          this._configuration.invoiceReminders.reminderDaysBeforeDue,
        ),
        overdueReminderIntervalDays: this._getNumberFromPropertyValue(
          values.overdueReminderIntervalDays,
          this._configuration.invoiceReminders.overdueReminderIntervalDays,
        ),
        maxOverdueReminders: this._getNumberFromPropertyValue(
          values.maxOverdueReminders,
          this._configuration.invoiceReminders.maxOverdueReminders,
        ),
        checkIntervalHours: this._getNumberFromPropertyValue(
          values.checkIntervalHours,
          this._configuration.invoiceReminders.checkIntervalHours,
        ),
      },
    };
  }

  private _getPoliciesDatasetValue(): UmbPropertyValueData[] {
    const configuration = this._configuration!;
    return [
      { alias: "termsContent", value: this._deserializeRichTextPropertyValue(configuration.policies.termsContent) },
      { alias: "privacyContent", value: this._deserializeRichTextPropertyValue(configuration.policies.privacyContent) },
    ];
  }

  private _handlePoliciesDatasetChange(e: Event): void {
    if (!this._configuration) return;
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);

    this._configuration = {
      ...this._configuration,
      policies: {
        ...this._configuration.policies,
        termsContent: this._serializeRichTextPropertyValue(values.termsContent),
        privacyContent: this._serializeRichTextPropertyValue(values.privacyContent),
      },
    };
  }

  private _getCheckoutBrandingDatasetValue(): UmbPropertyValueData[] {
    const configuration = this._configuration!;
    return [
      {
        alias: "headerBackgroundImageMediaKey",
        value: configuration.checkout.headerBackgroundImageMediaKey
          ? this._createMediaPickerValue([configuration.checkout.headerBackgroundImageMediaKey])
          : [],
      },
      { alias: "logoPosition", value: [configuration.checkout.logoPosition] },
      { alias: "logoMaxWidth", value: configuration.checkout.logoMaxWidth },
      { alias: "headingFontFamily", value: configuration.checkout.headingFontFamily },
      { alias: "bodyFontFamily", value: configuration.checkout.bodyFontFamily },
      { alias: "showExpressCheckout", value: configuration.checkout.showExpressCheckout },
      { alias: "billingPhoneRequired", value: configuration.checkout.billingPhoneRequired },
      { alias: "confirmationRedirectUrl", value: configuration.checkout.confirmationRedirectUrl ?? "" },
      { alias: "customScriptUrl", value: configuration.checkout.customScriptUrl ?? "" },
      { alias: "orderTermsShowCheckbox", value: configuration.checkout.orderTerms.showCheckbox },
      { alias: "orderTermsCheckboxText", value: configuration.checkout.orderTerms.checkboxText },
      { alias: "orderTermsCheckboxRequired", value: configuration.checkout.orderTerms.checkboxRequired },
    ];
  }

  private _handleCheckoutBrandingDatasetChange(e: Event): void {
    if (!this._configuration) return;
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);
    const logoPosition = this._getFirstDropdownValue(values.logoPosition) || this._configuration.checkout.logoPosition;

    this._configuration = {
      ...this._configuration,
      checkout: {
        ...this._configuration.checkout,
        headerBackgroundImageMediaKey: this._getSingleMediaPickerValue(values.headerBackgroundImageMediaKey),
        logoPosition,
        logoMaxWidth: this._getNumberFromPropertyValue(values.logoMaxWidth, this._configuration.checkout.logoMaxWidth),
        headingFontFamily:
          this._getStringFromPropertyValue(values.headingFontFamily) || this._configuration.checkout.headingFontFamily,
        bodyFontFamily:
          this._getStringFromPropertyValue(values.bodyFontFamily) || this._configuration.checkout.bodyFontFamily,
        showExpressCheckout: this._getBooleanFromPropertyValue(
          values.showExpressCheckout,
          this._configuration.checkout.showExpressCheckout,
        ),
        billingPhoneRequired: this._getBooleanFromPropertyValue(
          values.billingPhoneRequired,
          this._configuration.checkout.billingPhoneRequired,
        ),
        confirmationRedirectUrl: this._getStringOrNullFromPropertyValue(values.confirmationRedirectUrl),
        customScriptUrl: this._getStringOrNullFromPropertyValue(values.customScriptUrl),
        orderTerms: {
          ...this._configuration.checkout.orderTerms,
          showCheckbox: this._getBooleanFromPropertyValue(
            values.orderTermsShowCheckbox,
            this._configuration.checkout.orderTerms.showCheckbox,
          ),
          checkboxText:
            this._getStringFromPropertyValue(values.orderTermsCheckboxText) ||
            this._configuration.checkout.orderTerms.checkboxText,
          checkboxRequired: this._getBooleanFromPropertyValue(
            values.orderTermsCheckboxRequired,
            this._configuration.checkout.orderTerms.checkboxRequired,
          ),
        },
      },
    };
  }

  private _getAbandonedCheckoutDatasetValue(): UmbPropertyValueData[] {
    const configuration = this._configuration!;
    return [
      { alias: "abandonmentThresholdHours", value: configuration.abandonedCheckout.abandonmentThresholdHours },
      { alias: "recoveryExpiryDays", value: configuration.abandonedCheckout.recoveryExpiryDays },
      { alias: "checkIntervalMinutes", value: configuration.abandonedCheckout.checkIntervalMinutes },
      { alias: "firstEmailDelayHours", value: configuration.abandonedCheckout.firstEmailDelayHours },
      { alias: "reminderEmailDelayHours", value: configuration.abandonedCheckout.reminderEmailDelayHours },
      { alias: "finalEmailDelayHours", value: configuration.abandonedCheckout.finalEmailDelayHours },
      { alias: "maxRecoveryEmails", value: configuration.abandonedCheckout.maxRecoveryEmails },
    ];
  }

  private _handleAbandonedCheckoutDatasetChange(e: Event): void {
    if (!this._configuration) return;
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);

    this._configuration = {
      ...this._configuration,
      abandonedCheckout: {
        ...this._configuration.abandonedCheckout,
        abandonmentThresholdHours: this._getNumberFromPropertyValue(
          values.abandonmentThresholdHours,
          this._configuration.abandonedCheckout.abandonmentThresholdHours,
        ),
        recoveryExpiryDays: this._getNumberFromPropertyValue(
          values.recoveryExpiryDays,
          this._configuration.abandonedCheckout.recoveryExpiryDays,
        ),
        checkIntervalMinutes: this._getNumberFromPropertyValue(
          values.checkIntervalMinutes,
          this._configuration.abandonedCheckout.checkIntervalMinutes,
        ),
        firstEmailDelayHours: this._getNumberFromPropertyValue(
          values.firstEmailDelayHours,
          this._configuration.abandonedCheckout.firstEmailDelayHours,
        ),
        reminderEmailDelayHours: this._getNumberFromPropertyValue(
          values.reminderEmailDelayHours,
          this._configuration.abandonedCheckout.reminderEmailDelayHours,
        ),
        finalEmailDelayHours: this._getNumberFromPropertyValue(
          values.finalEmailDelayHours,
          this._configuration.abandonedCheckout.finalEmailDelayHours,
        ),
        maxRecoveryEmails: this._getNumberFromPropertyValue(
          values.maxRecoveryEmails,
          this._configuration.abandonedCheckout.maxRecoveryEmails,
        ),
      },
    };
  }

  private _getEmailSettingsDatasetValue(): UmbPropertyValueData[] {
    const configuration = this._configuration!;
    return [
      { alias: "defaultFromAddress", value: configuration.email.defaultFromAddress ?? "" },
      { alias: "defaultFromName", value: configuration.email.defaultFromName ?? "" },
      { alias: "themeFontFamily", value: configuration.email.theme.fontFamily },
    ];
  }

  private _handleEmailSettingsDatasetChange(e: Event): void {
    if (!this._configuration) return;
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);

    this._configuration = {
      ...this._configuration,
      email: {
        ...this._configuration.email,
        defaultFromAddress: this._getStringOrNullFromPropertyValue(values.defaultFromAddress),
        defaultFromName: this._getStringOrNullFromPropertyValue(values.defaultFromName),
        theme: {
          ...this._configuration.email.theme,
          fontFamily: this._getStringFromPropertyValue(values.themeFontFamily) || this._configuration.email.theme.fontFamily,
        },
      },
    };
  }

  private _getUcpDatasetValue(): UmbPropertyValueData[] {
    const configuration = this._configuration!;
    const ucp = configuration.ucp;
    return [
      { alias: "termsUrl", value: ucp.termsUrl ?? "" },
      { alias: "privacyUrl", value: ucp.privacyUrl ?? "" },
      { alias: "publicBaseUrl", value: ucp.publicBaseUrl ?? "" },
      { alias: "allowedAgents", value: ucp.allowedAgents?.join("\n") ?? "" },
      { alias: "capabilityCheckout", value: ucp.capabilityCheckout ?? true },
      { alias: "capabilityOrder", value: ucp.capabilityOrder ?? true },
      { alias: "capabilityIdentityLinking", value: ucp.capabilityIdentityLinking ?? false },
      { alias: "extensionDiscount", value: ucp.extensionDiscount ?? true },
      { alias: "extensionFulfillment", value: ucp.extensionFulfillment ?? true },
      { alias: "extensionBuyerConsent", value: ucp.extensionBuyerConsent ?? false },
      { alias: "extensionAp2Mandates", value: ucp.extensionAp2Mandates ?? false },
      { alias: "webhookTimeoutSeconds", value: ucp.webhookTimeoutSeconds ?? "" },
    ];
  }

  private _handleUcpDatasetChange(e: Event): void {
    if (!this._configuration) return;
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);

    const rawAgents = this._getStringOrNullFromPropertyValue(values.allowedAgents);
    const allowedAgents = rawAgents
      ? rawAgents.split(/[\n,]+/).map((s) => s.trim()).filter((s) => s.length > 0)
      : null;

    this._configuration = {
      ...this._configuration,
      ucp: {
        ...this._configuration.ucp,
        termsUrl: this._getStringOrNullFromPropertyValue(values.termsUrl),
        privacyUrl: this._getStringOrNullFromPropertyValue(values.privacyUrl),
        publicBaseUrl: this._getStringOrNullFromPropertyValue(values.publicBaseUrl),
        allowedAgents,
        capabilityCheckout: this._getNullableBoolFromPropertyValue(values.capabilityCheckout),
        capabilityOrder: this._getNullableBoolFromPropertyValue(values.capabilityOrder),
        capabilityIdentityLinking: this._getNullableBoolFromPropertyValue(values.capabilityIdentityLinking),
        extensionDiscount: this._getNullableBoolFromPropertyValue(values.extensionDiscount),
        extensionFulfillment: this._getNullableBoolFromPropertyValue(values.extensionFulfillment),
        extensionBuyerConsent: this._getNullableBoolFromPropertyValue(values.extensionBuyerConsent),
        extensionAp2Mandates: this._getNullableBoolFromPropertyValue(values.extensionAp2Mandates),
        webhookTimeoutSeconds: this._getNullableIntFromPropertyValue(values.webhookTimeoutSeconds),
      },
    };
  }

  private _renderSaveActions(): unknown {
    return html`
      <div class="tab-actions">
        <uui-button
          look="primary"
          color="positive"
          label="Save settings"
          ?disabled=${this._isSaving}
          @click=${this._handleSave}>
          ${this._isSaving ? "Saving..." : "Save settings"}
        </uui-button>
      </div>
    `;
  }

  private _renderStoreTab(): unknown {
    return html`
      <uui-box headline="Store">
        <umb-property-dataset
          .value=${this._getStoreSettingsDatasetValue()}
          @change=${this._handleStoreSettingsDatasetChange}>
          <umb-property
            alias="invoiceNumberPrefix"
            label="Invoice Prefix"
            description="Prefix used when generating invoice numbers."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>

          <umb-property
            alias="name"
            label="Store Name"
            description="Displayed in checkout and customer-facing views."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>

          <umb-property alias="email" label="Store Email" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="supportEmail" label="Support Email" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="phone" label="Phone" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>

          <umb-property
            alias="logoMediaKey"
            label="Logo"
            description="Media item used as the store logo."
            property-editor-ui-alias="Umb.PropertyEditorUi.MediaPicker"
            .config=${[{ alias: "multiple", value: false }]}>
          </umb-property>

          <umb-property alias="websiteUrl" label="Website URL" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="address" label="Address" property-editor-ui-alias="Umb.PropertyEditorUi.TextArea"></umb-property>

          <umb-property alias="displayPricesIncTax" label="Display Prices Inc Tax" property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="showStockLevels" label="Show Stock Levels" property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property
            alias="lowStockThreshold"
            label="Low Stock Threshold"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
        </umb-property-dataset>
      </uui-box>

      <uui-box headline="Invoice Reminders">
        <umb-property-dataset
          .value=${this._getInvoiceRemindersDatasetValue()}
          @change=${this._handleInvoiceRemindersDatasetChange}>
          <umb-property
            alias="reminderDaysBeforeDue"
            label="Reminder Days Before Due"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="overdueReminderIntervalDays"
            label="Overdue Reminder Interval Days"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 1 }]}>
          </umb-property>
          <umb-property
            alias="maxOverdueReminders"
            label="Max Overdue Reminders"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="checkIntervalHours"
            label="Check Interval Hours"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 1 }]}>
          </umb-property>
        </umb-property-dataset>
      </uui-box>

      ${this._renderSaveActions()}
    `;
  }

  private _renderPoliciesTab(): unknown {
    return html`
      <uui-box headline="Policies">
        <umb-property-dataset
          .value=${this._getPoliciesDatasetValue()}
          @change=${this._handlePoliciesDatasetChange}>
          <umb-property
            alias="termsContent"
            label="Terms Content"
            description="Rich content rendered for checkout Terms."
            property-editor-ui-alias="Umb.PropertyEditorUi.Tiptap"
            .config=${this._descriptionEditorConfig}>
          </umb-property>
          <umb-property
            alias="privacyContent"
            label="Privacy Content"
            description="Rich content rendered for checkout Privacy policy."
            property-editor-ui-alias="Umb.PropertyEditorUi.Tiptap"
            .config=${this._descriptionEditorConfig}>
          </umb-property>
        </umb-property-dataset>
      </uui-box>
      ${this._renderSaveActions()}
    `;
  }

  private _renderCheckoutTab(): unknown {
    const configuration = this._configuration!;

    return html`
      <uui-box headline="Checkout">
        <umb-property-dataset
          .value=${this._getCheckoutBrandingDatasetValue()}
          @change=${this._handleCheckoutBrandingDatasetChange}>
          <umb-property
            alias="headerBackgroundImageMediaKey"
            label="Header Background Image"
            property-editor-ui-alias="Umb.PropertyEditorUi.MediaPicker"
            .config=${[{ alias: "multiple", value: false }]}>
          </umb-property>
          ${this._renderColorProperty(
            "Header Background Color",
            configuration.checkout.headerBackgroundColor ?? "",
            (e: Event) => this._handleCheckoutColorChange("headerBackgroundColor", e),
          )}
          <umb-property
            alias="logoPosition"
            label="Logo Position"
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getLogoPositionConfig()}>
          </umb-property>
          <umb-property alias="logoMaxWidth" label="Logo Max Width" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
          ${this._renderColorProperty("Primary Color", configuration.checkout.primaryColor, (e: Event) =>
            this._handleCheckoutColorChange("primaryColor", e),
          )}
          ${this._renderColorProperty("Accent Color", configuration.checkout.accentColor, (e: Event) =>
            this._handleCheckoutColorChange("accentColor", e),
          )}
          ${this._renderColorProperty("Background Color", configuration.checkout.backgroundColor, (e: Event) =>
            this._handleCheckoutColorChange("backgroundColor", e),
          )}
          ${this._renderColorProperty("Text Color", configuration.checkout.textColor, (e: Event) =>
            this._handleCheckoutColorChange("textColor", e),
          )}
          ${this._renderColorProperty("Error Color", configuration.checkout.errorColor, (e: Event) =>
            this._handleCheckoutColorChange("errorColor", e),
          )}
          <umb-property alias="headingFontFamily" label="Heading Font Family" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="bodyFontFamily" label="Body Font Family" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="showExpressCheckout" label="Show Express Checkout" property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="billingPhoneRequired" label="Billing Phone Required" property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="confirmationRedirectUrl" label="Confirmation Redirect URL" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="customScriptUrl" label="Custom Script URL" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="orderTermsShowCheckbox" label="Order Terms Checkbox" property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="orderTermsCheckboxText" label="Order Terms Checkbox Text" property-editor-ui-alias="Umb.PropertyEditorUi.TextArea"></umb-property>
          <umb-property alias="orderTermsCheckboxRequired" label="Order Terms Checkbox Required" property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
        </umb-property-dataset>
      </uui-box>

      <uui-box headline="Abandoned Checkout">
        <umb-property-dataset
          .value=${this._getAbandonedCheckoutDatasetValue()}
          @change=${this._handleAbandonedCheckoutDatasetChange}>
          <umb-property
            alias="abandonmentThresholdHours"
            label="Abandonment Threshold Hours"
            property-editor-ui-alias="Umb.PropertyEditorUi.Decimal"
            .config=${[{ alias: "min", value: 0.5 }]}>
          </umb-property>
          <umb-property
            alias="recoveryExpiryDays"
            label="Recovery Expiry Days"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 1 }]}>
          </umb-property>
          <umb-property
            alias="checkIntervalMinutes"
            label="Check Interval Minutes"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 5 }]}>
          </umb-property>
          <umb-property
            alias="firstEmailDelayHours"
            label="First Email Delay Hours"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="reminderEmailDelayHours"
            label="Reminder Email Delay Hours"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="finalEmailDelayHours"
            label="Final Email Delay Hours"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="maxRecoveryEmails"
            label="Max Recovery Emails"
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
        </umb-property-dataset>
      </uui-box>
      ${this._renderSaveActions()}
    `;
  }

  private _renderEmailTab(): unknown {
    const configuration = this._configuration!;

    return html`
      <uui-box headline="Email">
        <umb-property-dataset
          .value=${this._getEmailSettingsDatasetValue()}
          @change=${this._handleEmailSettingsDatasetChange}>
          <umb-property alias="defaultFromAddress" label="Default From Address" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="defaultFromName" label="Default From Name" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          ${this._renderColorProperty("Primary Color", configuration.email.theme.primaryColor, (e: Event) =>
            this._handleEmailThemeColorChange("primaryColor", e),
          )}
          ${this._renderColorProperty("Text Color", configuration.email.theme.textColor, (e: Event) =>
            this._handleEmailThemeColorChange("textColor", e),
          )}
          ${this._renderColorProperty("Background Color", configuration.email.theme.backgroundColor, (e: Event) =>
            this._handleEmailThemeColorChange("backgroundColor", e),
          )}
          <umb-property alias="themeFontFamily" label="Font Family" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          ${this._renderColorProperty("Secondary Text Color", configuration.email.theme.secondaryTextColor, (e: Event) =>
            this._handleEmailThemeColorChange("secondaryTextColor", e),
          )}
          ${this._renderColorProperty("Content Background Color", configuration.email.theme.contentBackgroundColor, (e: Event) =>
            this._handleEmailThemeColorChange("contentBackgroundColor", e),
          )}
        </umb-property-dataset>
      </uui-box>
      ${this._renderSaveActions()}
    `;
  }

  private _renderUcpTab(): unknown {
    return html`
      <umb-property-dataset
        .value=${this._getUcpDatasetValue()}
        @change=${this._handleUcpDatasetChange}>

        <uui-box .headline=${this._t("merchello_settingsUcpHeadline", "UCP")}>
          <umb-property alias="termsUrl" .label=${this._t("merchello_settingsUcpTermsUrl", "Terms URL")} property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="privacyUrl" .label=${this._t("merchello_settingsUcpPrivacyUrl", "Privacy URL")} property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property
            alias="publicBaseUrl"
            label="Public Base URL"
            description="Override the public base URL used in UCP manifest URLs. Leave empty to use the store website URL."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="allowedAgents"
            label="Allowed Agents"
            description="Restrict access to specific agent profile URIs (one per line). Use * to allow all agents. Leave empty to use the appsettings default."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextArea">
          </umb-property>
          <umb-property
            alias="webhookTimeoutSeconds"
            label="Webhook Timeout (seconds)"
            description="Timeout for outbound webhook calls. Leave empty to use the appsettings default."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer">
          </umb-property>
        </uui-box>

        <uui-box headline="Capabilities">
          <umb-property alias="capabilityCheckout" label="Checkout" description="Enable the Checkout capability." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="capabilityOrder" label="Order" description="Enable the Order capability." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="capabilityIdentityLinking" label="Identity Linking" description="Enable the Identity Linking capability." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
        </uui-box>

        <uui-box headline="Extensions">
          <umb-property alias="extensionDiscount" label="Discount" description="Enable the Discount extension." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="extensionFulfillment" label="Fulfillment" description="Enable the Fulfillment extension." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="extensionBuyerConsent" label="Buyer Consent" description="Enable the Buyer Consent extension." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="extensionAp2Mandates" label="AP2 Mandates" description="Enable the AP2 Mandates extension." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
        </uui-box>

      </umb-property-dataset>

      <uui-box .headline=${this._t("merchello_settingsUcpFlowTesterHeadline", "UCP Flow Tester")}>
        <merchello-ucp-flow-tester></merchello-ucp-flow-tester>
      </uui-box>

      ${this._renderSaveActions()}
    `;
  }

  private _renderCurrentTab(): unknown {
    switch (this._activeTab) {
      case "store":
        return this._renderStoreTab();
      case "policies":
        return this._renderPoliciesTab();
      case "checkout":
        return this._renderCheckoutTab();
      case "email":
        return this._renderEmailTab();
      case "ucp":
        return this._renderUcpTab();
      default:
        return nothing;
    }
  }

  private _renderErrorBanner(): unknown {
    if (!this._errorMessage) {
      return nothing;
    }

    return html`
      <uui-box class="error-box">
        <div class="error-message">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
        </div>
      </uui-box>
    `;
  }

  override render() {
    if (this._isLoading) {
      return html`
        <div class="loading">
          <uui-loader></uui-loader>
        </div>
      `;
    }

    if (!this._configuration) {
      return html`
        ${this._renderErrorBanner()}
        <div class="tab-actions">
          <uui-button label="Retry" look="secondary" @click=${this._loadConfiguration}>Retry</uui-button>
        </div>
      `;
    }

    return html`
      ${this._renderErrorBanner()}

      <uui-tab-group class="tabs">
        <uui-tab label="Store" ?active=${this._activeTab === "store"} @click=${() => (this._activeTab = "store")}>Store</uui-tab>
        <uui-tab label="Policies" ?active=${this._activeTab === "policies"} @click=${() => (this._activeTab = "policies")}>Policies</uui-tab>
        <uui-tab label="Checkout" ?active=${this._activeTab === "checkout"} @click=${() => (this._activeTab = "checkout")}>Checkout</uui-tab>
        <uui-tab label="Email" ?active=${this._activeTab === "email"} @click=${() => (this._activeTab = "email")}>Email</uui-tab>
        <uui-tab .label=${this._t("merchello_settingsUcpTab", "UCP")} ?active=${this._activeTab === "ucp"} @click=${() => (this._activeTab = "ucp")}>
          ${this._t("merchello_settingsUcpTab", "UCP")}
        </uui-tab>
      </uui-tab-group>

      <div class="tab-content">
        ${this._renderCurrentTab()}
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .tabs {
      margin-top: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-4);
    }

    .tab-content {
      display: grid;
      gap: var(--uui-size-space-4);
      padding-bottom: var(--uui-size-space-4);
    }

    .tab-content > umb-property-dataset {
      display: grid;
      gap: var(--uui-size-space-4);
    }

    .tab-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-3);
    }

    .color-picker-field {
      width: 100%;
      display: flex;
      align-items: center;
      min-height: 2.5rem;
    }

    .color-picker-field uui-color-picker {
      --uui-color-picker-width: 280px;
      width: 280px;
      max-width: 100%;
      flex: 0 0 auto;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-8);
    }

    .error-box {
      border: 1px solid var(--uui-color-danger-standalone);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      min-height: 2rem;
    }
  `;
}

export default MerchelloStoreConfigurationTabsElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-store-configuration-tabs": MerchelloStoreConfigurationTabsElement;
  }
}
