import { nothing as l, html as t, css as f, state as d, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as b } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-D_QA1kor.js";
var $ = Object.defineProperty, k = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, o = (e, i, a, s) => {
  for (var u = s > 1 ? void 0 : s ? k(i, a) : i, p = e.length - 1, h; p >= 0; p--)
    (h = e[p]) && (u = (s ? h(i, a, u) : h(u)) || u);
  return s && u && $(i, a, u), u;
}, y = (e, i, a) => i.has(e) || _("Cannot " + a), c = (e, i, a) => (y(e, i, "read from private field"), i.get(e)), S = (e, i, a) => i.has(e) ? _("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, a), g = (e, i, a, s) => (y(e, i, "write to private field"), i.set(e, a), a), n;
let r = class extends b {
  constructor() {
    super(...arguments), this._fields = [], this._values = {}, this._displayName = "", this._isEnabled = !0, this._inventorySyncMode = 0, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, S(this, n, !1);
  }
  connectedCallback() {
    super.connectedCallback(), g(this, n, !0), this._loadFields();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, n, !1);
  }
  async _loadFields() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.provider, i = this.data?.configured;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    this._displayName = i?.displayName ?? e.displayName, this._isEnabled = i?.isEnabled ?? !0, this._inventorySyncMode = i?.inventorySyncMode ?? 0;
    const a = await v.getFulfilmentProviderFields(e.key);
    if (c(this, n)) {
      if (a.error) {
        this._errorMessage = a.error.message, this._isLoading = !1;
        return;
      }
      this._fields = a.data ?? [], this._values = {};
      for (const s of this._fields)
        this._values[s.key] = s.defaultValue ?? "";
      this._isLoading = !1;
    }
  }
  _handleValueChange(e, i) {
    this._values = { ...this._values, [e]: i };
  }
  _handleCheckboxChange(e, i) {
    this._values = { ...this._values, [e]: i ? "true" : "false" };
  }
  async _handleSave() {
    const e = this.data?.provider, i = this.data?.configured;
    if (!e) return;
    this._isSaving = !0, this._errorMessage = null;
    for (const s of this._fields)
      if (s.isRequired && !this._values[s.key]) {
        this._errorMessage = `${s.label} is required`, this._isSaving = !1;
        return;
      }
    const a = { ...this._values };
    try {
      if (i?.configurationId) {
        const { error: s } = await v.updateFulfilmentProvider(i.configurationId, {
          displayName: this._displayName,
          isEnabled: this._isEnabled,
          inventorySyncMode: this._inventorySyncMode,
          configuration: a
        });
        if (!c(this, n)) return;
        if (s) {
          this._errorMessage = s.message, this._isSaving = !1;
          return;
        }
      } else {
        const { error: s } = await v.createFulfilmentProvider({
          providerKey: e.key,
          displayName: this._displayName,
          isEnabled: this._isEnabled,
          inventorySyncMode: this._inventorySyncMode,
          configuration: a
        });
        if (!c(this, n)) return;
        if (s) {
          this._errorMessage = s.message, this._isSaving = !1;
          return;
        }
      }
      this._isSaving = !1, this.value = { isSaved: !0 }, this.modalContext?.submit();
    } catch (s) {
      if (!c(this, n)) return;
      this._errorMessage = s instanceof Error ? s.message : "Failed to save configuration", this._isSaving = !1;
    }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _getSelectFieldOptions(e, i) {
    return [
      { name: "Select...", value: "", selected: !i },
      ...e.options?.map((a) => ({
        name: a.label,
        value: a.value,
        selected: i === a.value
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
              @input=${(a) => this._handleValueChange(e.key, a.target.value)}
            ></uui-input>
          </div>
        `;
      case "Password":
        return t`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : l}
            <uui-input
              id="${e.key}"
              label="${e.label}"
              type="password"
              .value=${i}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(a) => this._handleValueChange(e.key, a.target.value)}
            ></uui-input>
            ${e.isSensitive && i ? t`<small class="sensitive-note">Value is stored securely</small>` : l}
          </div>
        `;
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
              @input=${(a) => this._handleValueChange(e.key, a.target.value)}
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
              @change=${(a) => this._handleCheckboxChange(e.key, a.target.checked)}
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
              @change=${(a) => this._handleValueChange(e.key, a.target.value)}
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
                    @input=${(a) => this._displayName = a.target.value}
                  ></uui-input>
                </div>

                <div class="form-field checkbox-field">
                  <uui-checkbox
                    id="isEnabled"
                    label="Enabled"
                    ?checked=${this._isEnabled}
                    @change=${(a) => this._isEnabled = a.target.checked}
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
                    @change=${(a) => this._inventorySyncMode = parseInt(a.target.value)}
                  ></uui-select>
                </div>

                ${this._fields.length > 0 ? t`
                      <hr />
                      <h3>Provider Configuration</h3>
                      ${this._fields.map((a) => this._renderField(a))}
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
n = /* @__PURE__ */ new WeakMap();
r.styles = f`
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
o([
  d()
], r.prototype, "_fields", 2);
o([
  d()
], r.prototype, "_values", 2);
o([
  d()
], r.prototype, "_displayName", 2);
o([
  d()
], r.prototype, "_isEnabled", 2);
o([
  d()
], r.prototype, "_inventorySyncMode", 2);
o([
  d()
], r.prototype, "_isLoading", 2);
o([
  d()
], r.prototype, "_isSaving", 2);
o([
  d()
], r.prototype, "_errorMessage", 2);
r = o([
  m("merchello-fulfilment-provider-config-modal")
], r);
const E = r;
export {
  r as MerchelloFulfilmentProviderConfigModalElement,
  E as default
};
//# sourceMappingURL=fulfilment-provider-config-modal.element-Do7z0yiw.js.map
