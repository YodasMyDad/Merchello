import { nothing as t, html as a, css as h, state as d, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-CzSx3Q3Y.js";
var _ = Object.defineProperty, m = Object.getOwnPropertyDescriptor, l = (e, s, i, n) => {
  for (var o = n > 1 ? void 0 : n ? m(s, i) : s, u = e.length - 1, c; u >= 0; u--)
    (c = e[u]) && (o = (n ? c(s, i, o) : c(o)) || o);
  return n && o && _(s, i, o), o;
};
let r = class extends g {
  constructor() {
    super(...arguments), this._fields = [], this._values = {}, this._displayName = "", this._isEnabled = !0, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadFields();
  }
  async _loadFields() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.provider, s = this.data?.configuration;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    this._displayName = s?.displayName ?? e.displayName, this._isEnabled = s?.isEnabled ?? !0;
    const { data: i, error: n } = await p.getShippingProviderFields(e.key);
    if (n) {
      this._errorMessage = n.message, this._isLoading = !1;
      return;
    }
    this._fields = i ?? [];
    const o = s?.configuration ?? {};
    this._values = {};
    for (const u of this._fields)
      this._values[u.key] = o[u.key] ?? u.defaultValue ?? "";
    this._isLoading = !1;
  }
  _handleValueChange(e, s) {
    this._values = { ...this._values, [e]: s };
  }
  _handleCheckboxChange(e, s) {
    this._values = { ...this._values, [e]: s ? "true" : "false" };
  }
  async _handleSave() {
    const e = this.data?.provider, s = this.data?.configuration;
    if (e) {
      this._isSaving = !0, this._errorMessage = null;
      for (const i of this._fields)
        if (i.isRequired && !this._values[i.key]) {
          this._errorMessage = `${i.label} is required`, this._isSaving = !1;
          return;
        }
      try {
        if (s) {
          const { error: i } = await p.updateShippingProvider(s.id, {
            displayName: this._displayName,
            isEnabled: this._isEnabled,
            configuration: this._values
          });
          if (i) {
            this._errorMessage = i.message, this._isSaving = !1;
            return;
          }
        } else {
          const { error: i } = await p.createShippingProvider({
            providerKey: e.key,
            displayName: this._displayName,
            isEnabled: this._isEnabled,
            configuration: this._values
          });
          if (i) {
            this._errorMessage = i.message, this._isSaving = !1;
            return;
          }
        }
        this._isSaving = !1, this.value = { saved: !0 }, this.modalContext?.submit();
      } catch (i) {
        this._errorMessage = i instanceof Error ? i.message : "Failed to save configuration", this._isSaving = !1;
      }
    }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderField(e) {
    const s = this._values[e.key] ?? "";
    switch (e.fieldType) {
      case "Text":
      case "Url":
        return a`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? a`<p class="field-description">${e.description}</p>` : t}
            <uui-input
              id="${e.key}"
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
            ${e.description ? a`<p class="field-description">${e.description}</p>` : t}
            <uui-input
              id="${e.key}"
              type="password"
              .value=${s}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(i) => this._handleValueChange(e.key, i.target.value)}
            ></uui-input>
            ${e.isSensitive && s ? a`<small class="sensitive-note">Value is stored securely</small>` : t}
          </div>
        `;
      case "Textarea":
        return a`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? a`<p class="field-description">${e.description}</p>` : t}
            <uui-textarea
              id="${e.key}"
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
              ?checked=${s === "true"}
              @change=${(i) => this._handleCheckboxChange(e.key, i.target.checked)}
            >
              ${e.label}
            </uui-checkbox>
            ${e.description ? a`<p class="field-description">${e.description}</p>` : t}
          </div>
        `;
      case "Select":
        return a`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? a`<p class="field-description">${e.description}</p>` : t}
            <uui-select
              id="${e.key}"
              .value=${s}
              ?required=${e.isRequired}
              @change=${(i) => this._handleValueChange(e.key, i.target.value)}
            >
              <option value="">Select...</option>
              ${e.options?.map(
          (i) => a`
                  <option value="${i.value}" ?selected=${s === i.value}>
                    ${i.label}
                  </option>
                `
        )}
            </uui-select>
          </div>
        `;
      default:
        return t;
    }
  }
  render() {
    const e = this.data?.provider, s = !!this.data?.configuration;
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
                    ` : t}

                <div class="form-field">
                  <label for="displayName">Display Name *</label>
                  <p class="field-description">
                    The name shown to customers when selecting shipping.
                  </p>
                  <uui-input
                    id="displayName"
                    .value=${this._displayName}
                    required
                    @input=${(i) => this._displayName = i.target.value}
                  ></uui-input>
                </div>

                <div class="form-field checkbox-field">
                  <uui-checkbox
                    id="isEnabled"
                    ?checked=${this._isEnabled}
                    @change=${(i) => this._isEnabled = i.target.checked}
                  >
                    Enabled
                  </uui-checkbox>
                  <p class="field-description">
                    When enabled, this shipping provider will be active and available for use.
                  </p>
                </div>

                ${this._fields.length > 0 ? a`
                      <hr />
                      <h3>Provider Configuration</h3>
                      ${this._fields.map((i) => this._renderField(i))}
                    ` : t}
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
            ${this._isSaving ? a`<uui-loader-circle></uui-loader-circle>` : t}
            ${s ? "Save" : "Install Provider"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
r.styles = h`
    #main {
      padding: var(--uui-size-space-4);
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
  d()
], r.prototype, "_fields", 2);
l([
  d()
], r.prototype, "_values", 2);
l([
  d()
], r.prototype, "_displayName", 2);
l([
  d()
], r.prototype, "_isEnabled", 2);
l([
  d()
], r.prototype, "_isLoading", 2);
l([
  d()
], r.prototype, "_isSaving", 2);
l([
  d()
], r.prototype, "_errorMessage", 2);
r = l([
  v("merchello-shipping-provider-config-modal")
], r);
const y = r;
export {
  r as MerchelloShippingProviderConfigModalElement,
  y as default
};
//# sourceMappingURL=shipping-provider-config-modal.element-jNNNzLKr.js.map
