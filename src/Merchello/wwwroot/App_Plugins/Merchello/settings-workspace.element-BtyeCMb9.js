import { LitElement as f, html as o, nothing as g, css as v, state as s, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as k } from "@umbraco-cms/backoffice/element-api";
import { M as m } from "./merchello-api-Fd1MNOAp.js";
import { UMB_NOTIFICATION_CONTEXT as S } from "@umbraco-cms/backoffice/notification";
import { UmbDataTypeDetailRepository as D } from "@umbraco-cms/backoffice/data-type";
import { UmbPropertyEditorConfigCollection as P } from "@umbraco-cms/backoffice/property-editor";
import "@umbraco-cms/backoffice/tiptap";
var F = Object.defineProperty, R = Object.getOwnPropertyDescriptor, y = (e, r, t, a) => {
  for (var i = a > 1 ? void 0 : a ? R(r, t) : r, n = e.length - 1, l; n >= 0; n--)
    (l = e[n]) && (i = (a ? l(r, t, i) : l(i)) || i);
  return a && i && F(r, t, i), i;
};
let c = class extends k(f) {
  constructor() {
    super(...arguments), this._isInstalling = !1, this._isInstallComplete = !1, this._message = "", this._hasError = !1;
  }
  async _installSeedData() {
    if (this._isInstalling || this._isInstallComplete) return;
    this._isInstalling = !0, this._hasError = !1, this._message = "";
    const { data: e, error: r } = await m.installSeedData();
    if (this._isInstalling = !1, r || !e) {
      this._hasError = !0, this._message = r?.message ?? "Seed data installation failed.";
      return;
    }
    this._applyInstallResult(e);
  }
  _applyInstallResult(e) {
    this._hasError = !e.success, this._message = e.message, e.success && (this._isInstallComplete = !0, this.dispatchEvent(
      new CustomEvent("seed-data-installed", { bubbles: !0, composed: !0 })
    ));
  }
  render() {
    return this._isInstallComplete ? this._renderComplete() : this._isInstalling ? this._renderInstalling() : this._renderReady();
  }
  _renderReady() {
    return o`
      <uui-box>
        <div class="header">
          <uui-icon name="icon-wand"></uui-icon>
          <div>
            <h3>Install Sample Data</h3>
            <p>
              Populate your store with sample products, warehouses, customers,
              and invoices to explore Merchello's features.
            </p>
          </div>
        </div>

        ${this._hasError ? o`
              <uui-alert color="danger">${this._message}</uui-alert>
              <div class="actions">
                <uui-button
                  look="primary"
                  label="Retry"
                  @click=${this._installSeedData}
                ></uui-button>
              </div>
            ` : o`
              <uui-alert color="default">
                Installation typically takes about a minute. Please don't
                navigate away during installation.
              </uui-alert>
              <div class="actions">
                <uui-button
                  look="primary"
                  label="Install Sample Data"
                  @click=${this._installSeedData}
                ></uui-button>
              </div>
            `}
      </uui-box>
    `;
  }
  _renderInstalling() {
    return o`
      <uui-box>
        <div class="installing">
          <uui-loader-bar></uui-loader-bar>
          <h3>Installing Sample Data...</h3>
          <p>
            Creating products, warehouses, customers, and invoices. This may
            take up to a minute.
          </p>
        </div>
      </uui-box>
    `;
  }
  _renderComplete() {
    return o`
      <uui-box>
        <div class="complete">
          <uui-icon name="icon-check" class="success-icon"></uui-icon>
          <h3>Sample Data Installed</h3>
          ${this._message ? o`<p>${this._message}</p>` : g}
          <p class="next-steps">
            Explore your store by navigating to
            <strong>Products</strong>, <strong>Orders</strong>, or
            <strong>Customers</strong> in the sidebar.
          </p>
        </div>
      </uui-box>
    `;
  }
};
c.styles = v`
    :host {
      display: block;
    }

    h3 {
      margin: 0 0 var(--uui-size-space-2);
      color: var(--uui-color-text);
    }

    p {
      margin: 0;
      color: var(--uui-color-text-alt);
      line-height: 1.5;
    }

    .header {
      display: flex;
      gap: var(--uui-size-space-5);
      align-items: flex-start;
      margin-bottom: var(--uui-size-space-4);
    }

    .header > uui-icon {
      font-size: 2rem;
      color: var(--uui-color-interactive);
      flex-shrink: 0;
      margin-top: var(--uui-size-space-1);
    }

    .actions {
      margin-top: var(--uui-size-space-5);
    }

    uui-alert {
      margin-top: var(--uui-size-space-4);
    }

    .installing {
      text-align: center;
      padding: var(--uui-size-layout-2) var(--uui-size-layout-1);
    }

    .installing uui-loader-bar {
      margin-bottom: var(--uui-size-space-5);
    }

    .complete {
      text-align: center;
      padding: var(--uui-size-layout-2) var(--uui-size-layout-1);
    }

    .success-icon {
      font-size: 2.5rem;
      color: var(--uui-color-positive);
      margin-bottom: var(--uui-size-space-4);
    }

    .next-steps {
      margin-top: var(--uui-size-space-4);
      font-size: 0.875rem;
    }
  `;
y([
  s()
], c.prototype, "_isInstalling", 2);
y([
  s()
], c.prototype, "_isInstallComplete", 2);
y([
  s()
], c.prototype, "_message", 2);
y([
  s()
], c.prototype, "_hasError", 2);
c = y([
  C("merchello-seed-data-workspace")
], c);
var w = Object.defineProperty, V = Object.getOwnPropertyDescriptor, E = (e) => {
  throw TypeError(e);
}, p = (e, r, t, a) => {
  for (var i = a > 1 ? void 0 : a ? V(r, t) : r, n = e.length - 1, l; n >= 0; n--)
    (l = e[n]) && (i = (a ? l(r, t, i) : l(i)) || i);
  return a && i && w(r, t, i), i;
}, U = (e, r, t) => r.has(e) || E("Cannot " + t), b = (e, r, t) => (U(e, r, "read from private field"), t ? t.call(e) : r.get(e)), T = (e, r, t) => r.has(e) ? E("Cannot add the same private member more than once") : r instanceof WeakSet ? r.add(e) : r.set(e, t), I = (e, r, t, a) => (U(e, r, "write to private field"), r.set(e, t), t), _, h;
let u = class extends k(f) {
  constructor() {
    super(), this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._activeTab = "store", this._configuration = null, this._descriptionEditorConfig = void 0, T(this, _, new D(this)), T(this, h), this.consumeContext(S, (e) => {
      I(this, h, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadConfiguration();
  }
  async _loadConfiguration() {
    this._isLoading = !0, this._errorMessage = null;
    const [e, r] = await Promise.all([
      m.getStoreConfiguration(),
      m.getDescriptionEditorSettings()
    ]);
    if (e.error || !e.data) {
      this._errorMessage = e.error?.message ?? "Failed to load store settings.", this._isLoading = !1, this._setFallbackEditorConfig();
      return;
    }
    this._configuration = e.data, r.data?.dataTypeKey ? await this._loadDataTypeConfig(r.data.dataTypeKey) : this._setFallbackEditorConfig(), this._isLoading = !1;
  }
  async _loadDataTypeConfig(e) {
    try {
      const { error: r } = await b(this, _).requestByUnique(e);
      if (r) {
        this._setFallbackEditorConfig();
        return;
      }
      this.observe(
        await b(this, _).byUnique(e),
        (t) => {
          if (!t) {
            this._setFallbackEditorConfig();
            return;
          }
          this._descriptionEditorConfig = new P(t.values);
        },
        "_observeSettingsDescriptionDataType"
      );
    } catch {
      this._setFallbackEditorConfig();
    }
  }
  _setFallbackEditorConfig() {
    this._descriptionEditorConfig = new P([
      {
        alias: "toolbar",
        value: [
          [
            ["Umb.Tiptap.Toolbar.Bold", "Umb.Tiptap.Toolbar.Italic", "Umb.Tiptap.Toolbar.Underline"],
            ["Umb.Tiptap.Toolbar.BulletList", "Umb.Tiptap.Toolbar.OrderedList"],
            ["Umb.Tiptap.Toolbar.Link", "Umb.Tiptap.Toolbar.Unlink"]
          ]
        ]
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
          "Umb.Tiptap.OrderedList"
        ]
      }
    ]);
  }
  async _handleSave() {
    if (!this._configuration || this._isSaving)
      return;
    this._isSaving = !0;
    const { data: e, error: r } = await m.saveStoreConfiguration(this._configuration);
    if (r || !e) {
      b(this, h)?.peek("danger", {
        data: {
          headline: "Failed to save settings",
          message: r?.message ?? "An unknown error occurred while saving settings."
        }
      }), this._isSaving = !1;
      return;
    }
    this._configuration = e, this._errorMessage = null, b(this, h)?.peek("positive", {
      data: {
        headline: "Settings saved",
        message: "Store configuration has been updated."
      }
    }), this._isSaving = !1;
  }
  _toPropertyValueMap(e) {
    const r = {};
    for (const t of e)
      r[t.alias] = t.value;
    return r;
  }
  _getStringFromPropertyValue(e) {
    return typeof e == "string" ? e : "";
  }
  _getStringOrNullFromPropertyValue(e) {
    const r = this._getStringFromPropertyValue(e).trim();
    return r.length > 0 ? r : null;
  }
  _getNumberFromPropertyValue(e, r) {
    if (typeof e == "number" && Number.isFinite(e)) return e;
    if (typeof e == "string") {
      const t = Number(e);
      return Number.isFinite(t) ? t : r;
    }
    return r;
  }
  _getBooleanFromPropertyValue(e, r) {
    if (typeof e == "boolean") return e;
    if (typeof e == "string") {
      if (e.toLowerCase() === "true") return !0;
      if (e.toLowerCase() === "false") return !1;
    }
    return r;
  }
  _getFirstDropdownValue(e) {
    if (Array.isArray(e)) {
      const r = e.find((t) => typeof t == "string");
      return typeof r == "string" ? r : "";
    }
    return typeof e == "string" ? e : "";
  }
  _getMediaKeysFromPropertyValue(e) {
    return Array.isArray(e) ? e.map((r) => {
      if (!r || typeof r != "object") return "";
      const t = r;
      return typeof t.mediaKey == "string" && t.mediaKey ? t.mediaKey : typeof t.key == "string" && t.key ? t.key : "";
    }).filter(Boolean) : [];
  }
  _createMediaPickerValue(e) {
    return e.map((r) => ({ key: r, mediaKey: r }));
  }
  _getSingleMediaPickerValue(e) {
    return this._getMediaKeysFromPropertyValue(e)[0] ?? null;
  }
  _deserializeRichTextPropertyValue(e) {
    if (!e)
      return { markup: "", blocks: null };
    try {
      const r = JSON.parse(e);
      if (typeof r.markup == "string" || r.blocks !== void 0)
        return {
          markup: r.markup ?? "",
          blocks: r.blocks ?? null
        };
    } catch {
    }
    return {
      markup: e,
      blocks: null
    };
  }
  _serializeRichTextPropertyValue(e) {
    if (e == null) return null;
    if (typeof e == "string")
      return JSON.stringify({ markup: e, blocks: null });
    if (typeof e == "object") {
      const r = e;
      return typeof r.markup == "string" || r.blocks !== void 0 ? JSON.stringify({
        markup: r.markup ?? "",
        blocks: r.blocks ?? null
      }) : JSON.stringify(e);
    }
    return null;
  }
  _getLogoPositionConfig() {
    return [
      {
        alias: "items",
        value: [
          { name: "Left", value: "Left" },
          { name: "Center", value: "Center" },
          { name: "Right", value: "Right" }
        ]
      }
    ];
  }
  _getColorValueFromEvent(e) {
    return e.target.value?.trim() ?? "";
  }
  _handleCheckoutColorChange(e, r) {
    if (!this._configuration) return;
    const t = this._getColorValueFromEvent(r);
    switch (e) {
      case "headerBackgroundColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            headerBackgroundColor: t || null
          }
        };
        return;
      case "primaryColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            primaryColor: t || this._configuration.checkout.primaryColor
          }
        };
        return;
      case "accentColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            accentColor: t || this._configuration.checkout.accentColor
          }
        };
        return;
      case "backgroundColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            backgroundColor: t || this._configuration.checkout.backgroundColor
          }
        };
        return;
      case "textColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            textColor: t || this._configuration.checkout.textColor
          }
        };
        return;
      case "errorColor":
        this._configuration = {
          ...this._configuration,
          checkout: {
            ...this._configuration.checkout,
            errorColor: t || this._configuration.checkout.errorColor
          }
        };
        return;
    }
  }
  _handleEmailThemeColorChange(e, r) {
    if (!this._configuration) return;
    const t = this._getColorValueFromEvent(r);
    if (t)
      switch (e) {
        case "primaryColor":
          this._configuration = {
            ...this._configuration,
            email: {
              ...this._configuration.email,
              theme: {
                ...this._configuration.email.theme,
                primaryColor: t
              }
            }
          };
          return;
        case "textColor":
          this._configuration = {
            ...this._configuration,
            email: {
              ...this._configuration.email,
              theme: {
                ...this._configuration.email.theme,
                textColor: t
              }
            }
          };
          return;
        case "backgroundColor":
          this._configuration = {
            ...this._configuration,
            email: {
              ...this._configuration.email,
              theme: {
                ...this._configuration.email.theme,
                backgroundColor: t
              }
            }
          };
          return;
        case "secondaryTextColor":
          this._configuration = {
            ...this._configuration,
            email: {
              ...this._configuration.email,
              theme: {
                ...this._configuration.email.theme,
                secondaryTextColor: t
              }
            }
          };
          return;
        case "contentBackgroundColor":
          this._configuration = {
            ...this._configuration,
            email: {
              ...this._configuration.email,
              theme: {
                ...this._configuration.email.theme,
                contentBackgroundColor: t
              }
            }
          };
          return;
      }
  }
  _renderColorProperty(e, r, t) {
    return o`
      <umb-property-layout .label=${e}>
        <div slot="editor" class="color-picker-field">
          <uui-color-picker .label=${e} .value=${r} @change=${t}></uui-color-picker>
        </div>
      </umb-property-layout>
    `;
  }
  _getStoreSettingsDatasetValue() {
    const e = this._configuration;
    return [
      { alias: "invoiceNumberPrefix", value: e.store.invoiceNumberPrefix },
      { alias: "name", value: e.store.name },
      { alias: "email", value: e.store.email ?? "" },
      { alias: "supportEmail", value: e.store.supportEmail ?? "" },
      { alias: "phone", value: e.store.phone ?? "" },
      {
        alias: "logoMediaKey",
        value: e.store.logoMediaKey ? this._createMediaPickerValue([e.store.logoMediaKey]) : []
      },
      { alias: "websiteUrl", value: e.store.websiteUrl ?? "" },
      { alias: "address", value: e.store.address ?? "" },
      { alias: "displayPricesIncTax", value: e.store.displayPricesIncTax },
      { alias: "showStockLevels", value: e.store.showStockLevels },
      { alias: "lowStockThreshold", value: e.store.lowStockThreshold }
    ];
  }
  _handleStoreSettingsDatasetChange(e) {
    if (!this._configuration) return;
    const r = e.target, t = this._toPropertyValueMap(r.value ?? []);
    this._configuration = {
      ...this._configuration,
      store: {
        ...this._configuration.store,
        invoiceNumberPrefix: this._getStringFromPropertyValue(t.invoiceNumberPrefix),
        name: this._getStringFromPropertyValue(t.name),
        email: this._getStringOrNullFromPropertyValue(t.email),
        supportEmail: this._getStringOrNullFromPropertyValue(t.supportEmail),
        phone: this._getStringOrNullFromPropertyValue(t.phone),
        logoMediaKey: this._getSingleMediaPickerValue(t.logoMediaKey),
        websiteUrl: this._getStringOrNullFromPropertyValue(t.websiteUrl),
        address: this._getStringFromPropertyValue(t.address),
        displayPricesIncTax: this._getBooleanFromPropertyValue(
          t.displayPricesIncTax,
          this._configuration.store.displayPricesIncTax
        ),
        showStockLevels: this._getBooleanFromPropertyValue(
          t.showStockLevels,
          this._configuration.store.showStockLevels
        ),
        lowStockThreshold: this._getNumberFromPropertyValue(
          t.lowStockThreshold,
          this._configuration.store.lowStockThreshold
        )
      }
    };
  }
  _getInvoiceRemindersDatasetValue() {
    const e = this._configuration;
    return [
      { alias: "reminderDaysBeforeDue", value: e.invoiceReminders.reminderDaysBeforeDue },
      { alias: "overdueReminderIntervalDays", value: e.invoiceReminders.overdueReminderIntervalDays },
      { alias: "maxOverdueReminders", value: e.invoiceReminders.maxOverdueReminders },
      { alias: "checkIntervalHours", value: e.invoiceReminders.checkIntervalHours }
    ];
  }
  _handleInvoiceRemindersDatasetChange(e) {
    if (!this._configuration) return;
    const r = e.target, t = this._toPropertyValueMap(r.value ?? []);
    this._configuration = {
      ...this._configuration,
      invoiceReminders: {
        ...this._configuration.invoiceReminders,
        reminderDaysBeforeDue: this._getNumberFromPropertyValue(
          t.reminderDaysBeforeDue,
          this._configuration.invoiceReminders.reminderDaysBeforeDue
        ),
        overdueReminderIntervalDays: this._getNumberFromPropertyValue(
          t.overdueReminderIntervalDays,
          this._configuration.invoiceReminders.overdueReminderIntervalDays
        ),
        maxOverdueReminders: this._getNumberFromPropertyValue(
          t.maxOverdueReminders,
          this._configuration.invoiceReminders.maxOverdueReminders
        ),
        checkIntervalHours: this._getNumberFromPropertyValue(
          t.checkIntervalHours,
          this._configuration.invoiceReminders.checkIntervalHours
        )
      }
    };
  }
  _getPoliciesDatasetValue() {
    const e = this._configuration;
    return [
      { alias: "termsContent", value: this._deserializeRichTextPropertyValue(e.policies.termsContent) },
      { alias: "privacyContent", value: this._deserializeRichTextPropertyValue(e.policies.privacyContent) }
    ];
  }
  _handlePoliciesDatasetChange(e) {
    if (!this._configuration) return;
    const r = e.target, t = this._toPropertyValueMap(r.value ?? []);
    this._configuration = {
      ...this._configuration,
      policies: {
        ...this._configuration.policies,
        termsContent: this._serializeRichTextPropertyValue(t.termsContent),
        privacyContent: this._serializeRichTextPropertyValue(t.privacyContent)
      }
    };
  }
  _getCheckoutBrandingDatasetValue() {
    const e = this._configuration;
    return [
      {
        alias: "headerBackgroundImageMediaKey",
        value: e.checkout.headerBackgroundImageMediaKey ? this._createMediaPickerValue([e.checkout.headerBackgroundImageMediaKey]) : []
      },
      { alias: "logoPosition", value: [e.checkout.logoPosition] },
      { alias: "logoMaxWidth", value: e.checkout.logoMaxWidth },
      { alias: "headingFontFamily", value: e.checkout.headingFontFamily },
      { alias: "bodyFontFamily", value: e.checkout.bodyFontFamily },
      { alias: "showExpressCheckout", value: e.checkout.showExpressCheckout },
      { alias: "billingPhoneRequired", value: e.checkout.billingPhoneRequired },
      { alias: "confirmationRedirectUrl", value: e.checkout.confirmationRedirectUrl ?? "" },
      { alias: "customScriptUrl", value: e.checkout.customScriptUrl ?? "" },
      { alias: "orderTermsShowCheckbox", value: e.checkout.orderTerms.showCheckbox },
      { alias: "orderTermsCheckboxText", value: e.checkout.orderTerms.checkboxText },
      { alias: "orderTermsCheckboxRequired", value: e.checkout.orderTerms.checkboxRequired }
    ];
  }
  _handleCheckoutBrandingDatasetChange(e) {
    if (!this._configuration) return;
    const r = e.target, t = this._toPropertyValueMap(r.value ?? []), a = this._getFirstDropdownValue(t.logoPosition) || this._configuration.checkout.logoPosition;
    this._configuration = {
      ...this._configuration,
      checkout: {
        ...this._configuration.checkout,
        headerBackgroundImageMediaKey: this._getSingleMediaPickerValue(t.headerBackgroundImageMediaKey),
        logoPosition: a,
        logoMaxWidth: this._getNumberFromPropertyValue(t.logoMaxWidth, this._configuration.checkout.logoMaxWidth),
        headingFontFamily: this._getStringFromPropertyValue(t.headingFontFamily) || this._configuration.checkout.headingFontFamily,
        bodyFontFamily: this._getStringFromPropertyValue(t.bodyFontFamily) || this._configuration.checkout.bodyFontFamily,
        showExpressCheckout: this._getBooleanFromPropertyValue(
          t.showExpressCheckout,
          this._configuration.checkout.showExpressCheckout
        ),
        billingPhoneRequired: this._getBooleanFromPropertyValue(
          t.billingPhoneRequired,
          this._configuration.checkout.billingPhoneRequired
        ),
        confirmationRedirectUrl: this._getStringOrNullFromPropertyValue(t.confirmationRedirectUrl),
        customScriptUrl: this._getStringOrNullFromPropertyValue(t.customScriptUrl),
        orderTerms: {
          ...this._configuration.checkout.orderTerms,
          showCheckbox: this._getBooleanFromPropertyValue(
            t.orderTermsShowCheckbox,
            this._configuration.checkout.orderTerms.showCheckbox
          ),
          checkboxText: this._getStringFromPropertyValue(t.orderTermsCheckboxText) || this._configuration.checkout.orderTerms.checkboxText,
          checkboxRequired: this._getBooleanFromPropertyValue(
            t.orderTermsCheckboxRequired,
            this._configuration.checkout.orderTerms.checkboxRequired
          )
        }
      }
    };
  }
  _getAbandonedCheckoutDatasetValue() {
    const e = this._configuration;
    return [
      { alias: "abandonmentThresholdHours", value: e.abandonedCheckout.abandonmentThresholdHours },
      { alias: "recoveryExpiryDays", value: e.abandonedCheckout.recoveryExpiryDays },
      { alias: "checkIntervalMinutes", value: e.abandonedCheckout.checkIntervalMinutes },
      { alias: "firstEmailDelayHours", value: e.abandonedCheckout.firstEmailDelayHours },
      { alias: "reminderEmailDelayHours", value: e.abandonedCheckout.reminderEmailDelayHours },
      { alias: "finalEmailDelayHours", value: e.abandonedCheckout.finalEmailDelayHours },
      { alias: "maxRecoveryEmails", value: e.abandonedCheckout.maxRecoveryEmails }
    ];
  }
  _handleAbandonedCheckoutDatasetChange(e) {
    if (!this._configuration) return;
    const r = e.target, t = this._toPropertyValueMap(r.value ?? []);
    this._configuration = {
      ...this._configuration,
      abandonedCheckout: {
        ...this._configuration.abandonedCheckout,
        abandonmentThresholdHours: this._getNumberFromPropertyValue(
          t.abandonmentThresholdHours,
          this._configuration.abandonedCheckout.abandonmentThresholdHours
        ),
        recoveryExpiryDays: this._getNumberFromPropertyValue(
          t.recoveryExpiryDays,
          this._configuration.abandonedCheckout.recoveryExpiryDays
        ),
        checkIntervalMinutes: this._getNumberFromPropertyValue(
          t.checkIntervalMinutes,
          this._configuration.abandonedCheckout.checkIntervalMinutes
        ),
        firstEmailDelayHours: this._getNumberFromPropertyValue(
          t.firstEmailDelayHours,
          this._configuration.abandonedCheckout.firstEmailDelayHours
        ),
        reminderEmailDelayHours: this._getNumberFromPropertyValue(
          t.reminderEmailDelayHours,
          this._configuration.abandonedCheckout.reminderEmailDelayHours
        ),
        finalEmailDelayHours: this._getNumberFromPropertyValue(
          t.finalEmailDelayHours,
          this._configuration.abandonedCheckout.finalEmailDelayHours
        ),
        maxRecoveryEmails: this._getNumberFromPropertyValue(
          t.maxRecoveryEmails,
          this._configuration.abandonedCheckout.maxRecoveryEmails
        )
      }
    };
  }
  _getEmailSettingsDatasetValue() {
    const e = this._configuration;
    return [
      { alias: "defaultFromAddress", value: e.email.defaultFromAddress ?? "" },
      { alias: "defaultFromName", value: e.email.defaultFromName ?? "" },
      { alias: "themeFontFamily", value: e.email.theme.fontFamily }
    ];
  }
  _handleEmailSettingsDatasetChange(e) {
    if (!this._configuration) return;
    const r = e.target, t = this._toPropertyValueMap(r.value ?? []);
    this._configuration = {
      ...this._configuration,
      email: {
        ...this._configuration.email,
        defaultFromAddress: this._getStringOrNullFromPropertyValue(t.defaultFromAddress),
        defaultFromName: this._getStringOrNullFromPropertyValue(t.defaultFromName),
        theme: {
          ...this._configuration.email.theme,
          fontFamily: this._getStringFromPropertyValue(t.themeFontFamily) || this._configuration.email.theme.fontFamily
        }
      }
    };
  }
  _getUcpDatasetValue() {
    const e = this._configuration;
    return [
      { alias: "termsUrl", value: e.ucp.termsUrl ?? "" },
      { alias: "privacyUrl", value: e.ucp.privacyUrl ?? "" }
    ];
  }
  _handleUcpDatasetChange(e) {
    if (!this._configuration) return;
    const r = e.target, t = this._toPropertyValueMap(r.value ?? []);
    this._configuration = {
      ...this._configuration,
      ucp: {
        ...this._configuration.ucp,
        termsUrl: this._getStringOrNullFromPropertyValue(t.termsUrl),
        privacyUrl: this._getStringOrNullFromPropertyValue(t.privacyUrl)
      }
    };
  }
  _renderSaveActions() {
    return o`
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
  _renderStoreTab() {
    return o`
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
            .config=${[{ alias: "multiple", value: !1 }]}>
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
  _renderPoliciesTab() {
    return o`
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
  _renderCheckoutTab() {
    const e = this._configuration;
    return o`
      <uui-box headline="Checkout">
        <umb-property-dataset
          .value=${this._getCheckoutBrandingDatasetValue()}
          @change=${this._handleCheckoutBrandingDatasetChange}>
          <umb-property
            alias="headerBackgroundImageMediaKey"
            label="Header Background Image"
            property-editor-ui-alias="Umb.PropertyEditorUi.MediaPicker"
            .config=${[{ alias: "multiple", value: !1 }]}>
          </umb-property>
          ${this._renderColorProperty(
      "Header Background Color",
      e.checkout.headerBackgroundColor ?? "",
      (r) => this._handleCheckoutColorChange("headerBackgroundColor", r)
    )}
          <umb-property
            alias="logoPosition"
            label="Logo Position"
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getLogoPositionConfig()}>
          </umb-property>
          <umb-property alias="logoMaxWidth" label="Logo Max Width" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
          ${this._renderColorProperty(
      "Primary Color",
      e.checkout.primaryColor,
      (r) => this._handleCheckoutColorChange("primaryColor", r)
    )}
          ${this._renderColorProperty(
      "Accent Color",
      e.checkout.accentColor,
      (r) => this._handleCheckoutColorChange("accentColor", r)
    )}
          ${this._renderColorProperty(
      "Background Color",
      e.checkout.backgroundColor,
      (r) => this._handleCheckoutColorChange("backgroundColor", r)
    )}
          ${this._renderColorProperty(
      "Text Color",
      e.checkout.textColor,
      (r) => this._handleCheckoutColorChange("textColor", r)
    )}
          ${this._renderColorProperty(
      "Error Color",
      e.checkout.errorColor,
      (r) => this._handleCheckoutColorChange("errorColor", r)
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
          <umb-property alias="abandonmentThresholdHours" label="Abandonment Threshold Hours" property-editor-ui-alias="Umb.PropertyEditorUi.Decimal"></umb-property>
          <umb-property alias="recoveryExpiryDays" label="Recovery Expiry Days" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
          <umb-property alias="checkIntervalMinutes" label="Check Interval Minutes" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
          <umb-property alias="firstEmailDelayHours" label="First Email Delay Hours" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
          <umb-property alias="reminderEmailDelayHours" label="Reminder Email Delay Hours" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
          <umb-property alias="finalEmailDelayHours" label="Final Email Delay Hours" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
          <umb-property alias="maxRecoveryEmails" label="Max Recovery Emails" property-editor-ui-alias="Umb.PropertyEditorUi.Integer"></umb-property>
        </umb-property-dataset>
      </uui-box>
      ${this._renderSaveActions()}
    `;
  }
  _renderEmailTab() {
    const e = this._configuration;
    return o`
      <uui-box headline="Email">
        <umb-property-dataset
          .value=${this._getEmailSettingsDatasetValue()}
          @change=${this._handleEmailSettingsDatasetChange}>
          <umb-property alias="defaultFromAddress" label="Default From Address" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="defaultFromName" label="Default From Name" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          ${this._renderColorProperty(
      "Primary Color",
      e.email.theme.primaryColor,
      (r) => this._handleEmailThemeColorChange("primaryColor", r)
    )}
          ${this._renderColorProperty(
      "Text Color",
      e.email.theme.textColor,
      (r) => this._handleEmailThemeColorChange("textColor", r)
    )}
          ${this._renderColorProperty(
      "Background Color",
      e.email.theme.backgroundColor,
      (r) => this._handleEmailThemeColorChange("backgroundColor", r)
    )}
          <umb-property alias="themeFontFamily" label="Font Family" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          ${this._renderColorProperty(
      "Secondary Text Color",
      e.email.theme.secondaryTextColor,
      (r) => this._handleEmailThemeColorChange("secondaryTextColor", r)
    )}
          ${this._renderColorProperty(
      "Content Background Color",
      e.email.theme.contentBackgroundColor,
      (r) => this._handleEmailThemeColorChange("contentBackgroundColor", r)
    )}
        </umb-property-dataset>
      </uui-box>
      ${this._renderSaveActions()}
    `;
  }
  _renderUcpTab() {
    return o`
      <uui-box headline="UCP">
        <umb-property-dataset
          .value=${this._getUcpDatasetValue()}
          @change=${this._handleUcpDatasetChange}>
          <umb-property alias="termsUrl" label="Terms URL" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
          <umb-property alias="privacyUrl" label="Privacy URL" property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"></umb-property>
        </umb-property-dataset>
      </uui-box>
      ${this._renderSaveActions()}
    `;
  }
  _renderCurrentTab() {
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
        return g;
    }
  }
  _renderErrorBanner() {
    return this._errorMessage ? o`
      <uui-box class="error-box">
        <div class="error-message">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
        </div>
      </uui-box>
    ` : g;
  }
  render() {
    return this._isLoading ? o`
        <div class="loading">
          <uui-loader></uui-loader>
        </div>
      ` : this._configuration ? o`
      ${this._renderErrorBanner()}

      <uui-tab-group class="tabs">
        <uui-tab label="Store" ?active=${this._activeTab === "store"} @click=${() => this._activeTab = "store"}>Store</uui-tab>
        <uui-tab label="Policies" ?active=${this._activeTab === "policies"} @click=${() => this._activeTab = "policies"}>Policies</uui-tab>
        <uui-tab label="Checkout" ?active=${this._activeTab === "checkout"} @click=${() => this._activeTab = "checkout"}>Checkout</uui-tab>
        <uui-tab label="Email" ?active=${this._activeTab === "email"} @click=${() => this._activeTab = "email"}>Email</uui-tab>
        <uui-tab label="UCP" ?active=${this._activeTab === "ucp"} @click=${() => this._activeTab = "ucp"}>UCP</uui-tab>
      </uui-tab-group>

      <div class="tab-content">
        ${this._renderCurrentTab()}
      </div>
    ` : o`
        ${this._renderErrorBanner()}
        <div class="tab-actions">
          <uui-button label="Retry" look="secondary" @click=${this._loadConfiguration}>Retry</uui-button>
        </div>
      `;
  }
};
_ = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
u.styles = v`
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
p([
  s()
], u.prototype, "_isLoading", 2);
p([
  s()
], u.prototype, "_isSaving", 2);
p([
  s()
], u.prototype, "_errorMessage", 2);
p([
  s()
], u.prototype, "_activeTab", 2);
p([
  s()
], u.prototype, "_configuration", 2);
p([
  s()
], u.prototype, "_descriptionEditorConfig", 2);
u = p([
  C("merchello-store-configuration-tabs")
], u);
var $ = Object.defineProperty, M = Object.getOwnPropertyDescriptor, x = (e, r, t, a) => {
  for (var i = a > 1 ? void 0 : a ? M(r, t) : r, n = e.length - 1, l; n >= 0; n--)
    (l = e[n]) && (i = (a ? l(r, t, i) : l(i)) || i);
  return a && i && $(r, t, i), i;
};
let d = class extends k(f) {
  constructor() {
    super(...arguments), this._isLoading = !0, this._showSeedData = !1;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadStatus();
  }
  async _loadStatus() {
    this._isLoading = !0;
    const { data: e } = await m.getSeedDataStatus();
    this._showSeedData = e?.isEnabled === !0 && e?.isInstalled === !1, this._isLoading = !1;
  }
  _onSeedDataInstalled() {
    this._showSeedData = !1;
  }
  render() {
    return this._isLoading ? g : o`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          ${this._showSeedData ? o`
                <merchello-seed-data-workspace
                  @seed-data-installed=${this._onSeedDataInstalled}
                ></merchello-seed-data-workspace>
              ` : g}

          <merchello-store-configuration-tabs></merchello-store-configuration-tabs>
        </div>
      </umb-body-layout>
    `;
  }
};
d.styles = [
  v`
      :host {
        display: block;
        height: 100%;
      }

      .content {
        padding: var(--uui-size-layout-1);
        width: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }
    `
];
x([
  s()
], d.prototype, "_isLoading", 2);
x([
  s()
], d.prototype, "_showSeedData", 2);
d = x([
  C("merchello-settings-workspace")
], d);
const K = d;
export {
  d as MerchelloSettingsWorkspaceElement,
  K as default
};
//# sourceMappingURL=settings-workspace.element-BtyeCMb9.js.map
