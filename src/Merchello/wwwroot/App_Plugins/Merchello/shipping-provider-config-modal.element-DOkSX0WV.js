import { nothing as p, html as s, css as b, state as u, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as $ } from "@umbraco-cms/backoffice/modal";
import { M as g } from "./merchello-api-NdGX4WPd.js";
import { m as f } from "./modal-layout.styles-C2OaUji5.js";
var S = Object.defineProperty, x = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, l = (e, a, i, r) => {
  for (var o = r > 1 ? void 0 : r ? x(a, i) : a, d = e.length - 1, h; d >= 0; d--)
    (h = e[d]) && (o = (r ? h(a, i, o) : h(o)) || o);
  return r && o && S(a, i, o), o;
}, _ = (e, a, i) => a.has(e) || y("Cannot " + i), c = (e, a, i) => (_(e, a, "read from private field"), a.get(e)), k = (e, a, i) => a.has(e) ? y("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, i), v = (e, a, i, r) => (_(e, a, "write to private field"), a.set(e, i), i), n;
let t = class extends $ {
  constructor() {
    super(...arguments), this._fields = [], this._values = {}, this._displayName = "", this._isEnabled = !0, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._visibleSecrets = /* @__PURE__ */ new Set(), k(this, n, !1);
  }
  connectedCallback() {
    super.connectedCallback(), v(this, n, !0), this._loadFields();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), v(this, n, !1);
  }
  async _loadFields() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.provider, a = this.data?.configuration;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    this._displayName = a?.displayName ?? e.displayName, this._isEnabled = a?.isEnabled ?? !0;
    const { data: i, error: r } = await g.getShippingProviderFields(e.key);
    if (!c(this, n)) return;
    if (r) {
      this._errorMessage = r.message, this._isLoading = !1;
      return;
    }
    this._fields = i ?? [];
    const o = a?.configuration ?? {};
    this._values = {};
    for (const d of this._fields)
      this._values[d.key] = o[d.key] ?? d.defaultValue ?? "";
    this._isLoading = !1;
  }
  _handleValueChange(e, a) {
    this._values = { ...this._values, [e]: a };
  }
  _toggleSecretVisibility(e) {
    const a = new Set(this._visibleSecrets);
    a.has(e) ? a.delete(e) : a.add(e), this._visibleSecrets = a;
  }
  _handleCheckboxChange(e, a) {
    this._values = { ...this._values, [e]: a ? "true" : "false" };
  }
  async _handleSave() {
    const e = this.data?.provider, a = this.data?.configuration;
    if (e) {
      this._isSaving = !0, this._errorMessage = null;
      for (const i of this._fields)
        if (i.isRequired && !this._values[i.key]) {
          this._errorMessage = `${i.label} is required`, this._isSaving = !1;
          return;
        }
      try {
        if (a) {
          const { error: i } = await g.updateShippingProvider(a.id, {
            displayName: this._displayName,
            isEnabled: this._isEnabled,
            configuration: this._values
          });
          if (!c(this, n)) return;
          if (i) {
            this._errorMessage = i.message, this._isSaving = !1;
            return;
          }
        } else {
          const { error: i } = await g.createShippingProvider({
            providerKey: e.key,
            displayName: this._displayName,
            isEnabled: this._isEnabled,
            configuration: this._values
          });
          if (!c(this, n)) return;
          if (i) {
            this._errorMessage = i.message, this._isSaving = !1;
            return;
          }
        }
        this._isSaving = !1, this.value = { isSaved: !0 }, this.modalContext?.submit();
      } catch (i) {
        if (!c(this, n)) return;
        this._errorMessage = i instanceof Error ? i.message : "Failed to save configuration", this._isSaving = !1;
      }
    }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _getSelectFieldOptions(e, a) {
    return [
      { name: "Select...", value: "", selected: !a },
      ...e.options?.map((i) => ({
        name: i.label,
        value: i.value,
        selected: a === i.value
      })) ?? []
    ];
  }
  _renderField(e) {
    const a = this._values[e.key] ?? "";
    switch (e.fieldType) {
      case "Text":
      case "Url":
        return s`
          <umb-property-layout
            label="${e.label}"
            description="${e.description ?? ""}"
            ?mandatory=${e.isRequired}>
            <uui-input
              slot="editor"
              label="${e.label}"
              type="${e.fieldType === "Url" ? "url" : "text"}"
              .value=${a}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(i) => this._handleValueChange(e.key, i.target.value)}
            ></uui-input>
          </umb-property-layout>
        `;
      case "Password": {
        const i = this._visibleSecrets.has(e.key);
        return s`
          <umb-property-layout
            label="${e.label}"
            description="${e.description ?? ""}${e.isSensitive && a ? " (stored securely)" : ""}"
            ?mandatory=${e.isRequired}>
            <div slot="editor" class="password-field-wrapper">
              <uui-input
                label="${e.label}"
                type="${i ? "text" : "password"}"
                .value=${a}
                placeholder="${e.placeholder ?? ""}"
                ?required=${e.isRequired}
                @input=${(r) => this._handleValueChange(e.key, r.target.value)}
              ></uui-input>
              <uui-button
                compact
                look="secondary"
                label="${i ? "Hide" : "Show"}"
                @click=${() => this._toggleSecretVisibility(e.key)}
              >
                <uui-icon name="${i ? "icon-eye-slash" : "icon-eye"}"></uui-icon>
              </uui-button>
            </div>
          </umb-property-layout>
        `;
      }
      case "Textarea":
        return s`
          <umb-property-layout
            label="${e.label}"
            description="${e.description ?? ""}"
            ?mandatory=${e.isRequired}>
            <uui-textarea
              slot="editor"
              label="${e.label}"
              .value=${a}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(i) => this._handleValueChange(e.key, i.target.value)}
            ></uui-textarea>
          </umb-property-layout>
        `;
      case "Checkbox":
        return s`
          <umb-property-layout
            label="${e.label}"
            description="${e.description ?? ""}">
            <uui-checkbox
              slot="editor"
              label="${e.label}"
              ?checked=${a === "true"}
              @change=${(i) => this._handleCheckboxChange(e.key, i.target.checked)}
            >
              ${e.label}
            </uui-checkbox>
          </umb-property-layout>
        `;
      case "Select":
        return s`
          <umb-property-layout
            label="${e.label}"
            description="${e.description ?? ""}"
            ?mandatory=${e.isRequired}>
            <uui-select
              slot="editor"
              label="${e.label}"
              .options=${this._getSelectFieldOptions(e, a)}
              ?required=${e.isRequired}
              @change=${(i) => this._handleValueChange(e.key, i.target.value)}
            ></uui-select>
          </umb-property-layout>
        `;
      default:
        return p;
    }
  }
  render() {
    const e = this.data?.provider, a = !!this.data?.configuration;
    return s`
      <umb-body-layout headline="${a ? "Configure" : "Install"} ${e?.displayName ?? "Provider"}">
        <div id="main">
          ${this._isLoading ? s`
                <div class="loading">
                  <uui-loader></uui-loader>
                  <span>Loading configuration...</span>
                </div>
              ` : s`
                ${this._errorMessage ? s`
                      <div class="error-message">
                        <uui-icon name="icon-alert"></uui-icon>
                        ${this._errorMessage}
                      </div>
                    ` : p}

                <uui-box headline="Provider Settings">
                  <umb-property-layout label="Display Name" description="The name shown to customers when selecting shipping" ?mandatory=${!0}>
                    <uui-input
                      slot="editor"
                      label="Display Name"
                      .value=${this._displayName}
                      required
                      @input=${(i) => this._displayName = i.target.value}
                    ></uui-input>
                  </umb-property-layout>

                  <umb-property-layout label="Enabled" description="When enabled, this shipping provider will be active and available for use">
                    <uui-checkbox
                      slot="editor"
                      label="Enabled"
                      ?checked=${this._isEnabled}
                      @change=${(i) => this._isEnabled = i.target.checked}
                    >
                      Enabled
                    </uui-checkbox>
                  </umb-property-layout>
                </uui-box>

                ${this._fields.length > 0 ? s`
                      <uui-box headline="Provider Configuration">
                        ${this._fields.map((i) => this._renderField(i))}
                      </uui-box>
                    ` : p}
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
            label="${a ? "Save" : "Install Provider"}"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isLoading || this._isSaving}
          >
            ${this._isSaving ? s`<uui-loader-circle></uui-loader-circle>` : p}
            ${a ? "Save" : "Install Provider"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
t.styles = [
  f,
  b`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
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
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    umb-property-layout uui-input,
    umb-property-layout uui-textarea,
    umb-property-layout uui-select {
      width: 100%;
    }

    .password-field-wrapper {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
    }

    .password-field-wrapper uui-input {
      flex: 1;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `
];
l([
  u()
], t.prototype, "_fields", 2);
l([
  u()
], t.prototype, "_values", 2);
l([
  u()
], t.prototype, "_displayName", 2);
l([
  u()
], t.prototype, "_isEnabled", 2);
l([
  u()
], t.prototype, "_isLoading", 2);
l([
  u()
], t.prototype, "_isSaving", 2);
l([
  u()
], t.prototype, "_errorMessage", 2);
l([
  u()
], t.prototype, "_visibleSecrets", 2);
t = l([
  m("merchello-shipping-provider-config-modal")
], t);
const q = t;
export {
  t as MerchelloShippingProviderConfigModalElement,
  q as default
};
//# sourceMappingURL=shipping-provider-config-modal.element-DOkSX0WV.js.map
