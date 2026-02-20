import { LitElement as I, html as s, nothing as c, css as P, property as z, state as o, customElement as k } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as R } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as se } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT as H } from "@umbraco-cms/backoffice/notification";
import { M as $ } from "./merchello-api-B76CV0sD.js";
import { y as oe, z as ne } from "./navigation-CvTcY6zJ.js";
import { UMB_MODAL_MANAGER_CONTEXT as le, UMB_CONFIRM_MODAL as ue } from "@umbraco-cms/backoffice/modal";
import { M as de } from "./customer-picker-modal.token-BZSMisS9.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
import { a as ce } from "./formatting-MfE1tvkN.js";
import { a as he } from "./store-settings-7zNVo6g4.js";
var me = Object.defineProperty, pe = Object.getOwnPropertyDescriptor, X = (e) => {
  throw TypeError(e);
}, v = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? pe(t, i) : t, l = e.length - 1, n; l >= 0; l--)
    (n = e[l]) && (r = (a ? n(t, i, r) : n(r)) || r);
  return a && r && me(t, i, r), r;
}, K = (e, t, i) => t.has(e) || X("Cannot " + i), g = (e, t, i) => (K(e, t, "read from private field"), t.get(e)), L = (e, t, i) => t.has(e) ? X("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), E = (e, t, i, a) => (K(e, t, "write to private field"), t.set(e, i), i), x, w, f;
let h = class extends R(I) {
  constructor() {
    super(), this.segmentId = "", this._members = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._removingIds = /* @__PURE__ */ new Set(), L(this, x), L(this, w), L(this, f, !1), this.consumeContext(le, (e) => {
      E(this, x, e);
    }), this.consumeContext(H, (e) => {
      E(this, w, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), E(this, f, !0), this.segmentId && this._loadMembers();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), E(this, f, !1);
  }
  updated(e) {
    e.has("segmentId") && this.segmentId && (this._page = 1, this._loadMembers());
  }
  async _loadMembers() {
    if (!this.segmentId) return;
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await $.getSegmentMembers(
      this.segmentId,
      this._page,
      this._pageSize
    );
    if (g(this, f)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      e && (this._members = e.items, this._totalItems = e.totalItems, this._totalPages = e.totalPages), this._isLoading = !1;
    }
  }
  async _handleAddMembers() {
    const e = this._members.map((a) => a.customerId), i = await g(this, x)?.open(this, de, {
      data: {
        excludeCustomerIds: e,
        multiSelect: !0
      }
    })?.onSubmit().catch(() => {
    });
    if (g(this, f) && i?.selectedCustomerIds?.length) {
      const { error: a } = await $.addSegmentMembers(this.segmentId, {
        customerIds: i.selectedCustomerIds
      });
      if (a) {
        g(this, w)?.peek("danger", {
          data: { headline: "Add failed", message: a.message }
        });
        return;
      }
      g(this, w)?.peek("positive", {
        data: {
          headline: "Members added",
          message: `${i.selectedCustomerIds.length} customer(s) added to the segment.`
        }
      }), this._loadMembers(), this._dispatchMembersChanged();
    }
  }
  async _handleRemoveMember(e) {
    const t = e.customerName || e.customerEmail, i = g(this, x)?.open(this, ue, {
      data: {
        headline: "Remove member",
        content: `Remove ${t} from this segment. You can add them again later.`,
        confirmLabel: "Remove member",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (!g(this, f)) return;
    this._removingIds = /* @__PURE__ */ new Set([...this._removingIds, e.customerId]);
    const { error: a } = await $.removeSegmentMembers(this.segmentId, {
      customerIds: [e.customerId]
    });
    if (g(this, f)) {
      if (this._removingIds = new Set([...this._removingIds].filter((r) => r !== e.customerId)), a) {
        g(this, w)?.peek("danger", {
          data: { headline: "Remove failed", message: a.message }
        });
        return;
      }
      g(this, w)?.peek("positive", {
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
      <div class="error-banner" role="alert">
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
          label="Add customers"
          @click=${this._handleAddMembers}>
          Add customers
        </uui-button>
      </merchello-empty-state>
    `;
  }
  _renderMemberRow(e) {
    const t = this._removingIds.has(e.customerId), i = e.customerName || e.customerEmail;
    return s`
      <uui-table-row>
        <uui-table-cell>
          <span class="member-name">${e.customerName || "N/A"}</span>
        </uui-table-cell>
        <uui-table-cell>${e.customerEmail}</uui-table-cell>
        <uui-table-cell>${this._formatDate(e.dateAdded)}</uui-table-cell>
        <uui-table-cell>${e.notes || "N/A"}</uui-table-cell>
        <uui-table-cell>
          <uui-button
            look="secondary"
            compact
            label=${`Remove ${i}`}
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
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
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
        <div class="header-actions">
          <uui-button
            look="primary"
            label="Add customers"
            @click=${this._handleAddMembers}>
            <uui-icon name="icon-add"></uui-icon>
            Add customers
          </uui-button>
        </div>

        ${this._renderContent()}

        ${this._members.length > 0 && !this._isLoading ? s`
              <merchello-pagination
                .state=${this._getPaginationState()}
                .disabled=${this._isLoading}
                @page-change=${this._handlePageChange}>
              </merchello-pagination>
            ` : c}
      </div>
    `;
  }
};
x = /* @__PURE__ */ new WeakMap();
w = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
h.styles = [
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
        width: 80px;
        text-align: right;
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

      .error-banner uui-icon {
        flex-shrink: 0;
      }
    `
];
v([
  z({ type: String })
], h.prototype, "segmentId", 2);
v([
  o()
], h.prototype, "_members", 2);
v([
  o()
], h.prototype, "_isLoading", 2);
v([
  o()
], h.prototype, "_errorMessage", 2);
v([
  o()
], h.prototype, "_page", 2);
v([
  o()
], h.prototype, "_pageSize", 2);
v([
  o()
], h.prototype, "_totalItems", 2);
v([
  o()
], h.prototype, "_totalPages", 2);
v([
  o()
], h.prototype, "_removingIds", 2);
h = v([
  k("merchello-segment-members-table")
], h);
var ge = Object.defineProperty, _e = Object.getOwnPropertyDescriptor, Y = (e) => {
  throw TypeError(e);
}, S = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? _e(t, i) : t, l = e.length - 1, n; l >= 0; l--)
    (n = e[l]) && (r = (a ? n(t, i, r) : n(r)) || r);
  return a && r && ge(t, i, r), r;
}, J = (e, t, i) => t.has(e) || Y("Cannot " + i), Q = (e, t, i) => (J(e, t, "read from private field"), i ? i.call(e) : t.get(e)), F = (e, t, i) => t.has(e) ? Y("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), N = (e, t, i, a) => (J(e, t, "write to private field"), t.set(e, i), i), W = (e, t, i, a) => ({
  set _(r) {
    N(e, t, r);
  },
  get _() {
    return Q(e, t, a);
  }
}), D, A;
let b = class extends R(I) {
  constructor() {
    super(...arguments), this.criteria = [], this.matchMode = "All", this._criteriaRows = [], this._availableFields = [], this._isLoadingFields = !0, this._fieldLoadError = null, F(this, D, !1), F(this, A, 0);
  }
  connectedCallback() {
    super.connectedCallback(), N(this, D, !0), this._loadAvailableFields(), this._initializeCriteriaRows();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), N(this, D, !1);
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
    this._isLoadingFields = !0, this._fieldLoadError = null;
    const { data: e, error: t } = await $.getCriteriaFields();
    if (Q(this, D)) {
      if (t) {
        this._fieldLoadError = t.message, this._isLoadingFields = !1;
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
  _renderFieldSelect(e, t) {
    return s`
      <uui-select
        label=${`Criterion ${t + 1} field`}
        .options=${this._availableFields.map((i) => ({
      name: i.label,
      value: i.field,
      selected: i.field === e.field
    }))}
        @change=${(i) => {
      const a = i.target;
      this._updateCriterion(e.id, { field: a.value });
    }}>
      </uui-select>
    `;
  }
  _renderOperatorSelect(e, t) {
    const i = this._getOperatorsForField(e.field);
    return s`
      <uui-select
        label=${`Criterion ${t + 1} operator`}
        .options=${i.map((a) => ({
      name: this._getOperatorLabel(a),
      value: a,
      selected: a === e.operator
    }))}
        @change=${(a) => {
      const r = a.target;
      this._updateCriterion(e.id, { operator: r.value });
    }}>
      </uui-select>
    `;
  }
  _renderValueInput(e, t) {
    if (e.operator === "IsEmpty" || e.operator === "IsNotEmpty")
      return c;
    const a = this._getFieldMetadata(e.field)?.valueType ?? "String", r = a === "Number" || a === "Currency" ? "number" : a === "Date" ? "date" : "text", l = (n, ie, ae) => s`
      <uui-input
        label=${ae}
        type=${r}
        .value=${n ?? ""}
        @input=${(re) => {
      const T = re.target;
      let O = T.value;
      r === "number" && (O = T.value ? Number(T.value) : null), ie(O);
    }}
        placeholder=${a === "Currency" ? "Amount" : a === "Date" ? "Select date" : "Value"}>
      </uui-input>
    `;
    return e.operator === "Between" ? s`
        <div class="between-inputs">
          ${l(
      e.value,
      (n) => this._updateCriterion(e.id, { value: n }),
      `Criterion ${t + 1} value from`
    )}
          <span class="between-and">and</span>
          ${l(
      e.value2,
      (n) => this._updateCriterion(e.id, { value2: n }),
      `Criterion ${t + 1} value to`
    )}
        </div>
      ` : l(
      e.value,
      (n) => this._updateCriterion(e.id, { value: n }),
      `Criterion ${t + 1} value`
    );
  }
  _renderCriterionRow(e, t) {
    return s`
      <div class="criterion-row">
        <span class="row-prefix">${t === 0 ? "Where" : this.matchMode === "All" ? "AND" : "OR"}</span>
        <div class="row-inputs">
          ${this._renderFieldSelect(e, t)}
          ${this._renderOperatorSelect(e, t)}
          ${this._renderValueInput(e, t)}
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
    return this._isLoadingFields ? s`<div class="loading"><uui-loader></uui-loader></div>` : this._fieldLoadError ? s`
        <uui-box headline="Criteria rules">
          <div class="error-banner" role="alert">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._fieldLoadError}</span>
          </div>
          <uui-button
            look="secondary"
            label="Retry loading fields"
            @click=${() => this._loadAvailableFields()}>
            Retry
          </uui-button>
        </uui-box>
      ` : s`
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
              ?disabled=${this._availableFields.length === 0}
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
b.styles = [
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

      .error-banner {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-3);
        margin-bottom: var(--uui-size-space-3);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
      }

      .error-banner uui-icon {
        flex-shrink: 0;
      }
    `
];
S([
  z({ type: Array })
], b.prototype, "criteria", 2);
S([
  z({ type: String })
], b.prototype, "matchMode", 2);
S([
  o()
], b.prototype, "_criteriaRows", 2);
S([
  o()
], b.prototype, "_availableFields", 2);
S([
  o()
], b.prototype, "_isLoadingFields", 2);
S([
  o()
], b.prototype, "_fieldLoadError", 2);
b = S([
  k("merchello-segment-criteria-builder")
], b);
var ve = Object.defineProperty, be = Object.getOwnPropertyDescriptor, Z = (e) => {
  throw TypeError(e);
}, p = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? be(t, i) : t, l = e.length - 1, n; l >= 0; l--)
    (n = e[l]) && (r = (a ? n(t, i, r) : n(r)) || r);
  return a && r && ve(t, i, r), r;
}, j = (e, t, i) => t.has(e) || Z("Cannot " + i), B = (e, t, i) => (j(e, t, "read from private field"), t.get(e)), fe = (e, t, i) => t.has(e) ? Z("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), q = (e, t, i, a) => (j(e, t, "write to private field"), t.set(e, i), i), M;
let u = class extends R(I) {
  constructor() {
    super(...arguments), this.segmentId = "", this._customers = [], this._statistics = null, this._isLoading = !0, this._isLoadingStats = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, fe(this, M, !1);
  }
  connectedCallback() {
    super.connectedCallback(), q(this, M, !0), this.segmentId && (this._loadPreview(), this._loadStatistics());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), q(this, M, !1);
  }
  updated(e) {
    e.has("segmentId") && this.segmentId && (this._page = 1, this._loadPreview(), this._loadStatistics());
  }
  async _loadPreview() {
    if (!this.segmentId) return;
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await $.previewSegmentMatches(
      this.segmentId,
      this._page,
      this._pageSize
    );
    if (B(this, M)) {
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
    const { data: e, error: t } = await $.getSegmentStatistics(this.segmentId);
    if (B(this, M)) {
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
    return ce(e, he());
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
            <div class="stat-label">Total members</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._statistics.activeMembers}</div>
            <div class="stat-label">Active members</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._formatCurrency(this._statistics.totalRevenue)}</div>
            <div class="stat-label">Total revenue</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._formatCurrency(this._statistics.averageOrderValue)}</div>
            <div class="stat-label">Average order value</div>
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
      <div class="error-banner" role="alert">
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
          <span class="customer-name">${e.name || "N/A"}</span>
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
            <uui-table-head-cell class="right">Total spend</uui-table-head-cell>
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
        ${this._renderStatisticsCard()}

        <div class="header-actions">
          <span class="matching-count">
            ${this._totalItems} customer${this._totalItems !== 1 ? "s" : ""} match${this._totalItems === 1 ? "es" : ""} the criteria
          </span>
          <uui-button
            look="secondary"
            label="Refresh preview"
            @click=${this._handleRefresh}
            ?disabled=${this._isLoading}>
            <uui-icon name="icon-sync"></uui-icon>
            Refresh preview
          </uui-button>
        </div>

        ${this._renderContent()}

        ${this._customers.length > 0 && !this._isLoading ? s`
              <merchello-pagination
                .state=${this._getPaginationState()}
                .disabled=${this._isLoading}
                @page-change=${this._handlePageChange}>
              </merchello-pagination>
            ` : c}
      </div>
    `;
  }
};
M = /* @__PURE__ */ new WeakMap();
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
        gap: var(--uui-size-space-3);
        flex-wrap: wrap;
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

      .error-banner uui-icon {
        flex-shrink: 0;
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
var ye = Object.defineProperty, $e = Object.getOwnPropertyDescriptor, ee = (e) => {
  throw TypeError(e);
}, C = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? $e(t, i) : t, l = e.length - 1, n; l >= 0; l--)
    (n = e[l]) && (r = (a ? n(t, i, r) : n(r)) || r);
  return a && r && ye(t, i, r), r;
}, te = (e, t, i) => t.has(e) || ee("Cannot " + i), d = (e, t, i) => (te(e, t, "read from private field"), t.get(e)), U = (e, t, i) => t.has(e) ? ee("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), G = (e, t, i, a) => (te(e, t, "write to private field"), t.set(e, i), i), _, y;
function V() {
  return document.createElement("div");
}
let m = class extends R(I) {
  constructor() {
    super(), this._formData = {}, this._isSaving = !1, this._activePath = "tab/details", this._routerPath = "", this._fieldErrors = {}, this._isNew = !0, U(this, _), U(this, y), this._routes = [
      { path: "tab/details", component: V },
      { path: "tab/preview", component: V },
      { path: "", redirectTo: "tab/details" }
    ], this.consumeContext(se, (e) => {
      G(this, _, e), d(this, _) && (this._isNew = d(this, _).isNew, this.observe(d(this, _).segment, (t) => {
        this._segment = t, this._isNew = d(this, _)?.isNew ?? !0, t && (this._formData = { ...t });
      }, "_segment"));
    }), this.consumeContext(H, (e) => {
      G(this, y, e);
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
      d(this, y)?.peek("warning", {
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
        }, { data: t, error: i } = await $.createCustomerSegment(e);
        if (i) {
          d(this, y)?.peek("danger", {
            data: { headline: "Create failed", message: i.message }
          });
          return;
        }
        t && (d(this, _)?.updateSegment(t), d(this, y)?.peek("positive", {
          data: { headline: "Segment created", message: `"${t.name}" has been created.` }
        }), oe(t.id));
      } else {
        const e = {
          name: this._formData.name,
          description: this._formData.description,
          criteria: this._formData.criteria,
          matchMode: this._formData.matchMode,
          isActive: this._formData.isActive
        }, { data: t, error: i } = await $.updateCustomerSegment(this._segment.id, e);
        if (i) {
          d(this, y)?.peek("danger", {
            data: { headline: "Update failed", message: i.message }
          });
          return;
        }
        t && (d(this, _)?.updateSegment(t), d(this, y)?.peek("positive", {
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
          ${this._hasDetailsErrors() ? s`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : c}
        </uui-tab>
        ${e && !this._isNew ? s`
          <uui-tab
            label="Preview"
            href="${this._routerPath}/tab/preview"
            ?active=${this._activePath.includes("tab/preview")}>
            Preview
          </uui-tab>
        ` : c}
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
            label="Description"
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
            label="Segment type"
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
        ` : c}

        ${this._formData.segmentType === "Automated" ? s`
          <umb-property-layout
            label="Match Mode"
            description="How criteria rules are combined">
            <uui-select
              slot="editor"
              label="Match mode"
              .options=${[
      { name: "All conditions (AND)", value: "All", selected: this._formData.matchMode === "All" },
      { name: "Any condition (OR)", value: "Any", selected: this._formData.matchMode === "Any" }
    ]}
              @change=${this._handleMatchModeChange}>
            </uui-select>
          </umb-property-layout>
        ` : c}
      </uui-box>

      ${this._formData.segmentType === "Automated" ? s`
        <merchello-segment-criteria-builder
          .criteria=${this._formData.criteria || []}
          .matchMode=${this._formData.matchMode || "All"}
          @criteria-changed=${this._handleCriteriaChanged}>
        </merchello-segment-criteria-builder>
        ${this._fieldErrors.criteria ? s`
          <div class="error-message" role="alert">${this._fieldErrors.criteria}</div>
        ` : c}
      ` : c}

      ${this._formData.segmentType === "Manual" && !this._isNew && this._segment?.id ? s`
        <uui-box headline="Members (${this._segment?.memberCount ?? 0})">
          <merchello-segment-members-table
            .segmentId=${this._segment.id}
            @members-changed=${() => d(this, _)?.reloadSegment()}>
          </merchello-segment-members-table>
        </uui-box>
      ` : c}

      <uui-box headline="Status">
        <umb-property-layout label="Active" description="Inactive segments are not evaluated for membership">
          <uui-toggle
            slot="editor"
            label="Active"
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
      ` : c}
    `;
  }
  _renderPreviewTab() {
    return this._segment?.id ? s`
      <merchello-segment-preview .segmentId=${this._segment.id}></merchello-segment-preview>
    ` : s`
        <uui-box headline="Preview">
          <p class="system-info">Save this segment first to preview matching customers.</p>
        </uui-box>
      `;
  }
  render() {
    return this._segment ? s`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Back button -->
        <uui-button slot="header" compact href=${ne()} label="Back to Segments" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <!-- Header: icon + name input -->
        <div id="header" slot="header">
          <umb-icon name="icon-filter"></umb-icon>
          <uui-input
            id="name-input"
            label="Segment name"
            .value=${this._formData.name || ""}
            @input=${this._handleNameChange}
            placeholder="Enter segment name..."
            ?invalid=${!!this._fieldErrors.name}>
          </uui-input>
          ${this._segment.isSystemSegment ? s`<uui-tag look="secondary">System</uui-tag>` : c}
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
            label=${this._isNew ? "Create segment" : "Save changes"}
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
_ = /* @__PURE__ */ new WeakMap();
y = /* @__PURE__ */ new WeakMap();
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
C([
  o()
], m.prototype, "_segment", 2);
C([
  o()
], m.prototype, "_formData", 2);
C([
  o()
], m.prototype, "_isSaving", 2);
C([
  o()
], m.prototype, "_activePath", 2);
C([
  o()
], m.prototype, "_routerPath", 2);
C([
  o()
], m.prototype, "_fieldErrors", 2);
C([
  o()
], m.prototype, "_isNew", 2);
m = C([
  k("merchello-segment-detail")
], m);
const Re = m;
export {
  m as MerchelloSegmentDetailElement,
  Re as default
};
//# sourceMappingURL=segment-detail.element-C3zbYNAH.js.map
