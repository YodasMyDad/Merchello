import { nothing as l, html as t, css as f, state as c, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as b } from "@umbraco-cms/backoffice/modal";
import { M as h } from "./merchello-api-NdGX4WPd.js";
import { m as $ } from "./modal-layout.styles-C2OaUji5.js";
var S = Object.defineProperty, k = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, n = (e, i, s, a) => {
  for (var r = a > 1 ? void 0 : a ? k(i, s) : i, u = e.length - 1, v; u >= 0; u--)
    (v = e[u]) && (r = (a ? v(i, s, r) : v(r)) || r);
  return a && r && S(i, s, r), r;
}, _ = (e, i, s) => i.has(e) || y("Cannot " + s), p = (e, i, s) => (_(e, i, "read from private field"), i.get(e)), M = (e, i, s) => i.has(e) ? y("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, s), g = (e, i, s, a) => (_(e, i, "write to private field"), i.set(e, s), s), d;
const x = "supplier-direct";
let o = class extends b {
  constructor() {
    super(...arguments), this._fields = [], this._values = {}, this._displayName = "", this._isEnabled = !0, this._inventorySyncMode = 0, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._visibleSecrets = /* @__PURE__ */ new Set(), M(this, d, !1);
  }
  connectedCallback() {
    super.connectedCallback(), g(this, d, !0), this._loadFields();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, d, !1);
  }
  async _loadFields() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.provider, i = this.data?.configured;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    this._displayName = i?.displayName ?? e.displayName, this._isEnabled = i?.isEnabled ?? !0, this._inventorySyncMode = i?.inventorySyncMode ?? 0;
    let s = {};
    if (i?.configurationId) {
      const r = await h.getFulfilmentProviderConfiguration(
        i.configurationId
      );
      if (!p(this, d)) return;
      if (r.error) {
        this._errorMessage = r.error.message, this._isLoading = !1;
        return;
      }
      const u = r.data;
      u && (this._displayName = u.displayName, this._isEnabled = u.isEnabled, this._inventorySyncMode = u.inventorySyncMode, s = u.configuration ?? {});
    }
    const a = await h.getFulfilmentProviderFields(e.key);
    if (p(this, d)) {
      if (a.error) {
        this._errorMessage = a.error.message, this._isLoading = !1;
        return;
      }
      this._fields = a.data ?? [], this._values = {};
      for (const r of this._fields)
        this._values[r.key] = s[r.key] ?? r.defaultValue ?? "";
      this._isLoading = !1;
    }
  }
  _handleValueChange(e, i) {
    this._values = { ...this._values, [e]: i };
  }
  _toggleSecretVisibility(e) {
    const i = new Set(this._visibleSecrets);
    i.has(e) ? i.delete(e) : i.add(e), this._visibleSecrets = i;
  }
  _handleCheckboxChange(e, i) {
    this._values = { ...this._values, [e]: i ? "true" : "false" };
  }
  async _handleSave() {
    const e = this.data?.provider, i = this.data?.configured;
    if (!e) return;
    this._isSaving = !0, this._errorMessage = null;
    for (const a of this._fields)
      if (a.isRequired && !this._values[a.key]) {
        this._errorMessage = `${a.label} is required`, this._isSaving = !1;
        return;
      }
    const s = { ...this._values };
    try {
      if (i?.configurationId) {
        const { error: a } = await h.updateFulfilmentProvider(i.configurationId, {
          displayName: this._displayName,
          isEnabled: this._isEnabled,
          inventorySyncMode: this._inventorySyncMode,
          configuration: s
        });
        if (!p(this, d)) return;
        if (a) {
          this._errorMessage = a.message, this._isSaving = !1;
          return;
        }
      } else {
        const { error: a } = await h.createFulfilmentProvider({
          providerKey: e.key,
          displayName: this._displayName,
          isEnabled: this._isEnabled,
          inventorySyncMode: this._inventorySyncMode,
          configuration: s
        });
        if (!p(this, d)) return;
        if (a) {
          this._errorMessage = a.message, this._isSaving = !1;
          return;
        }
      }
      this._isSaving = !1, this.value = { isSaved: !0 }, this.modalContext?.submit();
    } catch (a) {
      if (!p(this, d)) return;
      this._errorMessage = a instanceof Error ? a.message : "Failed to save configuration", this._isSaving = !1;
    }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _isSupplierDirectProvider() {
    return this.data?.provider?.key === x;
  }
  _getSelectFieldOptions(e, i) {
    return [
      { name: "Select...", value: "", selected: !i },
      ...e.options?.map((s) => ({
        name: s.label,
        value: s.value,
        selected: i === s.value
      })) ?? []
    ];
  }
  _renderField(e) {
    const i = this._values[e.key] ?? "";
    switch (e.fieldType) {
      case "Text":
      case "Url":
        return t`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : l}
            <uui-input
              id="${e.key}"
              label="${e.label}"
              type="${e.fieldType === "Url" ? "url" : "text"}"
              .value=${i}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(s) => this._handleValueChange(e.key, s.target.value)}
            ></uui-input>
          </div>
        `;
      case "Number":
        return t`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : l}
            <uui-input
              id="${e.key}"
              label="${e.label}"
              type="number"
              .value=${i}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(s) => this._handleValueChange(e.key, s.target.value)}
            ></uui-input>
          </div>
        `;
      case "Password": {
        const s = this._visibleSecrets.has(e.key);
        return t`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : l}
            <div class="password-field-wrapper">
              <uui-input
                id="${e.key}"
                label="${e.label}"
                type="${s ? "text" : "password"}"
                .value=${i}
                placeholder="${e.placeholder ?? ""}"
                ?required=${e.isRequired}
                @input=${(a) => this._handleValueChange(e.key, a.target.value)}
              ></uui-input>
              <uui-button
                compact
                look="secondary"
                label="${s ? "Hide" : "Show"}"
                @click=${() => this._toggleSecretVisibility(e.key)}
              >
                <uui-icon name="${s ? "icon-eye-slash" : "icon-eye"}"></uui-icon>
              </uui-button>
            </div>
            ${e.isSensitive && i ? t`<small class="sensitive-note">Value is stored securely</small>` : l}
          </div>
        `;
      }
      case "Textarea":
        return t`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : l}
            <uui-textarea
              id="${e.key}"
              label="${e.label}"
              .value=${i}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(s) => this._handleValueChange(e.key, s.target.value)}
            ></uui-textarea>
          </div>
        `;
      case "Checkbox":
        return t`
          <div class="form-field checkbox-field">
            <uui-checkbox
              id="${e.key}"
              label="${e.label}"
              ?checked=${i === "true"}
              @change=${(s) => this._handleCheckboxChange(e.key, s.target.checked)}
            >
              ${e.label}
            </uui-checkbox>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : l}
          </div>
        `;
      case "Select":
        return t`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : l}
            <uui-select
              id="${e.key}"
              label="${e.label}"
              .options=${this._getSelectFieldOptions(e, i)}
              ?required=${e.isRequired}
              @change=${(s) => this._handleValueChange(e.key, s.target.value)}
            ></uui-select>
          </div>
        `;
      default:
        return l;
    }
  }
  render() {
    const e = this.data?.provider, i = !!this.data?.configured;
    return t`
      <umb-body-layout headline="${i ? "Configure" : "Install"} ${e?.displayName ?? "Provider"}">
        <div id="main">
          ${this._isLoading ? t`
                <div class="loading">
                  <uui-loader></uui-loader>
                  <span>Loading configuration...</span>
                </div>
              ` : t`
                ${this._errorMessage ? t`
                      <div class="error-message">
                        <uui-icon name="icon-alert"></uui-icon>
                        ${this._errorMessage}
                      </div>
                    ` : l}

                <div class="form-field">
                  <label for="displayName">Display Name *</label>
                  <p class="field-description">
                    The name shown in the backoffice for this provider configuration.
                  </p>
                  <uui-input
                    id="displayName"
                    label="Display name"
                    .value=${this._displayName}
                    required
                    @input=${(s) => this._displayName = s.target.value}
                  ></uui-input>
                </div>

                <div class="form-field checkbox-field">
                  <uui-checkbox
                    id="isEnabled"
                    label="Enabled"
                    ?checked=${this._isEnabled}
                    @change=${(s) => this._isEnabled = s.target.checked}
                  >
                    Enabled
                  </uui-checkbox>
                  <p class="field-description">
                    When enabled, this provider can be used for fulfilment operations.
                  </p>
                </div>

                <div class="form-field">
                  <label for="inventorySyncMode">Inventory Sync Mode</label>
                  <p class="field-description">
                    How inventory updates from this provider should be applied.
                  </p>
                  <uui-select
                    id="inventorySyncMode"
                    label="Inventory sync mode"
                    .options=${[
      { name: "Full - Replace inventory levels", value: "0", selected: this._inventorySyncMode === 0 },
      { name: "Delta - Apply adjustments", value: "1", selected: this._inventorySyncMode === 1 }
    ]}
                    @change=${(s) => this._inventorySyncMode = parseInt(s.target.value)}
                  ></uui-select>
                </div>

                ${this._isSupplierDirectProvider() ? t`
                      <div class="info-message">
                        <uui-icon name="icon-info"></uui-icon>
                        <div>
                          Supplier Direct has no shared delivery defaults in this modal.
                          Go to <strong>Warehouses &gt; Suppliers</strong>, edit a supplier, then set that supplier's
                          <strong>Supplier Direct Profile</strong> (Email / FTP / SFTP).
                        </div>
                      </div>
                    ` : l}

                ${this._fields.length > 0 ? t`
                      <hr />
                      <h3>Provider Configuration</h3>
                      ${this._fields.map((s) => this._renderField(s))}
                    ` : l}
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
            label="${i ? "Save" : "Install Provider"}"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isLoading || this._isSaving}
          >
            ${this._isSaving ? t`<uui-loader-circle></uui-loader-circle>` : l}
            ${i ? "Save" : "Install Provider"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
o.styles = [
  $,
  f`
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

    .info-message {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
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

    .password-field-wrapper {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
    }

    .password-field-wrapper uui-input {
      flex: 1;
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
  `
];
n([
  c()
], o.prototype, "_fields", 2);
n([
  c()
], o.prototype, "_values", 2);
n([
  c()
], o.prototype, "_displayName", 2);
n([
  c()
], o.prototype, "_isEnabled", 2);
n([
  c()
], o.prototype, "_inventorySyncMode", 2);
n([
  c()
], o.prototype, "_isLoading", 2);
n([
  c()
], o.prototype, "_isSaving", 2);
n([
  c()
], o.prototype, "_errorMessage", 2);
n([
  c()
], o.prototype, "_visibleSecrets", 2);
o = n([
  m("merchello-fulfilment-provider-config-modal")
], o);
const z = o;
export {
  o as MerchelloFulfilmentProviderConfigModalElement,
  z as default
};
//# sourceMappingURL=fulfilment-provider-config-modal.element--vnmGefV.js.map
