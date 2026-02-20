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
    window.addEventListener("merchello:trigger-settings-save", this.#onExternalSave);
    void this._loadConfiguration();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("merchello:trigger-settings-save", this.#onExternalSave);
  }

  #onExternalSave = (): void => {
    void this._handleSave();
  };

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
    this.#dispatchSaveState();

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
    this.#dispatchSaveState();
    const { data, error } = await MerchelloApi.saveStoreConfiguration(this._configuration);
    if (error || !data) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Failed to save settings",
          message: error?.message ?? "An unknown error occurred while saving settings.",
        },
      });
      this._isSaving = false;
      this.#dispatchSaveState();
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
    this.#dispatchSaveState();
  }

  #dispatchSaveState(): void {
    window.dispatchEvent(
      new CustomEvent("merchello:settings-save-state", {
        detail: { isSaving: this._isSaving, canSave: !!this._configuration },
      }),
    );
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

  private _getFontFamilyConfig(): UmbPropertyEditorConfig {
    return [
      {
        alias: "items",
        value: [
          { name: "System Default", value: "system-ui" },
          { name: "Arial", value: "Arial, 'Helvetica Neue', Helvetica, sans-serif" },
          { name: "Georgia", value: "Georgia, 'Times New Roman', Times, serif" },
          { name: "Helvetica", value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
          { name: "Palatino", value: "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif" },
          { name: "Segoe UI", value: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" },
          { name: "Times New Roman", value: "'Times New Roman', Times, Georgia, serif" },
          { name: "Trebuchet MS", value: "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans', sans-serif" },
          { name: "Verdana", value: "Verdana, Geneva, Tahoma, sans-serif" },
        ],
      },
    ];
  }

  private _getEmailFontFamilyConfig(): UmbPropertyEditorConfig {
    return [
      {
        alias: "items",
        value: [
          { name: "Helvetica Neue", value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
          { name: "Arial", value: "Arial, Helvetica, sans-serif" },
          { name: "Georgia", value: "Georgia, 'Times New Roman', Times, serif" },
          { name: "Verdana", value: "Verdana, Geneva, sans-serif" },
          { name: "Trebuchet MS", value: "'Trebuchet MS', Helvetica, sans-serif" },
          { name: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
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

  private _renderColorProperty(label: string, value: string, onChange: (event: Event) => void, description?: string): unknown {
    return html`
      <umb-property-layout .label=${label} .description=${description ?? ""}>
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

          <umb-property
            alias="email"
            label="Store Email"
            description="Primary contact email used for store communications and support contact links."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="phone"
            label="Phone"
            description="Store contact number shown in customer-facing checkout and email footer areas."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>

          <umb-property
            alias="logoMediaKey"
            label="Logo"
            description="Media item used as the store logo."
            property-editor-ui-alias="Umb.PropertyEditorUi.MediaPicker"
            .config=${[{ alias: "multiple", value: false }]}>
          </umb-property>

          <umb-property
            alias="websiteUrl"
            label="Website URL"
            description="Public storefront base URL. Leave blank to automatically use the current store URL from the active request."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="address"
            label="Address"
            description="Store address shown in email footers and customer statement PDFs."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextArea">
          </umb-property>

          <umb-property
            alias="displayPricesIncTax"
            label="Display Prices Inc Tax"
            description="Controls whether storefront prices are shown including tax by default."
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>
          <umb-property
            alias="showStockLevels"
            label="Show Stock Levels"
            description="Shows available stock quantities on product-facing views when enabled."
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>
          <umb-property
            alias="lowStockThreshold"
            label="Low Stock Threshold"
            description="Inventory count at or below this value is considered low stock."
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
            description="How many days before an invoice due date to send the first reminder."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="overdueReminderIntervalDays"
            label="Overdue Reminder Interval Days"
            description="Number of days between overdue reminder emails."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 1 }]}>
          </umb-property>
          <umb-property
            alias="maxOverdueReminders"
            label="Max Overdue Reminders"
            description="Maximum number of overdue reminders to send per invoice."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="checkIntervalHours"
            label="Check Interval Hours"
            description="How often the reminder job checks for invoices that need reminder emails."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 1 }]}>
          </umb-property>
        </umb-property-dataset>
      </uui-box>

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
            description="Background image displayed behind the checkout header area."
            property-editor-ui-alias="Umb.PropertyEditorUi.MediaPicker"
            .config=${[{ alias: "multiple", value: false }]}>
          </umb-property>
          ${this._renderColorProperty(
            "Header Background Color",
            configuration.checkout.headerBackgroundColor ?? "",
            (e: Event) => this._handleCheckoutColorChange("headerBackgroundColor", e),
            "Background color for the checkout header. Used when no image is set.",
          )}
          <umb-property
            alias="logoPosition"
            label="Logo Position"
            description="Horizontal alignment of the store logo in the checkout header."
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getLogoPositionConfig()}>
          </umb-property>
          <umb-property
            alias="logoMaxWidth"
            label="Logo Max Width"
            description="Maximum width in pixels for the store logo image."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer">
          </umb-property>
          ${this._renderColorProperty(
            "Primary Color",
            configuration.checkout.primaryColor,
            (e: Event) => this._handleCheckoutColorChange("primaryColor", e),
            "Main brand color used for buttons and primary interactive elements.",
          )}
          ${this._renderColorProperty(
            "Accent Color",
            configuration.checkout.accentColor,
            (e: Event) => this._handleCheckoutColorChange("accentColor", e),
            "Secondary color used for links, focus states, and highlighted elements.",
          )}
          ${this._renderColorProperty(
            "Background Color",
            configuration.checkout.backgroundColor,
            (e: Event) => this._handleCheckoutColorChange("backgroundColor", e),
            "Page background color for the checkout.",
          )}
          ${this._renderColorProperty(
            "Text Color",
            configuration.checkout.textColor,
            (e: Event) => this._handleCheckoutColorChange("textColor", e),
            "Default text color used throughout the checkout.",
          )}
          ${this._renderColorProperty(
            "Error Color",
            configuration.checkout.errorColor,
            (e: Event) => this._handleCheckoutColorChange("errorColor", e),
            "Color used for error messages and validation feedback.",
          )}
          <umb-property
            alias="headingFontFamily"
            label="Heading Font Family"
            description="Font used for headings, section titles, and the store name."
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getFontFamilyConfig()}>
          </umb-property>
          <umb-property
            alias="bodyFontFamily"
            label="Body Font Family"
            description="Font used for body text, form labels, and all other checkout text."
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getFontFamilyConfig()}>
          </umb-property>
          <umb-property
            alias="showExpressCheckout"
            label="Show Express Checkout"
            description="Display express payment options (e.g. Apple Pay, Google Pay) at the top of checkout when available."
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>
          <umb-property
            alias="billingPhoneRequired"
            label="Billing Phone Required"
            description="Require a phone number in the billing address form."
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>
          <umb-property
            alias="confirmationRedirectUrl"
            label="Confirmation Redirect URL"
            description="Redirect customers to this URL after order confirmation. Leave empty to use the built-in confirmation page."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="customScriptUrl"
            label="Custom Script URL"
            description="URL to a custom JavaScript file loaded on checkout pages. Useful for analytics or tracking scripts."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="orderTermsShowCheckbox"
            label="Order Terms Checkbox"
            description="Show a terms and conditions checkbox before payment."
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>
          <umb-property
            alias="orderTermsCheckboxText"
            label="Order Terms Checkbox Text"
            description="Text next to the terms checkbox. Use {terms:Link Text} and {privacy:Link Text} to insert policy links."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextArea">
          </umb-property>
          <umb-property
            alias="orderTermsCheckboxRequired"
            label="Order Terms Checkbox Required"
            description="Require customers to accept terms before completing payment."
            property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
          </umb-property>
        </umb-property-dataset>
      </uui-box>

      <uui-box headline="Abandoned Checkout">
        <umb-property-dataset
          .value=${this._getAbandonedCheckoutDatasetValue()}
          @change=${this._handleAbandonedCheckoutDatasetChange}>
          <umb-property
            alias="abandonmentThresholdHours"
            label="Abandonment Threshold Hours"
            description="Time after last activity before a checkout is considered abandoned."
            property-editor-ui-alias="Umb.PropertyEditorUi.Decimal"
            .config=${[{ alias: "min", value: 0.5 }]}>
          </umb-property>
          <umb-property
            alias="recoveryExpiryDays"
            label="Recovery Expiry Days"
            description="Days after abandonment before recovery attempts stop."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 1 }]}>
          </umb-property>
          <umb-property
            alias="checkIntervalMinutes"
            label="Check Interval Minutes"
            description="How often the system checks for newly abandoned checkouts."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 5 }]}>
          </umb-property>
          <umb-property
            alias="firstEmailDelayHours"
            label="First Email Delay Hours"
            description="Hours after abandonment before the first recovery email is sent."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="reminderEmailDelayHours"
            label="Reminder Email Delay Hours"
            description="Hours after the first email before a follow-up reminder is sent."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="finalEmailDelayHours"
            label="Final Email Delay Hours"
            description="Hours after the reminder before the final recovery email is sent."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
          <umb-property
            alias="maxRecoveryEmails"
            label="Max Recovery Emails"
            description="Maximum number of recovery emails sent per abandoned checkout."
            property-editor-ui-alias="Umb.PropertyEditorUi.Integer"
            .config=${[{ alias: "min", value: 0 }]}>
          </umb-property>
        </umb-property-dataset>
      </uui-box>
    `;
  }

  private _renderEmailTab(): unknown {
    const configuration = this._configuration!;

    return html`
      <uui-box headline="Email">
        <umb-property-dataset
          .value=${this._getEmailSettingsDatasetValue()}
          @change=${this._handleEmailSettingsDatasetChange}>
          <umb-property
            alias="defaultFromAddress"
            label="Default From Address"
            description="Email address used as the sender for all outgoing store emails."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="defaultFromName"
            label="Default From Name"
            description="Display name shown alongside the from address in customer emails."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          ${this._renderColorProperty(
            "Primary Color",
            configuration.email.theme.primaryColor,
            (e: Event) => this._handleEmailThemeColorChange("primaryColor", e),
            "Brand color used for buttons, links, and key highlights in emails.",
          )}
          ${this._renderColorProperty(
            "Text Color",
            configuration.email.theme.textColor,
            (e: Event) => this._handleEmailThemeColorChange("textColor", e),
            "Default text color used throughout email templates.",
          )}
          ${this._renderColorProperty(
            "Background Color",
            configuration.email.theme.backgroundColor,
            (e: Event) => this._handleEmailThemeColorChange("backgroundColor", e),
            "Outer background color surrounding the email content area.",
          )}
          <umb-property
            alias="themeFontFamily"
            label="Font Family"
            description="Font used for all text in email templates."
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getEmailFontFamilyConfig()}>
          </umb-property>
          ${this._renderColorProperty(
            "Secondary Text Color",
            configuration.email.theme.secondaryTextColor,
            (e: Event) => this._handleEmailThemeColorChange("secondaryTextColor", e),
            "Color used for supporting text such as footers and captions.",
          )}
          ${this._renderColorProperty(
            "Content Background Color",
            configuration.email.theme.contentBackgroundColor,
            (e: Event) => this._handleEmailThemeColorChange("contentBackgroundColor", e),
            "Background color of the main content area within emails.",
          )}
        </umb-property-dataset>
      </uui-box>
    `;
  }

  private _renderUcpTab(): unknown {
    return html`
      <umb-property-dataset
        .value=${this._getUcpDatasetValue()}
        @change=${this._handleUcpDatasetChange}>

        <uui-box .headline=${this._t("merchello_settingsUcpHeadline", "UCP")}>
          <umb-property
            alias="termsUrl"
            .label=${this._t("merchello_settingsUcpTermsUrl", "Terms URL")}
            description="URL to the store terms of service. Included as a legal link in UCP session responses."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="privacyUrl"
            .label=${this._t("merchello_settingsUcpPrivacyUrl", "Privacy URL")}
            description="URL to the store privacy policy. Included as a legal link in UCP session responses."
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
          </umb-property>
          <umb-property
            alias="publicBaseUrl"
            label="Public Base URL"
            description="Override the public base URL used in UCP manifest URLs and strict mode. Leave empty to use the store website URL."
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
          <umb-property alias="capabilityCheckout" label="Checkout" description="Allow agents to create and manage checkout sessions." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="capabilityOrder" label="Order" description="Allow agents to retrieve order details and status after checkout." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="capabilityIdentityLinking" label="Identity Linking" description="Allow agents to link external buyer identities to customer accounts." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
        </uui-box>

        <uui-box headline="Extensions">
          <umb-property alias="extensionDiscount" label="Discount" description="Expose discount and promotional code support to agents during checkout." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="extensionFulfillment" label="Fulfillment" description="Expose shipping and fulfillment options to agents during checkout." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="extensionBuyerConsent" label="Buyer Consent" description="Require agents to present terms and privacy consent during checkout." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
          <umb-property alias="extensionAp2Mandates" label="AP2 Mandates" description="Enable AP2 regulatory mandate compliance for applicable transactions." property-editor-ui-alias="Umb.PropertyEditorUi.Toggle"></umb-property>
        </uui-box>

      </umb-property-dataset>

      <uui-box .headline=${this._t("merchello_settingsUcpFlowTesterHeadline", "UCP Flow Tester")}>
        <merchello-ucp-flow-tester></merchello-ucp-flow-tester>
      </uui-box>

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
        <div class="retry-actions">
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

    .retry-actions {
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
