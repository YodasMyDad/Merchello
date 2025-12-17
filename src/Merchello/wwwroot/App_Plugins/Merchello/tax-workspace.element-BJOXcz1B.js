import { LitElement as y, html as l, css as T, state as h, customElement as k } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as w } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as G, UMB_MODAL_MANAGER_CONTEXT as M } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as C } from "@umbraco-cms/backoffice/notification";
import { M as _ } from "./merchello-api-DgfpLvp2.js";
import "./merchello-empty-state.element-mt97UoA5.js";
const f = new G("Merchello.TaxGroup.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var E = Object.defineProperty, A = Object.getOwnPropertyDescriptor, x = (e) => {
  throw TypeError(e);
}, c = (e, a, t, i) => {
  for (var n = i > 1 ? void 0 : i ? A(a, t) : a, g = e.length - 1, m; g >= 0; g--)
    (m = e[g]) && (n = (i ? m(a, t, n) : m(n)) || n);
  return i && n && E(a, t, n), n;
}, v = (e, a, t) => a.has(e) || x("Cannot " + t), r = (e, a, t) => (v(e, a, "read from private field"), a.get(e)), b = (e, a, t) => a.has(e) ? x("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, t), p = (e, a, t, i) => (v(e, a, "write to private field"), a.set(e, t), t), d, u, o;
let s = class extends w(y) {
  constructor() {
    super(), this._taxGroups = [], this._isLoading = !0, this._errorMessage = null, this._isDeleting = null, b(this, d), b(this, u), b(this, o, !1), this.consumeContext(M, (e) => {
      p(this, d, e);
    }), this.consumeContext(C, (e) => {
      p(this, u, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), p(this, o, !0), this._loadTaxGroups();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, o, !1);
  }
  async _loadTaxGroups() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: a } = await _.getTaxGroups();
    if (r(this, o)) {
      if (a) {
        this._errorMessage = a.message, this._isLoading = !1;
        return;
      }
      e && (this._taxGroups = e), this._isLoading = !1;
    }
  }
  async _handleAddTaxGroup() {
    const a = await r(this, d)?.open(this, f, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    r(this, o) && a?.isCreated && (r(this, u)?.peek("positive", {
      data: { headline: "Tax group created", message: `"${a.taxGroup?.name}" has been created successfully` }
    }), this._loadTaxGroups());
  }
  async _handleEditTaxGroup(e) {
    const t = await r(this, d)?.open(this, f, {
      data: { taxGroup: e }
    })?.onSubmit().catch(() => {
    });
    r(this, o) && t?.isUpdated && (r(this, u)?.peek("positive", {
      data: { headline: "Tax group updated", message: `"${t.taxGroup?.name}" has been updated successfully` }
    }), this._loadTaxGroups());
  }
  async _handleDelete(e, a) {
    if (e.preventDefault(), e.stopPropagation(), !confirm(
      `Are you sure you want to delete tax group "${a.name}"?

Products using this tax group will need to be reassigned.`
    )) return;
    this._isDeleting = a.id;
    const { error: i } = await _.deleteTaxGroup(a.id);
    if (r(this, o)) {
      if (this._isDeleting = null, i) {
        this._errorMessage = `Failed to delete tax group: ${i.message}`, r(this, u)?.peek("danger", {
          data: { headline: "Failed to delete", message: i.message || "Could not delete tax group" }
        });
        return;
      }
      r(this, u)?.peek("positive", {
        data: { headline: "Tax group deleted", message: "The tax group has been deleted successfully" }
      }), this._loadTaxGroups();
    }
  }
  _renderLoadingState() {
    return l`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return l`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmptyState() {
    return l`
      <merchello-empty-state
        icon="icon-calculator"
        headline="No tax groups configured"
        message="Tax groups define the tax rates applied to your products. Create tax groups like 'Standard VAT' or 'Reduced Rate' to assign to products.">
      </merchello-empty-state>
      <div class="empty-action">
        <uui-button
          look="primary"
          color="positive"
          label="Add Tax Group"
          @click=${this._handleAddTaxGroup}>
          Add Tax Group
        </uui-button>
      </div>
    `;
  }
  _formatPercentage(e) {
    return `${e}%`;
  }
  _renderTaxGroupRow(e) {
    const a = this._isDeleting === e.id;
    return l`
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
              @click=${(t) => {
      t.stopPropagation(), this._handleEditTaxGroup(e);
    }}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="primary"
              color="danger"
              compact
              label="Delete"
              ?disabled=${a}
              @click=${(t) => this._handleDelete(t, e)}>
              <uui-icon name="${a ? "icon-hourglass" : "icon-trash"}"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderTaxGroupsTable() {
    return l`
      <div class="table-container">
        <uui-table class="tax-groups-table">
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Tax Rate</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._taxGroups.map((e) => this._renderTaxGroupRow(e))}
        </uui-table>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._taxGroups.length === 0 ? this._renderEmptyState() : this._renderTaxGroupsTable();
  }
  render() {
    return l`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="tax-groups-container">
          <!-- Header Actions -->
          <div class="header-actions">
            <uui-button
              look="primary"
              color="positive"
              label="Add Tax Group"
              @click=${this._handleAddTaxGroup}>
              Add Tax Group
            </uui-button>
          </div>

          <!-- Info Banner -->
          <div class="info-banner">
            <uui-icon name="icon-info"></uui-icon>
            <span>Tax groups define the tax rates that can be assigned to products. When a customer places an order, the appropriate tax rate is applied based on the product's assigned tax group.</span>
          </div>

          <!-- Content -->
          ${this._renderContent()}
        </div>
      </umb-body-layout>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
o = /* @__PURE__ */ new WeakMap();
s.styles = [
  T`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .tax-groups-container {
        max-width: 100%;
        padding: var(--uui-size-layout-1);
      }

      .header-actions {
        display: flex;
        gap: var(--uui-size-space-2);
        align-items: center;
        justify-content: flex-end;
        margin-bottom: var(--uui-size-space-4);
      }

      .info-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: flex-start;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface-alt);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
      }

      .info-banner uui-icon {
        flex-shrink: 0;
        color: var(--uui-color-interactive);
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

      .loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-6);
      }

      .error-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
      }

      .empty-action {
        display: flex;
        justify-content: center;
        margin-top: var(--uui-size-space-4);
      }
    `
];
c([
  h()
], s.prototype, "_taxGroups", 2);
c([
  h()
], s.prototype, "_isLoading", 2);
c([
  h()
], s.prototype, "_errorMessage", 2);
c([
  h()
], s.prototype, "_isDeleting", 2);
s = c([
  k("merchello-tax-workspace")
], s);
const S = s;
export {
  s as MerchelloTaxWorkspaceElement,
  S as default
};
//# sourceMappingURL=tax-workspace.element-BJOXcz1B.js.map
