import { nothing as r, html as a, css as $, state as c, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as b } from "@umbraco-cms/backoffice/modal";
import { M as h } from "./merchello-api-BuImeZL2.js";
var y = Object.defineProperty, k = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, u = (e, i, s, n) => {
  for (var t = n > 1 ? void 0 : n ? k(i, s) : i, d = e.length - 1, p; d >= 0; d--)
    (p = e[d]) && (t = (n ? p(i, s, t) : p(t)) || t);
  return n && t && y(i, s, t), t;
}, m = (e, i, s) => i.has(e) || _("Cannot " + s), v = (e, i, s) => (m(e, i, "read from private field"), i.get(e)), C = (e, i, s) => i.has(e) ? _("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, s), g = (e, i, s, n) => (m(e, i, "write to private field"), i.set(e, s), s), l;
let o = class extends b {
  constructor() {
    super(...arguments), this._fields = [], this._values = {}, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, C(this, l, !1);
  }
  connectedCallback() {
    super.connectedCallback(), g(this, l, !0), this._loadFields();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, l, !1);
  }
  async _loadFields() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.provider;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    const { data: i, error: s } = await h.getAddressLookupProviderFields(e.alias);
    if (!v(this, l)) return;
    if (s) {
      this._errorMessage = s.message, this._isLoading = !1;
      return;
    }
    this._fields = i ?? [];
    const n = e.configuration ?? {};
    this._values = {};
    for (const t of this._fields)
      this._values[t.key] = n[t.key] ?? t.defaultValue ?? "";
    this._isLoading = !1;
  }
  _handleValueChange(e, i) {
    this._values = { ...this._values, [e]: i };
  }
  _handleCheckboxChange(e, i) {
    this._values = { ...this._values, [e]: i ? "true" : "false" };
  }
  async _handleSave() {
    const e = this.data?.provider;
    if (e) {
      this._isSaving = !0, this._errorMessage = null;
      for (const i of this._fields)
        if (i.isRequired && !this._values[i.key]) {
          this._errorMessage = `${i.label} is required`, this._isSaving = !1;
          return;
        }
      try {
        const { error: i } = await h.saveAddressLookupProviderSettings(e.alias, {
          configuration: this._values
        });
        if (!v(this, l)) return;
        if (i) {
          this._errorMessage = i.message, this._isSaving = !1;
          return;
        }
        this._isSaving = !1, this.value = { isSaved: !0 }, this.modalContext?.submit();
      } catch (i) {
        if (!v(this, l)) return;
        this._errorMessage = i instanceof Error ? i.message : "Failed to save configuration", this._isSaving = !1;
      }
    }
  }
  _handleCancel() {
    this.modalContext?.reject();
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
        return a`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? a`<p class="field-description">${e.description}</p>` : r}
            <uui-input
              id="${e.key}"
              type="${e.fieldType === "Url" ? "url" : "text"}"
              .value=${i}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(s) => this._handleValueChange(e.key, s.target.value)}
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
              type="password"
              .value=${i}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(s) => this._handleValueChange(e.key, s.target.value)}
            ></uui-input>
            ${e.isSensitive && i ? a`<small class="sensitive-note">Value is stored securely</small>` : r}
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
              .value=${i}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(s) => this._handleValueChange(e.key, s.target.value)}
            ></uui-textarea>
          </div>
        `;
      case "Checkbox":
        return a`
          <div class="form-field checkbox-field">
            <uui-checkbox
              id="${e.key}"
              label="${e.label}"
              ?checked=${i === "true"}
              @change=${(s) => this._handleCheckboxChange(e.key, s.target.checked)}
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
              .options=${this._getSelectFieldOptions(e, i)}
              ?required=${e.isRequired}
              @change=${(s) => this._handleValueChange(e.key, s.target.value)}
            ></uui-select>
          </div>
        `;
      case "Number":
      case "Currency":
      case "Percentage":
        return a`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? a`<p class="field-description">${e.description}</p>` : r}
            <uui-input
              id="${e.key}"
              type="number"
              step=${e.fieldType === "Number" ? "1" : "0.01"}
              .value=${i}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(s) => this._handleValueChange(e.key, s.target.value)}
            ></uui-input>
          </div>
        `;
      default:
        return r;
    }
  }
  _formatSupportedCountries() {
    if (!this.data?.provider) return null;
    const e = this.data.provider.supportedCountries;
    return !e || e.length === 0 || e.some((i) => i === "*") ? "All countries" : e.join(", ");
  }
  render() {
    const e = this.data?.provider, i = this._formatSupportedCountries();
    return a`
      <umb-body-layout headline="Configure ${e?.displayName ?? "Provider"}">
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

                ${e?.setupInstructions ? a`
                      <div class="info-banner">
                        <uui-icon name="icon-info"></uui-icon>
                        <div>
                          <strong>Setup</strong>
                          <p>${e.setupInstructions}</p>
                        </div>
                      </div>
                    ` : r}

                ${i ? a`
                      <div class="meta-row">
                        <span class="meta-label">Supported countries</span>
                        <span class="meta-value">${i}</span>
                      </div>
                    ` : r}

                ${this._fields.length > 0 ? a`
                      <p class="section-description">
                        Configure the settings for ${e?.displayName ?? "this provider"}.
                      </p>
                      ${this._fields.map((s) => this._renderField(s))}
                    ` : a`
                      <p class="no-fields">
                        This provider does not require any configuration.
                      </p>
                    `}
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
            label="Save"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isLoading || this._isSaving || this._fields.length === 0}
          >
            ${this._isSaving ? a`<uui-loader-circle></uui-loader-circle>` : r}
            Save
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
l = /* @__PURE__ */ new WeakMap();
o.styles = $`
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

    .info-banner {
      display: flex;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      color: var(--uui-color-text);
    }

    .info-banner uui-icon {
      font-size: 1.2rem;
      color: var(--uui-color-interactive);
    }

    .info-banner p {
      margin: 4px 0 0 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .meta-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: baseline;
      margin-bottom: var(--uui-size-space-4);
    }

    .meta-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .meta-value {
      font-size: 0.875rem;
      color: var(--uui-color-text);
    }

    .section-description {
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .no-fields {
      color: var(--uui-color-text-alt);
      font-style: italic;
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
u([
  c()
], o.prototype, "_fields", 2);
u([
  c()
], o.prototype, "_values", 2);
u([
  c()
], o.prototype, "_isLoading", 2);
u([
  c()
], o.prototype, "_isSaving", 2);
u([
  c()
], o.prototype, "_errorMessage", 2);
o = u([
  f("merchello-address-lookup-provider-config-modal")
], o);
const M = o;
export {
  o as MerchelloAddressLookupProviderConfigModalElement,
  M as default
};
//# sourceMappingURL=address-lookup-provider-config-modal.element-CVCe8oJ3.js.map
