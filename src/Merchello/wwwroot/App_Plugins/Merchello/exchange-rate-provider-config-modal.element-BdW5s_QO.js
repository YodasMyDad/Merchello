import { nothing as o, html as a, css as m, state as c, customElement as $ } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as y } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-CkNG-K-m.js";
var b = Object.defineProperty, k = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, u = (e, i, s, l) => {
  for (var r = l > 1 ? void 0 : l ? k(i, s) : i, d = e.length - 1, h; d >= 0; d--)
    (h = e[d]) && (r = (l ? h(i, s, r) : h(r)) || r);
  return l && r && b(i, s, r), r;
}, f = (e, i, s) => i.has(e) || _("Cannot " + s), p = (e, i, s) => (f(e, i, "read from private field"), i.get(e)), x = (e, i, s) => i.has(e) ? _("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, s), g = (e, i, s, l) => (f(e, i, "write to private field"), i.set(e, s), s), n;
let t = class extends y {
  constructor() {
    super(...arguments), this._fields = [], this._values = {}, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, x(this, n, !1);
  }
  connectedCallback() {
    super.connectedCallback(), g(this, n, !0), this._loadFields();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, n, !1);
  }
  async _loadFields() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.provider;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    const { data: i, error: s } = await v.getExchangeRateProviderFields(e.alias);
    if (!p(this, n)) return;
    if (s) {
      this._errorMessage = s.message, this._isLoading = !1;
      return;
    }
    this._fields = i ?? [];
    const l = e.configuration ?? {};
    this._values = {};
    for (const r of this._fields)
      this._values[r.key] = l[r.key] ?? r.defaultValue ?? "";
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
        const { error: i } = await v.saveExchangeRateProviderSettings(e.alias, {
          configuration: this._values
        });
        if (!p(this, n)) return;
        if (i) {
          this._errorMessage = i.message, this._isSaving = !1;
          return;
        }
        this._isSaving = !1, this.value = { saved: !0 }, this.modalContext?.submit();
      } catch (i) {
        if (!p(this, n)) return;
        this._errorMessage = i instanceof Error ? i.message : "Failed to save configuration", this._isSaving = !1;
      }
    }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderField(e) {
    const i = this._values[e.key] ?? "";
    switch (e.fieldType) {
      case "Text":
      case "Url":
        return a`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? a`<p class="field-description">${e.description}</p>` : o}
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
            ${e.description ? a`<p class="field-description">${e.description}</p>` : o}
            <uui-input
              id="${e.key}"
              type="password"
              .value=${i}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(s) => this._handleValueChange(e.key, s.target.value)}
            ></uui-input>
            ${e.isSensitive && i ? a`<small class="sensitive-note">Value is stored securely</small>` : o}
          </div>
        `;
      case "Textarea":
        return a`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? a`<p class="field-description">${e.description}</p>` : o}
            <uui-textarea
              id="${e.key}"
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
              ?checked=${i === "true"}
              @change=${(s) => this._handleCheckboxChange(e.key, s.target.checked)}
            >
              ${e.label}
            </uui-checkbox>
            ${e.description ? a`<p class="field-description">${e.description}</p>` : o}
          </div>
        `;
      default:
        return o;
    }
  }
  render() {
    const e = this.data?.provider;
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
                    ` : o}

                ${this._fields.length > 0 ? a`
                      <p class="section-description">
                        Configure the settings for ${e?.displayName ?? "this provider"}.
                      </p>
                      ${this._fields.map((i) => this._renderField(i))}
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
            ${this._isSaving ? a`<uui-loader-circle></uui-loader-circle>` : o}
            Save
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
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
    uui-textarea {
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
], t.prototype, "_fields", 2);
u([
  c()
], t.prototype, "_values", 2);
u([
  c()
], t.prototype, "_isLoading", 2);
u([
  c()
], t.prototype, "_isSaving", 2);
u([
  c()
], t.prototype, "_errorMessage", 2);
t = u([
  $("merchello-exchange-rate-provider-config-modal")
], t);
const z = t;
export {
  t as MerchelloExchangeRateProviderConfigModalElement,
  z as default
};
//# sourceMappingURL=exchange-rate-provider-config-modal.element-BdW5s_QO.js.map
