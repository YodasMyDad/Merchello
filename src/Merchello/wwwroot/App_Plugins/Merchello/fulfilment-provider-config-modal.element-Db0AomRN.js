import { nothing as o, html as t, css as y, state as d, customElement as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as $ } from "@umbraco-cms/backoffice/modal";
import { M as h } from "./merchello-api-BM4-Q40x.js";
var S = Object.defineProperty, M = Object.getOwnPropertyDescriptor, f = (e) => {
  throw TypeError(e);
}, l = (e, i, s, a) => {
  for (var r = a > 1 ? void 0 : a ? M(i, s) : i, u = e.length - 1, c; u >= 0; u--)
    (c = e[u]) && (r = (a ? c(i, s, r) : c(r)) || r);
  return a && r && S(i, s, r), r;
}, m = (e, i, s) => i.has(e) || f("Cannot " + s), v = (e, i, s) => (m(e, i, "read from private field"), i.get(e)), k = (e, i, s) => i.has(e) ? f("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, s), _ = (e, i, s, a) => (m(e, i, "write to private field"), i.set(e, s), s), p;
let n = class extends $ {
  constructor() {
    super(...arguments), this._fields = [], this._values = {}, this._displayName = "", this._isEnabled = !0, this._inventorySyncMode = 0, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._shippingOptions = [], this._serviceMappings = [], k(this, p, !1);
  }
  connectedCallback() {
    super.connectedCallback(), _(this, p, !0), this._loadFields();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), _(this, p, !1);
  }
  async _loadFields() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.provider, i = this.data?.configured;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    this._displayName = i?.displayName ?? e.displayName, this._isEnabled = i?.isEnabled ?? !0, this._inventorySyncMode = i?.inventorySyncMode ?? 0;
    const [s, a] = await Promise.all([
      h.getFulfilmentProviderFields(e.key),
      h.getShippingOptions()
    ]);
    if (v(this, p)) {
      if (s.error) {
        this._errorMessage = s.error.message, this._isLoading = !1;
        return;
      }
      this._fields = s.data ?? [], this._shippingOptions = a.data ?? [], this._values = {};
      for (const r of this._fields)
        this._values[r.key] = r.defaultValue ?? "";
      if (this._serviceMappings = this._shippingOptions.map((r) => ({
        shippingOptionId: r.id,
        shippingOptionName: r.name ?? "Unnamed Option",
        providerServiceCode: ""
      })), i?.configurationId) {
        const r = await h.getFulfilmentProviderConfiguration(i.configurationId);
        if (!v(this, p)) return;
        if (r.data) {
          const u = this._values.ServiceMappings;
          if (u)
            try {
              const c = JSON.parse(u);
              this._serviceMappings = this._serviceMappings.map((g) => ({
                ...g,
                providerServiceCode: c[g.shippingOptionId] ?? ""
              }));
            } catch {
            }
        }
      }
      this._isLoading = !1;
    }
  }
  _handleValueChange(e, i) {
    this._values = { ...this._values, [e]: i };
  }
  _handleCheckboxChange(e, i) {
    this._values = { ...this._values, [e]: i ? "true" : "false" };
  }
  _handleServiceMappingChange(e, i) {
    this._serviceMappings = this._serviceMappings.map(
      (s) => s.shippingOptionId === e ? { ...s, providerServiceCode: i } : s
    );
  }
  _getServiceMappingsJson() {
    const e = {};
    for (const i of this._serviceMappings)
      i.providerServiceCode.trim() && (e[i.shippingOptionId] = i.providerServiceCode.trim());
    return JSON.stringify(e);
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
    const s = {
      ...this._values,
      ServiceMappings: this._getServiceMappingsJson()
    };
    try {
      if (i?.configurationId) {
        const { error: a } = await h.updateFulfilmentProvider(i.configurationId, {
          displayName: this._displayName,
          isEnabled: this._isEnabled,
          inventorySyncMode: this._inventorySyncMode,
          configuration: s
        });
        if (!v(this, p)) return;
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
        if (!v(this, p)) return;
        if (a) {
          this._errorMessage = a.message, this._isSaving = !1;
          return;
        }
      }
      this._isSaving = !1, this.value = { isSaved: !0 }, this.modalContext?.submit();
    } catch (a) {
      if (!v(this, p)) return;
      this._errorMessage = a instanceof Error ? a.message : "Failed to save configuration", this._isSaving = !1;
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
        return t`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : o}
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
        return t`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : o}
            <uui-input
              id="${e.key}"
              type="password"
              .value=${i}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(s) => this._handleValueChange(e.key, s.target.value)}
            ></uui-input>
            ${e.isSensitive && i ? t`<small class="sensitive-note">Value is stored securely</small>` : o}
          </div>
        `;
      case "Textarea":
        return t`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : o}
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
        return t`
          <div class="form-field checkbox-field">
            <uui-checkbox
              id="${e.key}"
              ?checked=${i === "true"}
              @change=${(s) => this._handleCheckboxChange(e.key, s.target.checked)}
            >
              ${e.label}
            </uui-checkbox>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : o}
          </div>
        `;
      case "Select":
        return t`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : o}
            <uui-select
              id="${e.key}"
              .options=${this._getSelectFieldOptions(e, i)}
              ?required=${e.isRequired}
              @change=${(s) => this._handleValueChange(e.key, s.target.value)}
            ></uui-select>
          </div>
        `;
      default:
        return o;
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
                    ` : o}

                <div class="form-field">
                  <label for="displayName">Display Name *</label>
                  <p class="field-description">
                    The name shown in the backoffice for this provider configuration.
                  </p>
                  <uui-input
                    id="displayName"
                    .value=${this._displayName}
                    required
                    @input=${(s) => this._displayName = s.target.value}
                  ></uui-input>
                </div>

                <div class="form-field checkbox-field">
                  <uui-checkbox
                    id="isEnabled"
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
                    .options=${[
      { name: "Full - Replace inventory levels", value: "0", selected: this._inventorySyncMode === 0 },
      { name: "Delta - Apply adjustments", value: "1", selected: this._inventorySyncMode === 1 }
    ]}
                    @change=${(s) => this._inventorySyncMode = parseInt(s.target.value)}
                  ></uui-select>
                </div>

                ${this._fields.length > 0 ? t`
                      <hr />
                      <h3>Provider Configuration</h3>
                      ${this._fields.map((s) => this._renderField(s))}
                    ` : o}

                ${this._shippingOptions.length > 0 ? t`
                      <hr />
                      <h3>Service Level Mapping</h3>
                      <p class="section-description">
                        Map your shipping options to the 3PL provider's service codes. Leave empty to use the provider's default shipping method.
                      </p>
                      <div class="service-mappings">
                        ${this._serviceMappings.map((s) => t`
                          <div class="mapping-row">
                            <span class="mapping-label">${s.shippingOptionName}</span>
                            <uui-input
                              placeholder="Provider service code"
                              .value=${s.providerServiceCode}
                              @input=${(a) => this._handleServiceMappingChange(s.shippingOptionId, a.target.value)}
                            ></uui-input>
                          </div>
                        `)}
                      </div>
                    ` : o}
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
            ${this._isSaving ? t`<uui-loader-circle></uui-loader-circle>` : o}
            ${i ? "Save" : "Install Provider"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
p = /* @__PURE__ */ new WeakMap();
n.styles = y`
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

    .section-description {
      margin: 0 0 var(--uui-size-space-4) 0;
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .service-mappings {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .mapping-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-3);
      align-items: center;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .mapping-label {
      font-weight: 500;
    }

    .mapping-row uui-input {
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
], n.prototype, "_fields", 2);
l([
  d()
], n.prototype, "_values", 2);
l([
  d()
], n.prototype, "_displayName", 2);
l([
  d()
], n.prototype, "_isEnabled", 2);
l([
  d()
], n.prototype, "_inventorySyncMode", 2);
l([
  d()
], n.prototype, "_isLoading", 2);
l([
  d()
], n.prototype, "_isSaving", 2);
l([
  d()
], n.prototype, "_errorMessage", 2);
l([
  d()
], n.prototype, "_shippingOptions", 2);
l([
  d()
], n.prototype, "_serviceMappings", 2);
n = l([
  b("merchello-fulfilment-provider-config-modal")
], n);
const O = n;
export {
  n as MerchelloFulfilmentProviderConfigModalElement,
  O as default
};
//# sourceMappingURL=fulfilment-provider-config-modal.element-Db0AomRN.js.map
