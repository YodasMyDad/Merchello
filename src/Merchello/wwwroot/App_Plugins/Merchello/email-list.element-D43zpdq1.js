import { LitElement as y, html as i, nothing as d, css as E, state as o, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as $ } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as T } from "@umbraco-cms/backoffice/notification";
import { M as g } from "./merchello-api-DNSJzonx.js";
import { g as x } from "./store-settings-BPUUVKYl.js";
import { e as S } from "./formatting-YHMza1vS.js";
import { j as k, k as z } from "./navigation-BGhEgega.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
var w = Object.defineProperty, P = Object.getOwnPropertyDescriptor, f = (e) => {
  throw TypeError(e);
}, l = (e, a, t, u) => {
  for (var r = u > 1 ? void 0 : u ? P(a, t) : a, p = e.length - 1, m; p >= 0; p--)
    (m = e[p]) && (r = (u ? m(a, t, r) : m(r)) || r);
  return u && r && w(a, t, r), r;
}, v = (e, a, t) => a.has(e) || f("Cannot " + t), c = (e, a, t) => (v(e, a, "read from private field"), a.get(e)), b = (e, a, t) => a.has(e) ? f("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, t), _ = (e, a, t, u) => (v(e, a, "write to private field"), a.set(e, t), t), h, n;
let s = class extends $(y) {
  constructor() {
    super(), this._emails = [], this._categories = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._searchTerm = "", this._selectedCategory = null, this._searchDebounceTimer = null, b(this, h), b(this, n, !1), this.consumeContext(T, (e) => {
      _(this, h, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), _(this, n, !0), this._initializeAndLoad();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), _(this, n, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _initializeAndLoad() {
    const e = await x();
    if (!c(this, n)) return;
    this._pageSize = e.defaultPaginationPageSize;
    const { data: a } = await g.getEmailTopicsGrouped();
    c(this, n) && (a && (this._categories = a), this._loadEmails());
  }
  async _loadEmails() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize
    };
    this._searchTerm.trim() && (e.searchTerm = this._searchTerm.trim()), this._selectedCategory && (e.category = this._selectedCategory);
    const { data: a, error: t } = await g.getEmailConfigurations(e);
    if (c(this, n)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      a && (this._emails = a.items, this._totalItems = a.totalItems, this._totalPages = a.totalPages), this._isLoading = !1;
    }
  }
  _handleSearchInput(e) {
    const t = e.target.value;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = t, this._page = 1, this._loadEmails();
    }, 300);
  }
  _handleSearchClear() {
    this._searchTerm = "", this._page = 1, this._loadEmails();
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
    k();
  }
  _handleEditEmail(e) {
    z(e.id);
  }
  async _handleToggleEnabled(e, a) {
    e.preventDefault(), e.stopPropagation();
    const t = this._emails.findIndex((p) => p.id === a.id);
    if (t === -1) return;
    const u = [...this._emails];
    this._emails = [
      ...this._emails.slice(0, t),
      { ...a, enabled: !a.enabled },
      ...this._emails.slice(t + 1)
    ];
    const { error: r } = await g.toggleEmailConfiguration(a.id);
    c(this, n) && r && (this._emails = u, c(this, h)?.peek("danger", {
      data: { headline: "Failed", message: r.message }
    }));
  }
  async _handleDeleteEmail(e, a) {
    if (e.preventDefault(), e.stopPropagation(), !confirm(`Delete email "${a.name}"? This cannot be undone.`))
      return;
    const { error: t } = await g.deleteEmailConfiguration(a.id);
    if (c(this, n)) {
      if (t) {
        c(this, h)?.peek("danger", {
          data: { headline: "Failed to delete", message: t.message }
        });
        return;
      }
      c(this, h)?.peek("positive", {
        data: { headline: "Deleted", message: `Email "${a.name}" has been deleted.` }
      }), this._loadEmails();
    }
  }
  _renderLoadingState() {
    return i`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return i`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmptyState() {
    return this._searchTerm.trim() || this._selectedCategory ? i`
        <merchello-empty-state
          icon="icon-search"
          headline="No emails found"
          message="Try adjusting your search or filter.">
        </merchello-empty-state>
      ` : i`
      <merchello-empty-state
        icon="icon-mailbox"
        headline="No emails configured"
        message="Create your first automated email to get started.">
        <uui-button
          slot="action"
          look="primary"
          label="Add Email"
          @click=${this._handleCreateEmail}>
          Add Email
        </uui-button>
      </merchello-empty-state>
    `;
  }
  _renderSearchAndFilters() {
    return i`
      <div class="toolbar">
        <div class="search-box">
          <uui-input
            type="text"
            placeholder="Search emails..."
            .value=${this._searchTerm}
            @input=${this._handleSearchInput}
            label="Search emails">
            <uui-icon name="icon-search" slot="prepend"></uui-icon>
            ${this._searchTerm ? i`
                  <uui-button
                    slot="append"
                    compact
                    look="secondary"
                    label="Clear search"
                    @click=${this._handleSearchClear}>
                    <uui-icon name="icon-wrong"></uui-icon>
                  </uui-button>
                ` : d}
          </uui-input>
        </div>

        <uui-button
          look="primary"
          label="Add Email"
          @click=${this._handleCreateEmail}>
          <uui-icon name="icon-add" slot="icon"></uui-icon>
          Add Email
        </uui-button>
      </div>

      ${this._categories.length > 0 ? i`
            <uui-tab-group class="category-tabs">
              <uui-tab
                label="All"
                ?active=${!this._selectedCategory}
                @click=${() => this._handleCategoryChange(null)}>
                All
              </uui-tab>
              ${this._categories.map(
      (e) => i`
                  <uui-tab
                    label=${e.category}
                    ?active=${this._selectedCategory === e.category}
                    @click=${() => this._handleCategoryChange(e.category)}>
                    ${e.category}
                  </uui-tab>
                `
    )}
            </uui-tab-group>
          ` : d}
    `;
  }
  _renderEmailRow(e) {
    return i`
      <uui-table-row class="clickable" @click=${() => this._handleEditEmail(e)}>
        <uui-table-cell>
          <div class="email-info">
            <span class="email-name">${e.name}</span>
            ${e.description ? i`<span class="email-description">${e.description}</span>` : d}
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <div class="topic-info">
            <span class="topic-name">${e.topicDisplayName || e.topic}</span>
            ${e.topicCategory ? i`<span class="topic-category">${e.topicCategory}</span>` : d}
          </div>
        </uui-table-cell>
        <uui-table-cell>${e.templatePath}</uui-table-cell>
        <uui-table-cell class="center">
          <uui-toggle
            .checked=${e.enabled}
            @click=${(a) => this._handleToggleEnabled(a, e)}
            label="${e.enabled ? "Enabled" : "Disabled"}">
          </uui-toggle>
        </uui-table-cell>
        <uui-table-cell class="center">
          <div class="stats">
            <span class="stat-sent">${e.totalSent} sent</span>
            ${e.totalFailed > 0 ? i`<span class="stat-failed">${e.totalFailed} failed</span>` : d}
          </div>
        </uui-table-cell>
        <uui-table-cell>
          ${e.lastSentUtc ? S(e.lastSentUtc) : "—"}
        </uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${(a) => {
      a.stopPropagation(), this._handleEditEmail(e);
    }}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              color="danger"
              label="Delete"
              @click=${(a) => this._handleDeleteEmail(a, e)}>
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderEmailsTable() {
    return i`
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
    return i`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="emails-container">
          ${this._renderSearchAndFilters()}
          ${this._renderContent()}

          ${this._emails.length > 0 && !this._isLoading ? i`
                <merchello-pagination
                  .state=${this._getPaginationState()}
                  .disabled=${this._isLoading}
                  @page-change=${this._handlePageChange}>
                </merchello-pagination>
              ` : d}
        </div>
      </umb-body-layout>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakMap();
s.styles = [
  E`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .emails-container {
        max-width: 100%;
        padding: var(--uui-size-layout-1);
      }

      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--uui-size-space-4);
        margin-bottom: var(--uui-size-space-4);
      }

      .search-box {
        flex: 1;
        max-width: 400px;
      }

      .search-box uui-input {
        width: 100%;
      }

      .category-tabs {
        margin-bottom: var(--uui-size-space-4);
      }

      .table-container {
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
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
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
      }
    `
];
l([
  o()
], s.prototype, "_emails", 2);
l([
  o()
], s.prototype, "_categories", 2);
l([
  o()
], s.prototype, "_isLoading", 2);
l([
  o()
], s.prototype, "_errorMessage", 2);
l([
  o()
], s.prototype, "_page", 2);
l([
  o()
], s.prototype, "_pageSize", 2);
l([
  o()
], s.prototype, "_totalItems", 2);
l([
  o()
], s.prototype, "_totalPages", 2);
l([
  o()
], s.prototype, "_searchTerm", 2);
l([
  o()
], s.prototype, "_selectedCategory", 2);
s = l([
  C("merchello-email-list")
], s);
const j = s;
export {
  s as MerchelloEmailListElement,
  j as default
};
//# sourceMappingURL=email-list.element-D43zpdq1.js.map
