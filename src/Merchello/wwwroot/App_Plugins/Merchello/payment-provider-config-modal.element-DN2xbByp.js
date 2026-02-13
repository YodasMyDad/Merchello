import { nothing as r, html as a, css as m, state as n, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as y } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-DNSJzonx.js";
var $ = Object.defineProperty, k = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, l = (e, s, i, d) => {
  for (var o = d > 1 ? void 0 : d ? k(s, i) : s, c = e.length - 1, p; c >= 0; c--)
    (p = e[c]) && (o = (d ? p(s, i, o) : p(o)) || o);
  return d && o && $(s, i, o), o;
}, b = (e, s, i) => s.has(e) || _("Cannot " + i), h = (e, s, i) => (b(e, s, "read from private field"), s.get(e)), x = (e, s, i) => s.has(e) ? _("Cannot add the same private member more than once") : s instanceof WeakSet ? s.add(e) : s.set(e, i), g = (e, s, i, d) => (b(e, s, "write to private field"), s.set(e, i), i), u;
let t = class extends y {
  constructor() {
    super(...arguments), this._fields = [], this._values = {}, this._displayName = "", this._isEnabled = !0, this._isTestMode = !0, this._isVaultingEnabled = !1, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, x(this, u, !1);
  }
  connectedCallback() {
    super.connectedCallback(), g(this, u, !0), this._loadFields();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, u, !1);
  }
  async _loadFields() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.provider, s = this.data?.setting;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    this._displayName = s?.displayName ?? e.displayName, this._isEnabled = s?.isEnabled ?? !0, this._isTestMode = s?.isTestMode ?? !0, this._isVaultingEnabled = s?.isVaultingEnabled ?? !1;
    const { data: i, error: d } = await v.getPaymentProviderFields(e.alias);
    if (!h(this, u)) return;
    if (d) {
      this._errorMessage = d.message, this._isLoading = !1;
      return;
    }
    this._fields = i ?? [];
    const o = s?.configuration ?? {};
    this._values = {};
    for (const c of this._fields)
      this._values[c.key] = o[c.key] ?? c.defaultValue ?? "";
    this._isLoading = !1;
  }
  _handleValueChange(e, s) {
    this._values = { ...this._values, [e]: s };
  }
  _handleCheckboxChange(e, s) {
    this._values = { ...this._values, [e]: s ? "true" : "false" };
  }
  async _handleSave() {
    const e = this.data?.provider, s = this.data?.setting;
    if (e) {
      this._isSaving = !0, this._errorMessage = null;
      for (const i of this._fields)
        if (i.isRequired && !this._values[i.key]) {
          this._errorMessage = `${i.label} is required`, this._isSaving = !1;
          return;
        }
      try {
        if (s) {
          const { error: i } = await v.updatePaymentProvider(s.id, {
            displayName: this._displayName,
            isEnabled: this._isEnabled,
            isTestMode: this._isTestMode,
            isVaultingEnabled: this._isVaultingEnabled,
            configuration: this._values
          });
          if (!h(this, u)) return;
          if (i) {
            this._errorMessage = i.message, this._isSaving = !1;
            return;
          }
        } else {
          const { error: i } = await v.createPaymentProvider({
            providerAlias: e.alias,
            displayName: this._displayName,
            isEnabled: this._isEnabled,
            isTestMode: this._isTestMode,
            isVaultingEnabled: this._isVaultingEnabled,
            configuration: this._values
          });
          if (!h(this, u)) return;
          if (i) {
            this._errorMessage = i.message, this._isSaving = !1;
            return;
          }
        }
        this._isSaving = !1, this.value = { isSaved: !0 }, this.modalContext?.submit();
      } catch (i) {
        if (!h(this, u)) return;
        this._errorMessage = i instanceof Error ? i.message : "Failed to save configuration", this._isSaving = !1;
      }
    }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _getSelectFieldOptions(e, s) {
    return [
      { name: "Select...", value: "", selected: !s },
      ...e.options?.map((i) => ({
        name: i.label,
        value: i.value,
        selected: s === i.value
      })) ?? []
    ];
  }
  _renderField(e) {
    const s = this._values[e.key] ?? "";
    switch (e.fieldType) {
      case "Text":
      case "Url":
        return a`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? a`<p class="field-description">${e.description}</p>` : r}
            <uui-input
              id="${e.key}"
              label="${e.label}"
              type="${e.fieldType === "Url" ? "url" : "text"}"
              .value=${s}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(i) => this._handleValueChange(e.key, i.target.value)}
            ></uui-input>
          </div>
        `;
      case "Password":
        return a`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? a`<p class="field-description">${e.description}</p>` : r}
            <uui-input
              id="${e.key}"
              label="${e.label}"
              type="password"
              .value=${s}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(i) => this._handleValueChange(e.key, i.target.value)}
            ></uui-input>
            ${e.isSensitive && s ? a`<small class="sensitive-note">Value is stored securely</small>` : r}
          </div>
        `;
      case "Textarea":
        return a`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? a`<p class="field-description">${e.description}</p>` : r}
            <uui-textarea
              id="${e.key}"
              label="${e.label}"
              .value=${s}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(i) => this._handleValueChange(e.key, i.target.value)}
            ></uui-textarea>
          </div>
        `;
      case "Checkbox":
        return a`
          <div class="form-field checkbox-field">
            <uui-checkbox
              id="${e.key}"
              label="${e.label}"
              ?checked=${s === "true"}
              @change=${(i) => this._handleCheckboxChange(e.key, i.target.checked)}
            >
              ${e.label}
            </uui-checkbox>
            ${e.description ? a`<p class="field-description">${e.description}</p>` : r}
          </div>
        `;
      case "Select":
        return a`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? a`<p class="field-description">${e.description}</p>` : r}
            <uui-select
              id="${e.key}"
              label="${e.label}"
              .options=${this._getSelectFieldOptions(e, s)}
              ?required=${e.isRequired}
              @change=${(i) => this._handleValueChange(e.key, i.target.value)}
            ></uui-select>
          </div>
        `;
      default:
        return r;
    }
  }
  render() {
    const e = this.data?.provider, s = !!this.data?.setting;
    return a`
      <umb-body-layout headline="${s ? "Configure" : "Install"} ${e?.displayName ?? "Provider"}">
        <div id="main">
          ${this._isLoading ? a`
                <div class="loading">
                  <uui-loader></uui-loader>
                  <span>Loading configuration...</span>
                </div>
              ` : a`
                ${this._errorMessage ? a`
                      <div class="error-message">
                        <uui-icon name="icon-alert"></uui-icon>
                        ${this._errorMessage}
                      </div>
                    ` : r}

                <div class="form-field">
                  <label for="displayName">Display Name *</label>
                  <p class="field-description">
                    The name shown to customers during checkout.
                  </p>
                  <uui-input
                    id="displayName"
                    label="Display name"
                    .value=${this._displayName}
                    required
                    @input=${(i) => this._displayName = i.target.value}
                  ></uui-input>
                </div>

                <div class="form-field checkbox-field">
                  <uui-checkbox
                    id="isEnabled"
                    label="Show in checkout"
                    ?checked=${this._isEnabled}
                    @change=${(i) => this._isEnabled = i.target.checked}
                  >
                    Show In Checkout
                  </uui-checkbox>
                  <p class="field-description">
                    When checked, this payment method will be displayed as an option for customers during checkout.
                    Uncheck to keep the provider installed but hidden from customers.
                  </p>
                </div>

                <div class="form-field checkbox-field">
                  <uui-checkbox
                    id="isTestMode"
                    label="Test mode"
                    ?checked=${this._isTestMode}
                    @change=${(i) => this._isTestMode = i.target.checked}
                  >
                    Test Mode
                  </uui-checkbox>
                  <p class="field-description">
                    When enabled, the provider operates in test/sandbox mode. Disable for live/production transactions.
                  </p>
                </div>

                ${e?.supportsVaultedPayments ? a`
                  <div class="form-field checkbox-field">
                    <uui-checkbox
                      id="isVaultingEnabled"
                      label="Enable vaulting"
                      ?checked=${this._isVaultingEnabled}
                      @change=${(i) => this._isVaultingEnabled = i.target.checked}
                    >
                      Enable Payment Method Vaulting
                    </uui-checkbox>
                    <p class="field-description">
                      Allow customers to save payment methods for future purchases. Only available when the provider supports vaulting.
                    </p>
                  </div>
                ` : r}

                ${this._fields.length > 0 ? a`
                      <hr />
                      <h3>Provider Configuration</h3>
                      ${this._fields.map((i) => this._renderField(i))}
                    ` : r}
              `}
        </div>

        <div slot="actions">
          <uui-button
            label="Cancel"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}
          >
            Cancel
          </uui-button>
          <uui-button
            label="${s ? "Save" : "Install Provider"}"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isLoading || this._isSaving}
          >
            ${this._isSaving ? a`<uui-loader-circle></uui-loader-circle>` : r}
            ${s ? "Save" : "Install Provider"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
t.styles = m`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-4);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    h3 {
      margin: var(--uui-size-space-4) 0;
      font-size: 1rem;
      font-weight: 600;
    }

    hr {
      border: none;
      border-top: 1px solid var(--uui-color-border);
      margin: var(--uui-size-space-5) 0;
    }

    .form-field {
      margin-bottom: var(--uui-size-space-4);
    }

    .form-field label {
      display: block;
      font-weight: 600;
      margin-bottom: var(--uui-size-space-1);
    }

    .field-description {
      margin: 0 0 var(--uui-size-space-2) 0;
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .checkbox-field .field-description {
      margin-left: var(--uui-size-space-5);
    }

    .sensitive-note {
      display: block;
      margin-top: var(--uui-size-space-1);
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    uui-input,
    uui-textarea,
    uui-select {
      width: 100%;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
l([
  n()
], t.prototype, "_fields", 2);
l([
  n()
], t.prototype, "_values", 2);
l([
  n()
], t.prototype, "_displayName", 2);
l([
  n()
], t.prototype, "_isEnabled", 2);
l([
  n()
], t.prototype, "_isTestMode", 2);
l([
  n()
], t.prototype, "_isVaultingEnabled", 2);
l([
  n()
], t.prototype, "_isLoading", 2);
l([
  n()
], t.prototype, "_isSaving", 2);
l([
  n()
], t.prototype, "_errorMessage", 2);
t = l([
  f("merchello-payment-provider-config-modal")
], t);
const S = t;
export {
  t as MerchelloPaymentProviderConfigModalElement,
  S as default
};
//# sourceMappingURL=payment-provider-config-modal.element-DN2xbByp.js.map
