import { nothing as o, html as t, css as $, state as p, customElement as k } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as T, UmbModalBaseElement as C, UMB_MODAL_MANAGER_CONTEXT as M, UMB_CONFIRM_MODAL as w } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as G } from "@umbraco-cms/backoffice/notification";
import { M as g } from "./merchello-api-BT8AWvQk.js";
const b = new T("Merchello.TaxGroup.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var z = Object.defineProperty, S = Object.getOwnPropertyDescriptor, x = (e) => {
  throw TypeError(e);
}, n = (e, i, a, c) => {
  for (var r = c > 1 ? void 0 : c ? S(i, a) : i, _ = e.length - 1, m; _ >= 0; _--)
    (m = e[_]) && (r = (c ? m(i, a, r) : m(r)) || r);
  return c && r && z(i, a, r), r;
}, y = (e, i, a) => i.has(e) || x("Cannot " + a), s = (e, i, a) => (y(e, i, "read from private field"), i.get(e)), f = (e, i, a) => i.has(e) ? x("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, a), v = (e, i, a, c) => (y(e, i, "write to private field"), i.set(e, a), a), l, h, d;
let u = class extends C {
  constructor() {
    super(), this._fields = [], this._values = {}, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._taxGroups = [], this._isLoadingTaxGroups = !1, this._isDeleting = null, f(this, l, !1), f(this, h), f(this, d), this.consumeContext(M, (e) => {
      v(this, h, e);
    }), this.consumeContext(G, (e) => {
      v(this, d, e);
    });
  }
  get _isManualProvider() {
    return this.data?.provider.alias === "manual";
  }
  connectedCallback() {
    super.connectedCallback(), v(this, l, !0), this._loadData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), v(this, l, !1);
  }
  async _loadData() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.provider;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    const { data: i, error: a } = await g.getTaxProviderFields(e.alias);
    if (!s(this, l)) return;
    if (a) {
      this._errorMessage = a.message, this._isLoading = !1;
      return;
    }
    this._fields = i ?? [];
    const c = e.configuration ?? {};
    this._values = {};
    for (const r of this._fields)
      this._values[r.key] = c[r.key] ?? r.defaultValue ?? "";
    this._isLoading = !1, this._isManualProvider && await this._loadTaxGroups();
  }
  async _loadTaxGroups() {
    this._isLoadingTaxGroups = !0;
    const { data: e, error: i } = await g.getTaxGroups();
    if (s(this, l)) {
      if (i) {
        s(this, d)?.peek("danger", {
          data: { headline: "Error loading tax groups", message: i.message }
        }), this._isLoadingTaxGroups = !1;
        return;
      }
      this._taxGroups = e ?? [], this._isLoadingTaxGroups = !1;
    }
  }
  async _handleAddTaxGroup() {
    const i = await s(this, h)?.open(this, b, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    s(this, l) && i?.isCreated && (s(this, d)?.peek("positive", {
      data: {
        headline: "Tax group created",
        message: `"${i.taxGroup?.name}" has been created successfully`
      }
    }), this._loadTaxGroups());
  }
  async _handleEditTaxGroup(e) {
    const a = await s(this, h)?.open(this, b, {
      data: { taxGroup: e }
    })?.onSubmit().catch(() => {
    });
    s(this, l) && a?.isUpdated && (s(this, d)?.peek("positive", {
      data: {
        headline: "Tax group updated",
        message: `"${a.taxGroup?.name}" has been updated successfully`
      }
    }), this._loadTaxGroups());
  }
  async _handleDeleteTaxGroup(e, i) {
    if (e.preventDefault(), e.stopPropagation(), !await s(this, h)?.open(this, w, {
      data: {
        headline: "Delete Tax Group",
        content: `Are you sure you want to delete tax group "${i.name}"? Products using this tax group will need to be reassigned.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    }) || !s(this, l)) return;
    this._isDeleting = i.id;
    const { error: r } = await g.deleteTaxGroup(i.id);
    if (s(this, l)) {
      if (this._isDeleting = null, r) {
        s(this, d)?.peek("danger", {
          data: { headline: "Failed to delete", message: r.message || "Could not delete tax group" }
        });
        return;
      }
      s(this, d)?.peek("positive", {
        data: { headline: "Tax group deleted", message: "The tax group has been deleted successfully" }
      }), this._loadTaxGroups();
    }
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
        const { error: i } = await g.saveTaxProviderSettings(e.alias, {
          configuration: this._values
        });
        if (!s(this, l)) return;
        if (i) {
          this._errorMessage = i.message, this._isSaving = !1;
          return;
        }
        this._isSaving = !1, this.value = { isSaved: !0 }, this.modalContext?.submit();
      } catch (i) {
        if (!s(this, l)) return;
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
              @input=${(a) => this._handleValueChange(e.key, a.target.value)}
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
              @input=${(a) => this._handleValueChange(e.key, a.target.value)}
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
              @input=${(a) => this._handleValueChange(e.key, a.target.value)}
            ></uui-textarea>
          </div>
        `;
      case "Checkbox":
        return t`
          <div class="form-field checkbox-field">
            <uui-checkbox
              id="${e.key}"
              ?checked=${i === "true"}
              @change=${(a) => this._handleCheckboxChange(e.key, a.target.checked)}
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
              .value=${i}
              ?required=${e.isRequired}
              @change=${(a) => this._handleValueChange(e.key, a.target.value)}
            >
              ${e.options?.map(
          (a) => t`
                  <uui-select-option value="${a.value}" ?selected=${i === a.value}>
                    ${a.label}
                  </uui-select-option>
                `
        )}
            </uui-select>
          </div>
        `;
      default:
        return o;
    }
  }
  _formatPercentage(e) {
    return `${e}%`;
  }
  _renderTaxGroupRow(e) {
    const i = this._isDeleting === e.id;
    return t`
      <uui-table-row class="clickable" @click=${() => this._handleEditTaxGroup(e)}>
        <uui-table-cell>
          <span class="tax-group-name">${e.name}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="tax-rate">${this._formatPercentage(e.taxPercentage)}</span>
        </uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${(a) => {
      a.stopPropagation(), this._handleEditTaxGroup(e);
    }}
            >
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="primary"
              color="danger"
              compact
              label="Delete"
              ?disabled=${i}
              @click=${(a) => this._handleDeleteTaxGroup(a, e)}
            >
              <uui-icon name="${i ? "icon-hourglass" : "icon-trash"}"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderTaxGroupsSection() {
    return t`
      <div class="tax-groups-section">
        <div class="section-header">
          <h3>Tax Groups</h3>
          <uui-button
            look="primary"
            color="positive"
            compact
            label="Add Tax Group"
            @click=${this._handleAddTaxGroup}
          >
            <uui-icon name="icon-add"></uui-icon>
            Add
          </uui-button>
        </div>

        <p class="section-description">
          Tax groups define the tax rates applied to products. Click a row to edit, or use the
          buttons to manage geographic rate overrides.
        </p>

        ${this._isLoadingTaxGroups ? t`
              <div class="loading-inline">
                <uui-loader-circle></uui-loader-circle>
                <span>Loading tax groups...</span>
              </div>
            ` : this._taxGroups.length === 0 ? t`
                <div class="empty-state">
                  <uui-icon name="icon-calculator"></uui-icon>
                  <p>No tax groups configured yet.</p>
                  <p class="empty-hint">
                    Create tax groups like "Standard VAT" or "Reduced Rate" to assign to products.
                  </p>
                </div>
              ` : t`
                <div class="table-container">
                  <uui-table class="tax-groups-table">
                    <uui-table-head>
                      <uui-table-head-cell>Name</uui-table-head-cell>
                      <uui-table-head-cell>Default Rate</uui-table-head-cell>
                      <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
                    </uui-table-head>
                    ${this._taxGroups.map((e) => this._renderTaxGroupRow(e))}
                  </uui-table>
                </div>
              `}
      </div>
    `;
  }
  render() {
    const e = this.data?.provider;
    return t`
      <umb-body-layout headline="Configure ${e?.displayName ?? "Provider"}">
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

                ${e?.setupInstructions ? t`
                      <div class="setup-instructions">
                        <uui-icon name="icon-info"></uui-icon>
                        <span>${e.setupInstructions}</span>
                      </div>
                    ` : o}

                ${this._fields.length > 0 ? t`
                      <p class="section-description">
                        Configure the settings for ${e?.displayName ?? "this provider"}.
                      </p>
                      ${this._fields.map((i) => this._renderField(i))}
                    ` : o}

                ${this._isManualProvider ? this._renderTaxGroupsSection() : o}

                ${!this._isManualProvider && this._fields.length === 0 ? t`
                      <p class="no-fields">This provider does not require any configuration.</p>
                    ` : o}
              `}
        </div>

        <div slot="actions">
          <uui-button
            label="Close"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}
          >
            Close
          </uui-button>
          ${this._fields.length > 0 ? t`
                <uui-button
                  label="Save"
                  look="primary"
                  color="positive"
                  @click=${this._handleSave}
                  ?disabled=${this._isLoading || this._isSaving}
                >
                  ${this._isSaving ? t`<uui-loader-circle></uui-loader-circle>` : o}
                  Save
                </uui-button>
              ` : o}
        </div>
      </umb-body-layout>
    `;
  }
};
l = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
u.styles = $`
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

    .setup-instructions {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .setup-instructions uui-icon {
      flex-shrink: 0;
      color: var(--uui-color-interactive);
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

    /* Tax Groups Section */
    .tax-groups-section {
      margin-top: var(--uui-size-space-6);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-3);
    }

    .section-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .table-container {
      overflow-x: auto;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .tax-groups-table {
      width: 100%;
    }

    uui-table-head-cell,
    uui-table-cell {
      white-space: nowrap;
    }

    uui-table-row.clickable {
      cursor: pointer;
    }

    uui-table-row.clickable:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .tax-group-name {
      font-weight: 500;
      color: var(--uui-color-interactive);
    }

    .tax-rate {
      font-family: var(--uui-font-family-monospace, monospace);
    }

    .actions-header {
      text-align: right;
    }

    .actions-cell {
      display: flex;
      gap: var(--uui-size-space-1);
      justify-content: flex-end;
    }

    .loading-inline {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--uui-size-space-5);
      text-align: center;
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 2rem;
      margin-bottom: var(--uui-size-space-3);
      opacity: 0.5;
    }

    .empty-state p {
      margin: 0;
    }

    .empty-hint {
      font-size: 0.875rem;
      margin-top: var(--uui-size-space-2) !important;
    }
  `;
n([
  p()
], u.prototype, "_fields", 2);
n([
  p()
], u.prototype, "_values", 2);
n([
  p()
], u.prototype, "_isLoading", 2);
n([
  p()
], u.prototype, "_isSaving", 2);
n([
  p()
], u.prototype, "_errorMessage", 2);
n([
  p()
], u.prototype, "_taxGroups", 2);
n([
  p()
], u.prototype, "_isLoadingTaxGroups", 2);
n([
  p()
], u.prototype, "_isDeleting", 2);
u = n([
  k("merchello-tax-provider-config-modal")
], u);
const E = u;
export {
  u as MerchelloTaxProviderConfigModalElement,
  E as default
};
//# sourceMappingURL=tax-provider-config-modal.element-CGgun7O-.js.map
