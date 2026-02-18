import { LitElement as E, html as l, nothing as h, css as C, state as n, customElement as $ } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as T } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT as x, UMB_CONFIRM_MODAL as w } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as S } from "@umbraco-cms/backoffice/notification";
import { M as g } from "./merchello-api-Dp_zU_yi.js";
import { g as k } from "./store-settings-CHgA9WE7.js";
import { e as D } from "./formatting-B_f6AiQh.js";
import { m as I, o as z } from "./navigation-CvTcY6zJ.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
var M = Object.defineProperty, P = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, o = (e, t, i, s) => {
  for (var a = s > 1 ? void 0 : s ? P(t, i) : t, _ = e.length - 1, b; _ >= 0; _--)
    (b = e[_]) && (a = (s ? b(t, i, a) : b(a)) || a);
  return s && a && M(t, i, a), a;
}, v = (e, t, i) => t.has(e) || y("Cannot " + i), c = (e, t, i) => (v(e, t, "read from private field"), t.get(e)), f = (e, t, i) => t.has(e) ? y("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), p = (e, t, i, s) => (v(e, t, "write to private field"), t.set(e, i), i), m, d, u;
let r = class extends T(E) {
  constructor() {
    super(), this._emails = [], this._categories = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._searchTerm = "", this._selectedCategory = null, this._isDeletingEmailId = null, this._isTogglingEmailIds = /* @__PURE__ */ new Set(), this._searchDebounceTimer = null, f(this, m), f(this, d), f(this, u, !1), this.consumeContext(x, (e) => {
      p(this, m, e);
    }), this.consumeContext(S, (e) => {
      p(this, d, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), p(this, u, !0), this._initializeAndLoad();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, u, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _initializeAndLoad() {
    const e = await k();
    if (!c(this, u)) return;
    this._pageSize = e.defaultPaginationPageSize;
    const { data: t, error: i } = await g.getEmailTopicsGrouped();
    c(this, u) && (t && (this._categories = t), i && c(this, d)?.peek("warning", {
      data: { headline: "Categories unavailable", message: i.message }
    }), await this._loadEmails());
  }
  async _loadEmails() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize
    };
    this._searchTerm.trim() && (e.searchTerm = this._searchTerm.trim()), this._selectedCategory && (e.category = this._selectedCategory);
    const { data: t, error: i } = await g.getEmailConfigurations(e);
    if (c(this, u)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      t && (this._emails = t.items, this._totalItems = t.totalItems, this._totalPages = t.totalPages), this._isLoading = !1;
    }
  }
  _handleSearchInput(e) {
    const i = e.target.value;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = i, this._page = 1, this._loadEmails();
    }, 300);
  }
  _handleSearchClear() {
    this._searchTerm = "", this._page = 1, this._loadEmails();
  }
  _handleClearFilters() {
    this._searchTerm = "", this._selectedCategory = null, this._page = 1, this._loadEmails();
  }
  _handleCategoryChange(e) {
    this._selectedCategory = e, this._page = 1, this._loadEmails();
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._loadEmails();
  }
  _getPaginationState() {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages
    };
  }
  _handleCreateEmail() {
    I();
  }
  _handleEditEmail(e) {
    z(e.id);
  }
  _setTogglingState(e, t) {
    if (t) {
      this._isTogglingEmailIds = /* @__PURE__ */ new Set([...this._isTogglingEmailIds, e]);
      return;
    }
    const i = new Set(this._isTogglingEmailIds);
    i.delete(e), this._isTogglingEmailIds = i;
  }
  async _handleToggleEnabled(e, t) {
    if (e.preventDefault(), e.stopPropagation(), this._isDeletingEmailId === t.id || this._isTogglingEmailIds.has(t.id))
      return;
    const i = this._emails.findIndex((a) => a.id === t.id);
    if (i === -1) return;
    const s = [...this._emails];
    this._setTogglingState(t.id, !0), this._emails = [
      ...this._emails.slice(0, i),
      { ...t, enabled: !t.enabled },
      ...this._emails.slice(i + 1)
    ];
    try {
      const { error: a } = await g.toggleEmailConfiguration(t.id);
      if (!c(this, u)) return;
      a && (this._emails = s, c(this, d)?.peek("danger", {
        data: { headline: "Failed", message: a.message }
      }));
    } finally {
      this._setTogglingState(t.id, !1);
    }
  }
  async _handleDeleteEmail(e, t) {
    if (e.preventDefault(), e.stopPropagation(), this._isDeletingEmailId === t.id || this._isTogglingEmailIds.has(t.id))
      return;
    const i = c(this, m)?.open(this, w, {
      data: {
        headline: "Delete email",
        content: `Delete "${t.name}". This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (c(this, u)) {
      this._isDeletingEmailId = t.id;
      try {
        const { error: s } = await g.deleteEmailConfiguration(t.id);
        if (!c(this, u)) return;
        if (this._isDeletingEmailId = null, s) {
          c(this, d)?.peek("danger", {
            data: { headline: "Failed to delete", message: s.message }
          });
          return;
        }
        c(this, d)?.peek("positive", {
          data: { headline: "Deleted", message: `Email "${t.name}" has been deleted.` }
        }), this._loadEmails();
      } finally {
        this._isDeletingEmailId === t.id && (this._isDeletingEmailId = null);
      }
    }
  }
  _renderLoadingState() {
    return l`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return l`
      <uui-box>
        <div class="error-banner" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
          <uui-button look="secondary" label="Retry" @click=${() => this._loadEmails()}>
            Retry
          </uui-button>
        </div>
      </uui-box>
    `;
  }
  _renderEmptyState() {
    return this._searchTerm.trim() || this._selectedCategory ? l`
        <merchello-empty-state
          icon="icon-search"
          headline="No emails found"
          message="Try adjusting your search or filter.">
          <uui-button slot="actions" look="secondary" label="Clear filters" @click=${this._handleClearFilters}>
            Clear Filters
          </uui-button>
        </merchello-empty-state>
      ` : l`
      <merchello-empty-state
        icon="icon-mailbox"
        headline="No emails configured"
        message="Create your first automated email to get started.">
        <uui-button
          slot="actions"
          look="primary"
          color="positive"
          label="Add Email"
          @click=${this._handleCreateEmail}>
          Add Email
        </uui-button>
      </merchello-empty-state>
    `;
  }
  _renderSearchAndFilters() {
    return l`
      <div class="toolbar">
        <div class="search-box">
          <uui-input
            type="search"
            placeholder="Search emails..."
            .value=${this._searchTerm}
            @input=${this._handleSearchInput}
            label="Search emails">
            <uui-icon name="icon-search" slot="prepend"></uui-icon>
            ${this._searchTerm ? l`
                  <uui-button
                    slot="append"
                    compact
                    look="secondary"
                    label="Clear search"
                    @click=${this._handleSearchClear}>
                    <uui-icon name="icon-wrong"></uui-icon>
                  </uui-button>
                ` : h}
          </uui-input>
        </div>

        <uui-button
          look="primary"
          color="positive"
          label="Add Email"
          @click=${this._handleCreateEmail}>
          <uui-icon name="icon-add" slot="icon"></uui-icon>
          Add Email
        </uui-button>
      </div>

      ${this._categories.length > 0 ? l`
            <uui-tab-group class="category-tabs">
              <uui-tab
                label="All"
                ?active=${!this._selectedCategory}
                @click=${() => this._handleCategoryChange(null)}>
                All
              </uui-tab>
              ${this._categories.map(
      (e) => l`
                  <uui-tab
                    label=${e.category}
                    ?active=${this._selectedCategory === e.category}
                    @click=${() => this._handleCategoryChange(e.category)}>
                    ${e.category}
                  </uui-tab>
                `
    )}
            </uui-tab-group>
          ` : h}
    `;
  }
  _renderEmailRow(e) {
    const t = this._isDeletingEmailId === e.id, i = this._isTogglingEmailIds.has(e.id), s = t || i;
    return l`
      <uui-table-row
        class="clickable ${s ? "busy" : ""}"
        @click=${() => {
      s || this._handleEditEmail(e);
    }}>
        <uui-table-cell>
          <div class="email-info">
            <span class="email-name">${e.name}</span>
            ${e.description ? l`<span class="email-description">${e.description}</span>` : h}
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <div class="topic-info">
            <span class="topic-name">${e.topicDisplayName || e.topic}</span>
            ${e.topicCategory ? l`<span class="topic-category">${e.topicCategory}</span>` : h}
          </div>
        </uui-table-cell>
        <uui-table-cell>${e.templatePath}</uui-table-cell>
        <uui-table-cell class="center">
          <uui-toggle
            .checked=${e.enabled}
            ?disabled=${s}
            @change=${(a) => this._handleToggleEnabled(a, e)}
            label=${`Toggle ${e.name} enabled status`}>
          </uui-toggle>
        </uui-table-cell>
        <uui-table-cell class="center">
          <div class="stats">
            <span class="stat-sent">${e.totalSent} sent</span>
            ${e.totalFailed > 0 ? l`<span class="stat-failed">${e.totalFailed} failed</span>` : h}
          </div>
        </uui-table-cell>
        <uui-table-cell>${e.lastSentUtc ? D(e.lastSentUtc) : "-"}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              ?disabled=${s}
              label=${`Edit email ${e.name}`}
              @click=${(a) => {
      a.stopPropagation(), this._handleEditEmail(e);
    }}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              color="danger"
              ?disabled=${s}
              label=${`Delete email ${e.name}`}
              @click=${(a) => this._handleDeleteEmail(a, e)}>
              ${t ? "Deleting..." : l`
                    <uui-icon name="icon-trash"></uui-icon>
                  `}
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderEmailsTable() {
    return l`
      <div class="table-container">
        <uui-table class="emails-table">
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Topic</uui-table-head-cell>
            <uui-table-head-cell>Template</uui-table-head-cell>
            <uui-table-head-cell class="center">Enabled</uui-table-head-cell>
            <uui-table-head-cell class="center">Stats</uui-table-head-cell>
            <uui-table-head-cell>Last Sent</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._emails.map((e) => this._renderEmailRow(e))}
        </uui-table>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._emails.length === 0 ? this._renderEmptyState() : this._renderEmailsTable();
  }
  render() {
    return l`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="emails-container">
          ${this._renderSearchAndFilters()}
          ${this._renderContent()}

          ${this._emails.length > 0 && !this._isLoading ? l`
                <merchello-pagination
                  .state=${this._getPaginationState()}
                  .disabled=${this._isLoading}
                  @page-change=${this._handlePageChange}>
                </merchello-pagination>
              ` : h}
        </div>
      </umb-body-layout>
    `;
  }
};
m = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
r.styles = [
  C`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .emails-container {
        max-width: 100%;
        padding: var(--uui-size-layout-1);
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: var(--uui-size-space-4);
      }

      .search-box {
        flex: 1 1 280px;
        max-width: 400px;
      }

      .search-box uui-input {
        width: 100%;
      }

      .category-tabs {
        width: 100%;
      }

      .table-container {
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .emails-table {
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

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
      }

      uui-table-row.clickable.busy {
        cursor: progress;
      }

      .email-info {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .email-name {
        font-weight: 500;
        color: var(--uui-color-interactive);
      }

      .email-description {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .topic-info {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .topic-name {
        font-weight: 500;
      }

      .topic-category {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .stats {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
        font-size: var(--uui-type-small-size);
      }

      .stat-sent {
        color: var(--uui-color-positive);
      }

      .stat-failed {
        color: var(--uui-color-danger);
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
        flex-wrap: wrap;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
      }

      @media (max-width: 767px) {
        .toolbar {
          align-items: stretch;
        }

        .search-box {
          max-width: 100%;
        }

        .toolbar > uui-button {
          width: 100%;
          justify-content: center;
        }
      }
    `
];
o([
  n()
], r.prototype, "_emails", 2);
o([
  n()
], r.prototype, "_categories", 2);
o([
  n()
], r.prototype, "_isLoading", 2);
o([
  n()
], r.prototype, "_errorMessage", 2);
o([
  n()
], r.prototype, "_page", 2);
o([
  n()
], r.prototype, "_pageSize", 2);
o([
  n()
], r.prototype, "_totalItems", 2);
o([
  n()
], r.prototype, "_totalPages", 2);
o([
  n()
], r.prototype, "_searchTerm", 2);
o([
  n()
], r.prototype, "_selectedCategory", 2);
o([
  n()
], r.prototype, "_isDeletingEmailId", 2);
o([
  n()
], r.prototype, "_isTogglingEmailIds", 2);
r = o([
  $("merchello-email-list")
], r);
const G = r;
export {
  r as MerchelloEmailListElement,
  G as default
};
//# sourceMappingURL=email-list.element-C6aFc6jv.js.map
