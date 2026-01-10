import { nothing as u, html as t, css as C, state as c, customElement as O } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as $, UmbModalBaseElement as w, UMB_MODAL_MANAGER_CONTEXT as S, UMB_CONFIRM_MODAL as f } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as G } from "@umbraco-cms/backoffice/notification";
import { M as g } from "./merchello-api-D-qg1PlO.js";
const x = new $("Merchello.TaxGroup.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), y = new $("Merchello.ShippingTaxOverride.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
});
var M = Object.defineProperty, z = Object.getOwnPropertyDescriptor, T = (e) => {
  throw TypeError(e);
}, d = (e, i, a, r) => {
  for (var n = r > 1 ? void 0 : r ? z(i, a) : i, v = e.length - 1, m; v >= 0; v--)
    (m = e[v]) && (n = (r ? m(i, a, n) : m(n)) || n);
  return r && n && M(i, a, n), n;
}, k = (e, i, a) => i.has(e) || T("Cannot " + a), s = (e, i, a) => (k(e, i, "read from private field"), i.get(e)), _ = (e, i, a) => i.has(e) ? T("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, a), b = (e, i, a, r) => (k(e, i, "write to private field"), i.set(e, a), a), o, p, h;
let l = class extends w {
  constructor() {
    super(), this._fields = [], this._values = {}, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._activeTab = "product", this._taxGroups = [], this._isLoadingTaxGroups = !1, this._isDeleting = null, this._shippingOverrides = [], this._isLoadingOverrides = !1, this._deletedOverrideIds = [], _(this, o, !1), _(this, p), _(this, h), this.consumeContext(S, (e) => {
      b(this, p, e);
    }), this.consumeContext(G, (e) => {
      b(this, h, e);
    });
  }
  get _isManualProvider() {
    return this.data?.provider.alias === "manual";
  }
  connectedCallback() {
    super.connectedCallback(), b(this, o, !0), this._loadData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), b(this, o, !1);
  }
  async _loadData() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.provider;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    const { data: i, error: a } = await g.getTaxProviderFields(e.alias);
    if (!s(this, o)) return;
    if (a) {
      this._errorMessage = a.message, this._isLoading = !1;
      return;
    }
    this._fields = i ?? [];
    const r = e.configuration ?? {};
    this._values = {};
    for (const n of this._fields)
      this._values[n.key] = r[n.key] ?? n.defaultValue ?? "";
    this._isLoading = !1, this._isManualProvider && await Promise.all([this._loadTaxGroups(), this._loadShippingOverrides()]);
  }
  async _loadTaxGroups() {
    this._isLoadingTaxGroups = !0;
    const { data: e, error: i } = await g.getTaxGroups();
    if (s(this, o)) {
      if (i) {
        s(this, h)?.peek("danger", {
          data: { headline: "Error loading tax groups", message: i.message }
        }), this._isLoadingTaxGroups = !1;
        return;
      }
      this._taxGroups = e ?? [], this._isLoadingTaxGroups = !1;
    }
  }
  async _loadShippingOverrides() {
    this._isLoadingOverrides = !0;
    const { data: e, error: i } = await g.getShippingTaxOverrides();
    if (s(this, o)) {
      if (i) {
        s(this, h)?.peek("danger", {
          data: { headline: "Error loading shipping overrides", message: i.message }
        }), this._isLoadingOverrides = !1;
        return;
      }
      this._shippingOverrides = e ?? [], this._isLoadingOverrides = !1;
    }
  }
  // Tax Group Methods
  async _handleAddTaxGroup() {
    const i = await s(this, p)?.open(this, x, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    s(this, o) && i?.isCreated && (s(this, h)?.peek("positive", {
      data: {
        headline: "Tax group created",
        message: `"${i.taxGroup?.name}" has been created successfully`
      }
    }), this._loadTaxGroups());
  }
  async _handleEditTaxGroup(e) {
    const a = await s(this, p)?.open(this, x, {
      data: { taxGroup: e }
    })?.onSubmit().catch(() => {
    });
    s(this, o) && a?.isUpdated && (s(this, h)?.peek("positive", {
      data: {
        headline: "Tax group updated",
        message: `"${a.taxGroup?.name}" has been updated successfully`
      }
    }), this._loadTaxGroups());
  }
  async _handleDeleteTaxGroup(e, i) {
    if (e.preventDefault(), e.stopPropagation(), !await s(this, p)?.open(this, f, {
      data: {
        headline: "Delete Tax Group",
        content: `Are you sure you want to delete tax group "${i.name}"? Products using this tax group will need to be reassigned.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    }) || !s(this, o)) return;
    this._isDeleting = i.id;
    const { error: n } = await g.deleteTaxGroup(i.id);
    if (s(this, o)) {
      if (this._isDeleting = null, n) {
        s(this, h)?.peek("danger", {
          data: { headline: "Failed to delete", message: n.message || "Could not delete tax group" }
        });
        return;
      }
      s(this, h)?.peek("positive", {
        data: { headline: "Tax group deleted", message: "The tax group has been deleted successfully" }
      }), this._loadTaxGroups();
    }
  }
  // Shipping Override Methods
  async _handleAddOverride() {
    const i = await s(this, p)?.open(this, y, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    s(this, o) && i?.isSaved && this._loadShippingOverrides();
  }
  async _handleEditOverride(e) {
    const a = await s(this, p)?.open(this, y, {
      data: { override: e }
    })?.onSubmit().catch(() => {
    });
    s(this, o) && a?.isSaved && this._loadShippingOverrides();
  }
  async _handleDeleteOverride(e, i) {
    e.preventDefault(), e.stopPropagation();
    const a = i.regionName ? `${i.countryName} - ${i.regionName}` : i.countryName || i.countryCode;
    await s(this, p)?.open(this, f, {
      data: {
        headline: "Delete Shipping Tax Override",
        content: `Are you sure you want to delete the shipping tax override for ${a}?`,
        confirmLabel: "Delete",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    }) && s(this, o) && (this._deletedOverrideIds = [...this._deletedOverrideIds, i.id], this._shippingOverrides = this._shippingOverrides.filter((v) => v.id !== i.id));
  }
  // Config field handlers
  _handleValueChange(e, i) {
    this._values = { ...this._values, [e]: i };
  }
  _handleCheckboxChange(e, i) {
    this._values = { ...this._values, [e]: i ? "true" : "false" };
  }
  // Save handler
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
        if (!s(this, o)) return;
        if (i) {
          this._errorMessage = i.message, this._isSaving = !1;
          return;
        }
        if (this._isManualProvider && this._deletedOverrideIds.length > 0) {
          for (const a of this._deletedOverrideIds) {
            const r = await g.deleteShippingTaxOverride(a);
            r.error && console.error("Failed to delete shipping override:", r.error);
          }
          this._deletedOverrideIds = [];
        }
        this._isSaving = !1, this.value = { isSaved: !0 }, this.modalContext?.submit();
      } catch (i) {
        if (!s(this, o)) return;
        this._errorMessage = i instanceof Error ? i.message : "Failed to save configuration", this._isSaving = !1;
      }
    }
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  // Tab handlers
  _handleTabClick(e) {
    this._activeTab = e;
  }
  // Format helpers
  _formatPercentage(e) {
    return `${e}%`;
  }
  _formatRegion(e) {
    return e.regionName && e.countryName ? `${e.countryName} - ${e.regionName}` : e.countryName ? e.countryName : e.stateOrProvinceCode ? `${e.countryCode}-${e.stateOrProvinceCode}` : e.countryCode;
  }
  // Render: Config field
  _renderField(e) {
    const i = this._values[e.key] ?? "";
    if (this._isManualProvider && (e.key === "shippingTaxGroupId" || e.key === "isShippingTaxable"))
      return u;
    switch (e.fieldType) {
      case "Text":
      case "Url":
        return t`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : u}
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
            ${e.description ? t`<p class="field-description">${e.description}</p>` : u}
            <uui-input
              id="${e.key}"
              type="password"
              .value=${i}
              placeholder="${e.placeholder ?? ""}"
              ?required=${e.isRequired}
              @input=${(a) => this._handleValueChange(e.key, a.target.value)}
            ></uui-input>
            ${e.isSensitive && i ? t`<small class="sensitive-note">Value is stored securely</small>` : u}
          </div>
        `;
      case "Textarea":
        return t`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : u}
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
            ${e.description ? t`<p class="field-description">${e.description}</p>` : u}
          </div>
        `;
      case "Select":
        return t`
          <div class="form-field">
            <label for="${e.key}">${e.label}${e.isRequired ? " *" : ""}</label>
            ${e.description ? t`<p class="field-description">${e.description}</p>` : u}
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
        return u;
    }
  }
  // Render: Tabs
  _renderTabs() {
    return t`
      <uui-tab-group class="tabs">
        <uui-tab
          label="Product Taxes"
          ?active=${this._activeTab === "product"}
          @click=${() => this._handleTabClick("product")}
        >
          Product Taxes
        </uui-tab>
        <uui-tab
          label="Shipping Taxes"
          ?active=${this._activeTab === "shipping"}
          @click=${() => this._handleTabClick("shipping")}
        >
          Shipping Taxes
          ${this._deletedOverrideIds.length > 0 ? t`<uui-badge slot="extra" color="warning" attention>Unsaved</uui-badge>` : u}
        </uui-tab>
      </uui-tab-group>
    `;
  }
  // Render: Product Taxes Tab
  _renderProductTaxesTab() {
    return t`
      <div class="tab-content">
        <div class="info-box">
          <uui-icon name="icon-info"></uui-icon>
          <span>
            Product taxes apply to the items customers purchase. Create tax groups to categorize
            products by rate (e.g., Standard VAT, Reduced Rate, Zero Rated).
          </span>
        </div>

        <div class="section">
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
                    <uui-table class="data-table">
                      <uui-table-head>
                        <uui-table-head-cell>Name</uui-table-head-cell>
                        <uui-table-head-cell>Default Rate</uui-table-head-cell>
                        <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
                      </uui-table-head>
                      ${this._taxGroups.map((e) => this._renderTaxGroupRow(e))}
                    </uui-table>
                  </div>
                  <p class="table-hint">Click a row to edit the tax group and manage regional rate overrides.</p>
                `}
        </div>
      </div>
    `;
  }
  _renderTaxGroupRow(e) {
    const i = this._isDeleting === e.id;
    return t`
      <uui-table-row class="clickable" @click=${() => this._handleEditTaxGroup(e)}>
        <uui-table-cell>
          <span class="name-cell">${e.name}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="rate-cell">${this._formatPercentage(e.taxPercentage)}</span>
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
  // Render: Shipping Taxes Tab
  _renderShippingTaxesTab() {
    const e = this._values.isShippingTaxable === "true", i = this._values.shippingTaxGroupId ?? "", a = [
      { name: "Use proportional rate (weighted average)", value: "", selected: !i },
      ...this._taxGroups.map((r) => ({
        name: `${r.name} (${r.taxPercentage}%)`,
        value: r.id,
        selected: r.id === i
      }))
    ];
    return t`
      <div class="tab-content">
        <div class="info-box">
          <uui-icon name="icon-info"></uui-icon>
          <span>
            Configure how shipping costs are taxed. Regional overrides take precedence over
            global settings below.
          </span>
        </div>

        <!-- Global Settings -->
        <div class="section">
          <h4 class="section-title">Global Settings</h4>

          <div class="form-field checkbox-field">
            <uui-checkbox
              ?checked=${e}
              @change=${(r) => this._handleCheckboxChange("isShippingTaxable", r.target.checked)}
            >
              Tax Shipping
            </uui-checkbox>
            <p class="field-description">Enable tax on shipping costs</p>
          </div>

          ${e ? t`
                <div class="form-field">
                  <label>Default Shipping Tax Group</label>
                  <p class="field-description">
                    Select a tax group for shipping, or leave empty to calculate shipping tax as a
                    weighted average of line item tax rates (EU/UK compliant).
                  </p>
                  ${this._isLoadingTaxGroups ? t`<uui-loader-circle></uui-loader-circle>` : t`
                        <uui-select
                          .options=${a}
                          @change=${(r) => this._handleValueChange("shippingTaxGroupId", r.target.value)}
                        ></uui-select>
                      `}
                </div>
              ` : u}
        </div>

        <!-- Regional Overrides -->
        <div class="section">
          <div class="section-header">
            <div>
              <h4 class="section-title">Regional Overrides</h4>
              <p class="section-description">
                Define which regions tax shipping and which don't. Overrides apply regardless of
                global settings above.
              </p>
            </div>
            <uui-button
              look="primary"
              compact
              label="Add Override"
              @click=${this._handleAddOverride}
              ?disabled=${this._isLoadingOverrides}
            >
              <uui-icon name="icon-add"></uui-icon>
              Add
            </uui-button>
          </div>

          ${this._isLoadingOverrides ? t`
                <div class="loading-inline">
                  <uui-loader-circle></uui-loader-circle>
                  <span>Loading overrides...</span>
                </div>
              ` : this._shippingOverrides.length === 0 ? t`
                  <div class="empty-state">
                    <uui-icon name="icon-globe"></uui-icon>
                    <p>No regional overrides configured.</p>
                    <p class="empty-hint">
                      Add overrides to customize shipping tax rules per country or state.
                    </p>
                  </div>
                ` : t`
                  <div class="table-container">
                    <uui-table class="data-table">
                      <uui-table-head>
                        <uui-table-head-cell>Region</uui-table-head-cell>
                        <uui-table-head-cell>Tax Group</uui-table-head-cell>
                        <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
                      </uui-table-head>
                      ${this._shippingOverrides.map((r) => this._renderOverrideRow(r))}
                    </uui-table>
                  </div>
                `}
        </div>
      </div>
    `;
  }
  _renderOverrideRow(e) {
    return t`
      <uui-table-row>
        <uui-table-cell>
          <div class="region-cell">
            <span class="name-cell">${this._formatRegion(e)}</span>
            ${e.stateOrProvinceCode ? u : t`<span class="country-badge">Country-wide</span>`}
          </div>
        </uui-table-cell>
        <uui-table-cell>
          ${e.shippingTaxGroupId && e.shippingTaxGroupName ? t`<span class="name-cell">${e.shippingTaxGroupName}
                <span class="rate-cell">(${e.shippingTaxGroupPercentage}%)</span></span>` : t`<span class="no-tax">No shipping tax</span>`}
        </uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${() => this._handleEditOverride(e)}
            >
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Delete"
              @click=${(i) => this._handleDeleteOverride(i, e)}
            >
              <uui-icon name="icon-delete"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  // Render: Non-Manual provider content
  _renderNonManualContent() {
    const e = this.data?.provider;
    return t`
      ${e?.setupInstructions ? t`
            <div class="info-box">
              <uui-icon name="icon-info"></uui-icon>
              <span>${e.setupInstructions}</span>
            </div>
          ` : u}

      ${this._fields.length > 0 ? t`
            <p class="section-description">
              Configure the settings for ${e?.displayName ?? "this provider"}.
            </p>
            ${this._fields.map((i) => this._renderField(i))}
          ` : t`
            <p class="no-fields">This provider does not require any configuration.</p>
          `}
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
                    ` : u}

                ${this._isManualProvider ? t`
                      ${this._renderTabs()}
                      ${this._activeTab === "product" ? this._renderProductTaxesTab() : this._renderShippingTaxesTab()}
                    ` : this._renderNonManualContent()}
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
          <uui-button
            label="Save"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isLoading || this._isSaving}
          >
            ${this._isSaving ? t`<uui-loader-circle></uui-loader-circle>` : u}
            Save
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
o = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
l.styles = C`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
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

    /* Tabs */
    .tabs {
      --uui-tab-divider: var(--uui-color-border);
      margin-bottom: var(--uui-size-space-4);
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    /* Info Box */
    .info-box {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      line-height: 1.5;
    }

    .info-box uui-icon {
      flex-shrink: 0;
      color: var(--uui-color-interactive);
    }

    /* Sections */
    .section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--uui-size-space-4);
    }

    .section-header h3,
    .section-header h4 {
      margin: 0;
    }

    .section-title {
      font-size: 0.875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--uui-color-text);
      margin: 0;
    }

    .section-description {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      margin: var(--uui-size-space-1) 0 0 0;
    }

    /* Form fields */
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

    .no-fields {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    /* Tables */
    .table-container {
      overflow-x: auto;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .data-table {
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

    .name-cell {
      font-weight: 500;
      color: var(--uui-color-interactive);
    }

    .rate-cell {
      font-family: var(--uui-font-family-monospace, monospace);
      color: var(--uui-color-text-alt);
    }

    .region-cell {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .country-badge {
      font-size: 0.6875rem;
      padding: 2px 6px;
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
    }

    .no-tax {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .actions-header {
      text-align: right;
    }

    .actions-cell {
      display: flex;
      gap: var(--uui-size-space-1);
      justify-content: flex-end;
    }

    .table-hint {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      margin: var(--uui-size-space-2) 0 0 0;
    }

    /* Loading and empty states */
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
      padding: var(--uui-size-space-6);
      text-align: center;
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
      border: 1px dashed var(--uui-color-border);
      border-radius: var(--uui-border-radius);
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

    /* Actions slot */
    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
d([
  c()
], l.prototype, "_fields", 2);
d([
  c()
], l.prototype, "_values", 2);
d([
  c()
], l.prototype, "_isLoading", 2);
d([
  c()
], l.prototype, "_isSaving", 2);
d([
  c()
], l.prototype, "_errorMessage", 2);
d([
  c()
], l.prototype, "_activeTab", 2);
d([
  c()
], l.prototype, "_taxGroups", 2);
d([
  c()
], l.prototype, "_isLoadingTaxGroups", 2);
d([
  c()
], l.prototype, "_isDeleting", 2);
d([
  c()
], l.prototype, "_shippingOverrides", 2);
d([
  c()
], l.prototype, "_isLoadingOverrides", 2);
d([
  c()
], l.prototype, "_deletedOverrideIds", 2);
l = d([
  O("merchello-tax-provider-config-modal")
], l);
const N = l;
export {
  l as MerchelloTaxProviderConfigModalElement,
  N as default
};
//# sourceMappingURL=tax-provider-config-modal.element-Dcqd84_A.js.map
