import { LitElement as E, html as s, nothing as d, css as P, property as z, state as o, customElement as k } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as T } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as ae } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT as H } from "@umbraco-cms/backoffice/notification";
import { M as y } from "./merchello-api-BT8AWvQk.js";
import { q as re, r as se } from "./navigation-CgHIQALx.js";
import { UMB_MODAL_MANAGER_CONTEXT as oe, UMB_CONFIRM_MODAL as ne } from "@umbraco-cms/backoffice/modal";
import { M as le } from "./customer-picker-modal.token-BZSMisS9.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import { a as ue } from "./formatting-6Hz_EImA.js";
import { a as de } from "./store-settings-ueHqTlgT.js";
var ce = Object.defineProperty, he = Object.getOwnPropertyDescriptor, X = (e) => {
  throw TypeError(e);
}, g = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? he(t, i) : t, n = e.length - 1, l; n >= 0; n--)
    (l = e[n]) && (r = (a ? l(t, i, r) : l(r)) || r);
  return a && r && ce(t, i, r), r;
}, K = (e, t, i) => t.has(e) || X("Cannot " + i), _ = (e, t, i) => (K(e, t, "read from private field"), t.get(e)), O = (e, t, i) => t.has(e) ? X("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), I = (e, t, i, a) => (K(e, t, "write to private field"), t.set(e, i), i), x, $, b;
let c = class extends T(E) {
  constructor() {
    super(), this.segmentId = "", this._members = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._removingIds = /* @__PURE__ */ new Set(), O(this, x), O(this, $), O(this, b, !1), this.consumeContext(oe, (e) => {
      I(this, x, e);
    }), this.consumeContext(H, (e) => {
      I(this, $, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), I(this, b, !0), this.segmentId && this._loadMembers();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), I(this, b, !1);
  }
  updated(e) {
    e.has("segmentId") && this.segmentId && (this._page = 1, this._loadMembers());
  }
  async _loadMembers() {
    if (!this.segmentId) return;
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await y.getSegmentMembers(
      this.segmentId,
      this._page,
      this._pageSize
    );
    if (_(this, b)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      e && (this._members = e.items, this._totalItems = e.totalItems, this._totalPages = e.totalPages), this._isLoading = !1;
    }
  }
  async _handleAddMembers() {
    const e = this._members.map((a) => a.customerId), i = await _(this, x)?.open(this, le, {
      data: {
        excludeCustomerIds: e,
        multiSelect: !0
      }
    })?.onSubmit().catch(() => {
    });
    if (_(this, b) && i?.selectedCustomerIds?.length) {
      const { error: a } = await y.addSegmentMembers(this.segmentId, {
        customerIds: i.selectedCustomerIds
      });
      if (a) {
        _(this, $)?.peek("danger", {
          data: { headline: "Add failed", message: a.message }
        });
        return;
      }
      _(this, $)?.peek("positive", {
        data: {
          headline: "Members added",
          message: `${i.selectedCustomerIds.length} customer(s) added to the segment.`
        }
      }), this._loadMembers(), this._dispatchMembersChanged();
    }
  }
  async _handleRemoveMember(e) {
    const t = e.customerName || e.customerEmail;
    if (!await _(this, x)?.open(this, ne, {
      data: {
        headline: "Remove Member",
        content: `Are you sure you want to remove ${t} from this segment?`,
        confirmLabel: "Remove",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    }) || !_(this, b)) return;
    this._removingIds = /* @__PURE__ */ new Set([...this._removingIds, e.customerId]);
    const { error: r } = await y.removeSegmentMembers(this.segmentId, {
      customerIds: [e.customerId]
    });
    if (_(this, b)) {
      if (this._removingIds = new Set([...this._removingIds].filter((n) => n !== e.customerId)), r) {
        _(this, $)?.peek("danger", {
          data: { headline: "Remove failed", message: r.message }
        });
        return;
      }
      _(this, $)?.peek("positive", {
        data: { headline: "Member removed", message: "Customer has been removed from the segment." }
      }), this._loadMembers(), this._dispatchMembersChanged();
    }
  }
  _dispatchMembersChanged() {
    this.dispatchEvent(new CustomEvent("members-changed", { bubbles: !0, composed: !0 }));
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._loadMembers();
  }
  _getPaginationState() {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages
    };
  }
  _formatDate(e) {
    return new Date(e).toLocaleDateString(void 0, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }
  _renderLoadingState() {
    return s`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return s`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmptyState() {
    return s`
      <merchello-empty-state
        icon="icon-users"
        headline="No members yet"
        message="Add customers to this segment to start grouping them.">
        <uui-button
          slot="action"
          look="primary"
          label="Add Customers"
          @click=${this._handleAddMembers}>
          Add Customers
        </uui-button>
      </merchello-empty-state>
    `;
  }
  _renderMemberRow(e) {
    const t = this._removingIds.has(e.customerId);
    return s`
      <uui-table-row>
        <uui-table-cell>
          <span class="member-name">${e.customerName || "—"}</span>
        </uui-table-cell>
        <uui-table-cell>${e.customerEmail}</uui-table-cell>
        <uui-table-cell>${this._formatDate(e.dateAdded)}</uui-table-cell>
        <uui-table-cell>${e.notes || "—"}</uui-table-cell>
        <uui-table-cell>
          <uui-button
            look="secondary"
            compact
            label="Remove"
            ?disabled=${t}
            @click=${() => this._handleRemoveMember(e)}>
            ${t ? s`<uui-loader-circle></uui-loader-circle>` : s`<uui-icon name="icon-delete"></uui-icon>`}
          </uui-button>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderMembersTable() {
    return s`
      <div class="table-container">
        <uui-table class="members-table">
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Email</uui-table-head-cell>
            <uui-table-head-cell>Added</uui-table-head-cell>
            <uui-table-head-cell>Notes</uui-table-head-cell>
            <uui-table-head-cell class="actions-header"></uui-table-head-cell>
          </uui-table-head>
          ${this._members.map((e) => this._renderMemberRow(e))}
        </uui-table>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._members.length === 0 ? this._renderEmptyState() : this._renderMembersTable();
  }
  render() {
    return s`
      <div class="members-container">
        <!-- Header -->
        <div class="header-actions">
          <uui-button
            look="primary"
            label="Add Customers"
            @click=${this._handleAddMembers}>
            <uui-icon name="icon-add"></uui-icon>
            Add Customers
          </uui-button>
        </div>

        <!-- Content -->
        ${this._renderContent()}

        <!-- Pagination -->
        ${this._members.length > 0 && !this._isLoading ? s`
              <merchello-pagination
                .state=${this._getPaginationState()}
                .disabled=${this._isLoading}
                @page-change=${this._handlePageChange}>
              </merchello-pagination>
            ` : d}
      </div>
    `;
  }
};
x = /* @__PURE__ */ new WeakMap();
$ = /* @__PURE__ */ new WeakMap();
b = /* @__PURE__ */ new WeakMap();
c.styles = [
  P`
      :host {
        display: block;
      }

      .members-container {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .header-actions {
        display: flex;
        justify-content: flex-end;
      }

      .table-container {
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .members-table {
        width: 100%;
      }

      uui-table-head-cell,
      uui-table-cell {
        white-space: nowrap;
      }

      .member-name {
        font-weight: 500;
      }

      .actions-header {
        width: 60px;
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
      }
    `
];
g([
  z({ type: String })
], c.prototype, "segmentId", 2);
g([
  o()
], c.prototype, "_members", 2);
g([
  o()
], c.prototype, "_isLoading", 2);
g([
  o()
], c.prototype, "_errorMessage", 2);
g([
  o()
], c.prototype, "_page", 2);
g([
  o()
], c.prototype, "_pageSize", 2);
g([
  o()
], c.prototype, "_totalItems", 2);
g([
  o()
], c.prototype, "_totalPages", 2);
g([
  o()
], c.prototype, "_removingIds", 2);
c = g([
  k("merchello-segment-members-table")
], c);
var me = Object.defineProperty, pe = Object.getOwnPropertyDescriptor, J = (e) => {
  throw TypeError(e);
}, M = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? pe(t, i) : t, n = e.length - 1, l; n >= 0; n--)
    (l = e[n]) && (r = (a ? l(t, i, r) : l(r)) || r);
  return a && r && me(t, i, r), r;
}, Q = (e, t, i) => t.has(e) || J("Cannot " + i), Y = (e, t, i) => (Q(e, t, "read from private field"), i ? i.call(e) : t.get(e)), F = (e, t, i) => t.has(e) ? J("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), L = (e, t, i, a) => (Q(e, t, "write to private field"), t.set(e, i), i), W = (e, t, i, a) => ({
  set _(r) {
    L(e, t, r);
  },
  get _() {
    return Y(e, t, a);
  }
}), D, A;
let C = class extends T(E) {
  constructor() {
    super(...arguments), this.criteria = [], this.matchMode = "All", this._criteriaRows = [], this._availableFields = [], this._isLoadingFields = !0, F(this, D, !1), F(this, A, 0);
  }
  connectedCallback() {
    super.connectedCallback(), L(this, D, !0), this._loadAvailableFields(), this._initializeCriteriaRows();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), L(this, D, !1);
  }
  updated(e) {
    e.has("criteria") && this._initializeCriteriaRows();
  }
  _initializeCriteriaRows() {
    this._criteriaRows = (this.criteria || []).map((e) => ({
      ...e,
      id: `row-${W(this, A)._++}`
    }));
  }
  async _loadAvailableFields() {
    this._isLoadingFields = !0;
    const { data: e, error: t } = await y.getCriteriaFields();
    if (Y(this, D)) {
      if (t) {
        this._isLoadingFields = !1;
        return;
      }
      this._availableFields = e ?? [], this._isLoadingFields = !1;
    }
  }
  _getFieldMetadata(e) {
    return this._availableFields.find((t) => t.field === e);
  }
  _getOperatorsForField(e) {
    return this._getFieldMetadata(e)?.supportedOperators ?? [];
  }
  _getOperatorLabel(e) {
    return {
      Equals: "equals",
      NotEquals: "does not equal",
      GreaterThan: "is greater than",
      GreaterThanOrEqual: "is at least",
      LessThan: "is less than",
      LessThanOrEqual: "is at most",
      Between: "is between",
      Contains: "contains",
      NotContains: "does not contain",
      StartsWith: "starts with",
      EndsWith: "ends with",
      IsEmpty: "is empty",
      IsNotEmpty: "is not empty"
    }[e] ?? e;
  }
  _addCriterion() {
    const e = this._availableFields[0]?.field ?? "OrderCount", i = this._getOperatorsForField(e)[0] ?? "Equals", a = {
      id: `row-${W(this, A)._++}`,
      field: e,
      operator: i,
      value: null,
      value2: void 0
    };
    this._criteriaRows = [...this._criteriaRows, a], this._emitChange();
  }
  _removeCriterion(e) {
    this._criteriaRows = this._criteriaRows.filter((t) => t.id !== e), this._emitChange();
  }
  _updateCriterion(e, t) {
    this._criteriaRows = this._criteriaRows.map((i) => {
      if (i.id !== e) return i;
      const a = { ...i, ...t };
      if (t.field && t.field !== i.field) {
        const r = this._getOperatorsForField(t.field);
        a.operator = r[0] ?? "Equals", a.value = null, a.value2 = void 0;
      }
      return t.operator && t.operator !== "Between" && (a.value2 = void 0), a;
    }), this._emitChange();
  }
  _emitChange() {
    const e = this._criteriaRows.map(({ field: t, operator: i, value: a, value2: r }) => ({
      field: t,
      operator: i,
      value: a,
      value2: r
    }));
    this.dispatchEvent(
      new CustomEvent("criteria-changed", {
        detail: { criteria: e },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _renderFieldSelect(e) {
    return s`
      <uui-select
        .options=${this._availableFields.map((t) => ({
      name: t.label,
      value: t.field,
      selected: t.field === e.field
    }))}
        @change=${(t) => {
      const i = t.target;
      this._updateCriterion(e.id, { field: i.value });
    }}>
      </uui-select>
    `;
  }
  _renderOperatorSelect(e) {
    const t = this._getOperatorsForField(e.field);
    return s`
      <uui-select
        .options=${t.map((i) => ({
      name: this._getOperatorLabel(i),
      value: i,
      selected: i === e.operator
    }))}
        @change=${(i) => {
      const a = i.target;
      this._updateCriterion(e.id, { operator: a.value });
    }}>
      </uui-select>
    `;
  }
  _renderValueInput(e) {
    if (e.operator === "IsEmpty" || e.operator === "IsNotEmpty")
      return d;
    const i = this._getFieldMetadata(e.field)?.valueType ?? "String", a = i === "Number" || i === "Currency" ? "number" : i === "Date" ? "date" : "text", r = (n, l) => s`
      <uui-input
        type=${a}
        .value=${n ?? ""}
        @input=${(ie) => {
      const R = ie.target;
      let N = R.value;
      a === "number" && (N = R.value ? Number(R.value) : null), l(N);
    }}
        placeholder=${i === "Currency" ? "Amount" : i === "Date" ? "Select date" : "Value"}>
      </uui-input>
    `;
    return e.operator === "Between" ? s`
        <div class="between-inputs">
          ${r(e.value, (n) => this._updateCriterion(e.id, { value: n }))}
          <span class="between-and">and</span>
          ${r(e.value2, (n) => this._updateCriterion(e.id, { value2: n }))}
        </div>
      ` : r(e.value, (n) => this._updateCriterion(e.id, { value: n }));
  }
  _renderCriterionRow(e, t) {
    return s`
      <div class="criterion-row">
        <span class="row-prefix">${t === 0 ? "Where" : this.matchMode === "All" ? "AND" : "OR"}</span>
        <div class="row-inputs">
          ${this._renderFieldSelect(e)}
          ${this._renderOperatorSelect(e)}
          ${this._renderValueInput(e)}
        </div>
        <uui-button
          compact
          look="secondary"
          label="Remove"
          @click=${() => this._removeCriterion(e.id)}>
          <uui-icon name="icon-delete"></uui-icon>
        </uui-button>
      </div>
    `;
  }
  render() {
    return this._isLoadingFields ? s`<div class="loading"><uui-loader></uui-loader></div>` : s`
      <uui-box headline="Criteria Rules">
        <div class="criteria-builder">
          <p class="description">
            Define the conditions that customers must match to be included in this segment.
            ${this.matchMode === "All" ? "All conditions must be met (AND)." : "Any condition can be met (OR)."}
          </p>

          ${this._criteriaRows.length === 0 ? s`<p class="empty-hint">No criteria defined. Add conditions to filter customers.</p>` : s`
                <div class="criteria-list">
                  ${this._criteriaRows.map((e, t) => this._renderCriterionRow(e, t))}
                </div>
              `}

          <div class="add-criterion">
            <uui-button
              look="primary"
              label="Add Condition"
              @click=${this._addCriterion}>
              <uui-icon name="icon-add"></uui-icon>
              Add Condition
            </uui-button>
          </div>
        </div>
      </uui-box>
    `;
  }
};
D = /* @__PURE__ */ new WeakMap();
A = /* @__PURE__ */ new WeakMap();
C.styles = [
  P`
      :host {
        display: block;
      }

      .criteria-builder {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .description {
        color: var(--uui-color-text-alt);
        margin: 0;
      }

      .empty-hint {
        color: var(--uui-color-text-alt);
        font-style: italic;
        margin: 0;
      }

      .criteria-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .criterion-row {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
      }

      .row-prefix {
        min-width: 50px;
        font-weight: 600;
        color: var(--uui-color-text-alt);
        text-transform: uppercase;
        font-size: var(--uui-type-small-size);
      }

      .row-inputs {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        flex: 1;
        flex-wrap: wrap;
      }

      .row-inputs uui-select {
        min-width: 150px;
      }

      .row-inputs uui-input {
        min-width: 120px;
      }

      .between-inputs {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .between-and {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      .add-criterion {
        margin-top: var(--uui-size-space-2);
      }

      .loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-4);
      }
    `
];
M([
  z({ type: Array })
], C.prototype, "criteria", 2);
M([
  z({ type: String })
], C.prototype, "matchMode", 2);
M([
  o()
], C.prototype, "_criteriaRows", 2);
M([
  o()
], C.prototype, "_availableFields", 2);
M([
  o()
], C.prototype, "_isLoadingFields", 2);
C = M([
  k("merchello-segment-criteria-builder")
], C);
var _e = Object.defineProperty, ge = Object.getOwnPropertyDescriptor, Z = (e) => {
  throw TypeError(e);
}, p = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? ge(t, i) : t, n = e.length - 1, l; n >= 0; n--)
    (l = e[n]) && (r = (a ? l(t, i, r) : l(r)) || r);
  return a && r && _e(t, i, r), r;
}, j = (e, t, i) => t.has(e) || Z("Cannot " + i), q = (e, t, i) => (j(e, t, "read from private field"), t.get(e)), ve = (e, t, i) => t.has(e) ? Z("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), B = (e, t, i, a) => (j(e, t, "write to private field"), t.set(e, i), i), S;
let u = class extends T(E) {
  constructor() {
    super(...arguments), this.segmentId = "", this._customers = [], this._statistics = null, this._isLoading = !0, this._isLoadingStats = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, ve(this, S, !1);
  }
  connectedCallback() {
    super.connectedCallback(), B(this, S, !0), this.segmentId && (this._loadPreview(), this._loadStatistics());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), B(this, S, !1);
  }
  updated(e) {
    e.has("segmentId") && this.segmentId && (this._page = 1, this._loadPreview(), this._loadStatistics());
  }
  async _loadPreview() {
    if (!this.segmentId) return;
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await y.previewSegmentMatches(
      this.segmentId,
      this._page,
      this._pageSize
    );
    if (q(this, S)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      e && (this._customers = e.items, this._totalItems = e.totalItems, this._totalPages = e.totalPages), this._isLoading = !1;
    }
  }
  async _loadStatistics() {
    if (!this.segmentId) return;
    this._isLoadingStats = !0;
    const { data: e, error: t } = await y.getSegmentStatistics(this.segmentId);
    if (q(this, S)) {
      if (t) {
        this._isLoadingStats = !1;
        return;
      }
      this._statistics = e ?? null, this._isLoadingStats = !1;
    }
  }
  _handleRefresh() {
    this._loadPreview(), this._loadStatistics();
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._loadPreview();
  }
  _getPaginationState() {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages
    };
  }
  _formatCurrency(e) {
    return ue(e, de());
  }
  _renderStatisticsCard() {
    return this._isLoadingStats || !this._statistics ? s`
        <uui-box>
          <div class="stats-loading"><uui-loader></uui-loader></div>
        </uui-box>
      ` : s`
      <uui-box>
        <div class="statistics-grid">
          <div class="stat-card">
            <div class="stat-value">${this._statistics.totalMembers}</div>
            <div class="stat-label">Total Members</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._statistics.activeMembers}</div>
            <div class="stat-label">Active Members</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._formatCurrency(this._statistics.totalRevenue)}</div>
            <div class="stat-label">Total Revenue</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._formatCurrency(this._statistics.averageOrderValue)}</div>
            <div class="stat-label">Average Order Value</div>
          </div>
        </div>
      </uui-box>
    `;
  }
  _renderLoadingState() {
    return s`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return s`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmptyState() {
    return s`
      <merchello-empty-state
        icon="icon-users"
        headline="No matching customers"
        message="No customers currently match the defined criteria.">
      </merchello-empty-state>
    `;
  }
  _renderCustomerRow(e) {
    return s`
      <uui-table-row>
        <uui-table-cell>
          <span class="customer-name">${e.name || "—"}</span>
        </uui-table-cell>
        <uui-table-cell>${e.email}</uui-table-cell>
        <uui-table-cell class="center">${e.orderCount}</uui-table-cell>
        <uui-table-cell class="right">${this._formatCurrency(e.totalSpend)}</uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderCustomersTable() {
    return s`
      <div class="table-container">
        <uui-table class="customers-table">
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Email</uui-table-head-cell>
            <uui-table-head-cell class="center">Orders</uui-table-head-cell>
            <uui-table-head-cell class="right">Total Spend</uui-table-head-cell>
          </uui-table-head>
          ${this._customers.map((e) => this._renderCustomerRow(e))}
        </uui-table>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._customers.length === 0 ? this._renderEmptyState() : this._renderCustomersTable();
  }
  render() {
    return s`
      <div class="preview-container">
        <!-- Statistics -->
        ${this._renderStatisticsCard()}

        <!-- Header -->
        <div class="header-actions">
          <span class="matching-count">
            ${this._totalItems} customer${this._totalItems !== 1 ? "s" : ""} match${this._totalItems === 1 ? "es" : ""} the criteria
          </span>
          <uui-button
            look="secondary"
            label="Refresh"
            @click=${this._handleRefresh}
            ?disabled=${this._isLoading}>
            <uui-icon name="icon-sync"></uui-icon>
            Refresh
          </uui-button>
        </div>

        <!-- Content -->
        ${this._renderContent()}

        <!-- Pagination -->
        ${this._customers.length > 0 && !this._isLoading ? s`
              <merchello-pagination
                .state=${this._getPaginationState()}
                .disabled=${this._isLoading}
                @page-change=${this._handlePageChange}>
              </merchello-pagination>
            ` : d}
      </div>
    `;
  }
};
S = /* @__PURE__ */ new WeakMap();
u.styles = [
  P`
      :host {
        display: block;
      }

      .preview-container {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .statistics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--uui-size-space-4);
      }

      .stat-card {
        text-align: center;
        padding: var(--uui-size-space-3);
      }

      .stat-value {
        font-size: var(--uui-type-h3-size);
        font-weight: 700;
        color: var(--uui-color-interactive);
      }

      .stat-label {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        margin-top: var(--uui-size-space-1);
      }

      .stats-loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-4);
      }

      .header-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .matching-count {
        font-weight: 500;
      }

      .table-container {
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .customers-table {
        width: 100%;
      }

      uui-table-head-cell,
      uui-table-cell {
        white-space: nowrap;
      }

      uui-table-head-cell.center,
      uui-table-cell.center {
        text-align: center;
      }

      uui-table-head-cell.right,
      uui-table-cell.right {
        text-align: right;
      }

      .customer-name {
        font-weight: 500;
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
      }
    `
];
p([
  z({ type: String })
], u.prototype, "segmentId", 2);
p([
  o()
], u.prototype, "_customers", 2);
p([
  o()
], u.prototype, "_statistics", 2);
p([
  o()
], u.prototype, "_isLoading", 2);
p([
  o()
], u.prototype, "_isLoadingStats", 2);
p([
  o()
], u.prototype, "_errorMessage", 2);
p([
  o()
], u.prototype, "_page", 2);
p([
  o()
], u.prototype, "_pageSize", 2);
p([
  o()
], u.prototype, "_totalItems", 2);
p([
  o()
], u.prototype, "_totalPages", 2);
u = p([
  k("merchello-segment-preview")
], u);
var be = Object.defineProperty, fe = Object.getOwnPropertyDescriptor, ee = (e) => {
  throw TypeError(e);
}, w = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? fe(t, i) : t, n = e.length - 1, l; n >= 0; n--)
    (l = e[n]) && (r = (a ? l(t, i, r) : l(r)) || r);
  return a && r && be(t, i, r), r;
}, te = (e, t, i) => t.has(e) || ee("Cannot " + i), h = (e, t, i) => (te(e, t, "read from private field"), i ? i.call(e) : t.get(e)), U = (e, t, i) => t.has(e) ? ee("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), V = (e, t, i, a) => (te(e, t, "write to private field"), t.set(e, i), i), v, f;
function G() {
  return document.createElement("div");
}
let m = class extends T(E) {
  constructor() {
    super(), this._formData = {}, this._isSaving = !1, this._activePath = "tab/details", this._routerPath = "", this._fieldErrors = {}, this._isNew = !0, U(this, v), U(this, f), this._routes = [
      { path: "tab/details", component: G },
      { path: "tab/preview", component: G },
      { path: "", redirectTo: "tab/details" }
    ], this.consumeContext(ae, (e) => {
      V(this, v, e), this._isNew = h(this, v).isNew, this.observe(h(this, v).segment, (t) => {
        this._segment = t, this._isNew = h(this, v)?.isNew ?? !0, t && (this._formData = { ...t });
      });
    }), this.consumeContext(H, (e) => {
      V(this, f, e);
    });
  }
  _handleNameChange(e) {
    const t = e.target;
    this._formData = { ...this._formData, name: t.value }, this._clearFieldError("name");
  }
  _handleDescriptionChange(e) {
    const t = e.target;
    this._formData = { ...this._formData, description: t.value || null };
  }
  _handleTypeChange(e) {
    const i = e.target.value;
    this._formData = {
      ...this._formData,
      segmentType: i,
      // Clear criteria if switching to manual
      criteria: i === "Manual" ? null : this._formData.criteria
    };
  }
  _handleMatchModeChange(e) {
    const t = e.target;
    this._formData = { ...this._formData, matchMode: t.value };
  }
  _handleActiveChange(e) {
    const t = e.target;
    this._formData = { ...this._formData, isActive: t.checked };
  }
  _handleCriteriaChanged(e) {
    this._formData = { ...this._formData, criteria: e.detail.criteria };
  }
  _onRouterInit(e) {
    this._routerPath = e.target.absoluteRouterPath ?? "";
  }
  _onRouterChange(e) {
    this._activePath = e.target.localActiveViewPath || "";
  }
  _clearFieldError(e) {
    if (this._fieldErrors[e]) {
      const { [e]: t, ...i } = this._fieldErrors;
      this._fieldErrors = i;
    }
  }
  _validate() {
    const e = {};
    return this._formData.name?.trim() || (e.name = "Name is required"), this._formData.segmentType === "Automated" && (!this._formData.criteria || this._formData.criteria.length === 0) && (e.criteria = "At least one criterion is required for automated segments"), this._fieldErrors = e, Object.keys(e).length === 0;
  }
  async _handleSave() {
    if (!this._validate()) {
      h(this, f)?.peek("warning", {
        data: { headline: "Validation error", message: "Please fix the errors before saving." }
      });
      return;
    }
    this._isSaving = !0;
    try {
      if (this._isNew) {
        const e = {
          name: this._formData.name,
          description: this._formData.description,
          segmentType: this._formData.segmentType,
          criteria: this._formData.criteria,
          matchMode: this._formData.matchMode
        }, { data: t, error: i } = await y.createCustomerSegment(e);
        if (i) {
          h(this, f)?.peek("danger", {
            data: { headline: "Create failed", message: i.message }
          });
          return;
        }
        t && (h(this, v)?.updateSegment(t), h(this, f)?.peek("positive", {
          data: { headline: "Segment created", message: `"${t.name}" has been created.` }
        }), re(t.id));
      } else {
        const e = {
          name: this._formData.name,
          description: this._formData.description,
          criteria: this._formData.criteria,
          matchMode: this._formData.matchMode,
          isActive: this._formData.isActive
        }, { data: t, error: i } = await y.updateCustomerSegment(this._segment.id, e);
        if (i) {
          h(this, f)?.peek("danger", {
            data: { headline: "Update failed", message: i.message }
          });
          return;
        }
        t && (h(this, v)?.updateSegment(t), h(this, f)?.peek("positive", {
          data: { headline: "Segment saved", message: "Changes have been saved." }
        }));
      }
    } finally {
      this._isSaving = !1;
    }
  }
  _hasDetailsErrors() {
    return !!this._fieldErrors.name || !!this._fieldErrors.criteria;
  }
  _renderTabs() {
    const e = this._formData.segmentType === "Automated";
    return s`
      <uui-tab-group slot="header">
        <uui-tab
          label="Details"
          href="${this._routerPath}/tab/details"
          ?active=${this._activePath.includes("tab/details")}>
          Details
          ${this._hasDetailsErrors() ? s`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : d}
        </uui-tab>
        ${e && !this._isNew ? s`
          <uui-tab
            label="Preview"
            href="${this._routerPath}/tab/preview"
            ?active=${this._activePath.includes("tab/preview")}>
            Preview
          </uui-tab>
        ` : d}
      </uui-tab-group>
    `;
  }
  _renderActiveTabContent() {
    return this._activePath.includes("tab/preview") ? this._renderPreviewTab() : this._renderDetailsTab();
  }
  _renderDetailsTab() {
    return s`
      <uui-box headline="Basic Information">
        <umb-property-layout label="Description" description="Optional description for this segment">
          <uui-textarea
            slot="editor"
            .value=${this._formData.description || ""}
            @input=${this._handleDescriptionChange}
            placeholder="Describe the purpose of this segment...">
          </uui-textarea>
        </umb-property-layout>

        <umb-property-layout
          label="Segment Type"
          description="Manual segments let you hand-pick specific customers (e.g., VIPs, beta testers). Automated segments automatically include customers based on criteria rules."
          ?mandatory=${this._isNew}>
          <uui-select
            slot="editor"
            .options=${[
      { name: "Manual", value: "Manual", selected: this._formData.segmentType === "Manual" },
      { name: "Automated", value: "Automated", selected: this._formData.segmentType === "Automated" }
    ]}
            @change=${this._handleTypeChange}
            ?disabled=${!this._isNew}>
          </uui-select>
        </umb-property-layout>

        ${this._formData.segmentType === "Manual" && this._isNew ? s`
          <div class="helper-text">
            After saving, you'll be able to add customers to this segment below.
          </div>
        ` : d}

        ${this._formData.segmentType === "Automated" ? s`
          <umb-property-layout
            label="Match Mode"
            description="How criteria rules are combined">
            <uui-select
              slot="editor"
              .options=${[
      { name: "All conditions (AND)", value: "All", selected: this._formData.matchMode === "All" },
      { name: "Any condition (OR)", value: "Any", selected: this._formData.matchMode === "Any" }
    ]}
              @change=${this._handleMatchModeChange}>
            </uui-select>
          </umb-property-layout>
        ` : d}
      </uui-box>

      ${this._formData.segmentType === "Automated" ? s`
        <merchello-segment-criteria-builder
          .criteria=${this._formData.criteria || []}
          .matchMode=${this._formData.matchMode || "All"}
          @criteria-changed=${this._handleCriteriaChanged}>
        </merchello-segment-criteria-builder>
        ${this._fieldErrors.criteria ? s`
          <div class="error-message">${this._fieldErrors.criteria}</div>
        ` : d}
      ` : d}

      ${this._formData.segmentType === "Manual" && !this._isNew && this._segment?.id ? s`
        <uui-box headline="Members (${this._segment?.memberCount ?? 0})">
          <merchello-segment-members-table
            .segmentId=${this._segment.id}
            @members-changed=${() => h(this, v)?.reloadSegment()}>
          </merchello-segment-members-table>
        </uui-box>
      ` : d}

      <uui-box headline="Status">
        <umb-property-layout label="Active" description="Inactive segments are not evaluated for membership">
          <uui-toggle
            slot="editor"
            .checked=${this._formData.isActive ?? !0}
            @change=${this._handleActiveChange}>
          </uui-toggle>
        </umb-property-layout>
      </uui-box>

      ${this._segment?.isSystemSegment ? s`
        <uui-box headline="System Segment">
          <p class="system-info">
            This is a system segment and cannot be deleted. Some settings may be restricted.
          </p>
        </uui-box>
      ` : d}
    `;
  }
  _renderPreviewTab() {
    return this._segment?.id ? s`
      <merchello-segment-preview .segmentId=${this._segment.id}></merchello-segment-preview>
    ` : s`<p>Save the segment first to preview matching customers.</p>`;
  }
  render() {
    return this._segment ? s`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Back button -->
        <uui-button slot="header" compact href=${se()} label="Back to Segments" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <!-- Header: icon + name input -->
        <div id="header" slot="header">
          <umb-icon name="icon-filter"></umb-icon>
          <uui-input
            id="name-input"
            .value=${this._formData.name || ""}
            @input=${this._handleNameChange}
            placeholder="Enter segment name..."
            ?invalid=${!!this._fieldErrors.name}>
          </uui-input>
          ${this._segment.isSystemSegment ? s`<uui-tag look="secondary">System</uui-tag>` : d}
        </div>

        <!-- Inner layout with tabs -->
        <umb-body-layout header-fit-height header-no-padding>
          ${this._renderTabs()}

          <!-- Router slot for URL tracking (hidden) -->
          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          <!-- Tab content -->
          <div class="tab-content">
            ${this._renderActiveTabContent()}
          </div>
        </umb-body-layout>

        <!-- Footer -->
        <umb-footer-layout slot="footer">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}>
            ${this._isSaving ? "Saving..." : this._isNew ? "Create Segment" : "Save Changes"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    ` : s`<div class="loading"><uui-loader></uui-loader></div>`;
  }
};
v = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
m.styles = [
  P`
      :host {
        display: block;
        height: 100%;
        --uui-tab-background: var(--uui-color-surface);
      }

      .back-button {
        margin-right: var(--uui-size-space-2);
      }

      #header {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
        flex: 1;
        padding: var(--uui-size-space-4) 0;
      }

      #header umb-icon {
        font-size: 24px;
        color: var(--uui-color-text-alt);
      }

      #name-input {
        flex: 1 1 auto;
        --uui-input-border-color: transparent;
        --uui-input-background-color: transparent;
        font-size: var(--uui-type-h5-size);
        font-weight: 700;
      }

      #name-input:hover,
      #name-input:focus-within {
        --uui-input-border-color: var(--uui-color-border);
        --uui-input-background-color: var(--uui-color-surface);
      }

      #name-input[invalid] {
        --uui-input-border-color: var(--uui-color-danger);
      }

      uui-tab-group {
        --uui-tab-divider: var(--uui-color-border);
        width: 100%;
      }

      uui-tab {
        overflow: visible;
      }

      uui-tab uui-badge {
        position: relative;
        top: -2px;
      }

      umb-router-slot {
        display: none;
      }

      .tab-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
        padding: var(--uui-size-layout-1);
      }

      uui-box {
        --uui-box-default-padding: var(--uui-size-space-5);
      }

      umb-property-layout uui-select {
        width: 100%;
      }

      .helper-text {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
        margin-top: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
      }

      .system-info {
        color: var(--uui-color-text-alt);
        margin: 0;
      }

      .error-message {
        color: var(--uui-color-danger);
        font-size: var(--uui-type-small-size);
        margin-top: var(--uui-size-space-2);
      }

      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
      }
    `
];
w([
  o()
], m.prototype, "_segment", 2);
w([
  o()
], m.prototype, "_formData", 2);
w([
  o()
], m.prototype, "_isSaving", 2);
w([
  o()
], m.prototype, "_activePath", 2);
w([
  o()
], m.prototype, "_routerPath", 2);
w([
  o()
], m.prototype, "_fieldErrors", 2);
w([
  o()
], m.prototype, "_isNew", 2);
m = w([
  k("merchello-segment-detail")
], m);
const ze = m;
export {
  m as MerchelloSegmentDetailElement,
  ze as default
};
//# sourceMappingURL=segment-detail.element-KqjYu7Tf.js.map
