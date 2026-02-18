import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type {
  EmailConfigurationDto,
  EmailConfigurationListParams,
  EmailTopicCategoryDto,
} from "@email/types/email.types.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getStoreSettings } from "@api/store-settings.js";
import { formatRelativeDate } from "@shared/utils/formatting.js";
import { navigateToEmailCreate, navigateToEmailDetail } from "@shared/utils/navigation.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";

@customElement("merchello-email-list")
export class MerchelloEmailListElement extends UmbElementMixin(LitElement) {
  @state() private _emails: EmailConfigurationDto[] = [];
  @state() private _categories: EmailTopicCategoryDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _page = 1;
  @state() private _pageSize = 50;
  @state() private _totalItems = 0;
  @state() private _totalPages = 0;
  @state() private _searchTerm = "";
  @state() private _selectedCategory: string | null = null;
  @state() private _isDeletingEmailId: string | null = null;
  @state() private _isTogglingEmailIds = new Set<string>();

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._initializeAndLoad();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
  }

  private async _initializeAndLoad(): Promise<void> {
    const settings = await getStoreSettings();
    if (!this.#isConnected) return;
    this._pageSize = settings.defaultPaginationPageSize;

    // Load categories for filter tabs
    const { data: categories, error: categoriesError } = await MerchelloApi.getEmailTopicsGrouped();
    if (!this.#isConnected) return;
    if (categories) {
      this._categories = categories;
    }
    if (categoriesError) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Categories unavailable", message: categoriesError.message },
      });
    }

    await this._loadEmails();
  }

  private async _loadEmails(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const params: EmailConfigurationListParams = {
      page: this._page,
      pageSize: this._pageSize,
    };

    if (this._searchTerm.trim()) {
      params.searchTerm = this._searchTerm.trim();
    }

    if (this._selectedCategory) {
      params.category = this._selectedCategory;
    }

    const { data, error } = await MerchelloApi.getEmailConfigurations(params);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._emails = data.items;
      this._totalItems = data.totalItems;
      this._totalPages = data.totalPages;
    }

    this._isLoading = false;
  }

  private _handleSearchInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const value = input.value;

    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }

    this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = value;
      this._page = 1;
      this._loadEmails();
    }, 300);
  }

  private _handleSearchClear(): void {
    this._searchTerm = "";
    this._page = 1;
    this._loadEmails();
  }

  private _handleClearFilters(): void {
    this._searchTerm = "";
    this._selectedCategory = null;
    this._page = 1;
    this._loadEmails();
  }

  private _handleCategoryChange(category: string | null): void {
    this._selectedCategory = category;
    this._page = 1;
    this._loadEmails();
  }

  private _handlePageChange(e: CustomEvent<PageChangeEventDetail>): void {
    this._page = e.detail.page;
    this._loadEmails();
  }

  private _getPaginationState(): PaginationState {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages,
    };
  }

  private _handleCreateEmail(): void {
    navigateToEmailCreate();
  }

  private _handleEditEmail(email: EmailConfigurationDto): void {
    navigateToEmailDetail(email.id);
  }

  private _setTogglingState(emailId: string, isToggling: boolean): void {
    if (isToggling) {
      this._isTogglingEmailIds = new Set([...this._isTogglingEmailIds, emailId]);
      return;
    }

    const next = new Set(this._isTogglingEmailIds);
    next.delete(emailId);
    this._isTogglingEmailIds = next;
  }

  private async _handleToggleEnabled(e: Event, email: EmailConfigurationDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    if (this._isDeletingEmailId === email.id || this._isTogglingEmailIds.has(email.id)) {
      return;
    }

    // Optimistically update UI
    const idx = this._emails.findIndex((item) => item.id === email.id);
    if (idx === -1) return;

    const originalEmails = [...this._emails];
    this._setTogglingState(email.id, true);
    this._emails = [
      ...this._emails.slice(0, idx),
      { ...email, enabled: !email.enabled },
      ...this._emails.slice(idx + 1),
    ];

    try {
      const { error } = await MerchelloApi.toggleEmailConfiguration(email.id);

      if (!this.#isConnected) return;

      if (error) {
        // Revert on error
        this._emails = originalEmails;
        this.#notificationContext?.peek("danger", {
          data: { headline: "Failed", message: error.message },
        });
      }
    } finally {
      this._setTogglingState(email.id, false);
    }
  }

  private async _handleDeleteEmail(e: Event, email: EmailConfigurationDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    if (this._isDeletingEmailId === email.id || this._isTogglingEmailIds.has(email.id)) {
      return;
    }

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete email",
        content: `Delete "${email.name}". This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return;
    }
    if (!this.#isConnected) return;

    this._isDeletingEmailId = email.id;

    try {
      const { error } = await MerchelloApi.deleteEmailConfiguration(email.id);

      if (!this.#isConnected) return;
      this._isDeletingEmailId = null;

      if (error) {
        this.#notificationContext?.peek("danger", {
          data: { headline: "Failed to delete", message: error.message },
        });
        return;
      }

      this.#notificationContext?.peek("positive", {
        data: { headline: "Deleted", message: `Email "${email.name}" has been deleted.` },
      });
      this._loadEmails();
    } finally {
      if (this._isDeletingEmailId === email.id) {
        this._isDeletingEmailId = null;
      }
    }
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`
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

  private _renderEmptyState(): unknown {
    if (this._searchTerm.trim() || this._selectedCategory) {
      return html`
        <merchello-empty-state
          icon="icon-search"
          headline="No emails found"
          message="Try adjusting your search or filter.">
          <uui-button slot="actions" look="secondary" label="Clear filters" @click=${this._handleClearFilters}>
            Clear Filters
          </uui-button>
        </merchello-empty-state>
      `;
    }

    return html`
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

  private _renderSearchAndFilters(): unknown {
    return html`
      <div class="toolbar">
        <div class="search-box">
          <uui-input
            type="search"
            placeholder="Search emails..."
            .value=${this._searchTerm}
            @input=${this._handleSearchInput}
            label="Search emails">
            <uui-icon name="icon-search" slot="prepend"></uui-icon>
            ${this._searchTerm
              ? html`
                  <uui-button
                    slot="append"
                    compact
                    look="secondary"
                    label="Clear search"
                    @click=${this._handleSearchClear}>
                    <uui-icon name="icon-wrong"></uui-icon>
                  </uui-button>
                `
              : nothing}
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

      ${this._categories.length > 0
        ? html`
            <uui-tab-group class="category-tabs">
              <uui-tab
                label="All"
                ?active=${!this._selectedCategory}
                @click=${() => this._handleCategoryChange(null)}>
                All
              </uui-tab>
              ${this._categories.map(
                (cat) => html`
                  <uui-tab
                    label=${cat.category}
                    ?active=${this._selectedCategory === cat.category}
                    @click=${() => this._handleCategoryChange(cat.category)}>
                    ${cat.category}
                  </uui-tab>
                `
              )}
            </uui-tab-group>
          `
        : nothing}
    `;
  }

  private _renderEmailRow(email: EmailConfigurationDto): unknown {
    const isDeleting = this._isDeletingEmailId === email.id;
    const isToggling = this._isTogglingEmailIds.has(email.id);
    const isBusy = isDeleting || isToggling;

    return html`
      <uui-table-row
        class="clickable ${isBusy ? "busy" : ""}"
        @click=${() => {
          if (!isBusy) {
            this._handleEditEmail(email);
          }
        }}>
        <uui-table-cell>
          <div class="email-info">
            <span class="email-name">${email.name}</span>
            ${email.description
              ? html`<span class="email-description">${email.description}</span>`
              : nothing}
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <div class="topic-info">
            <span class="topic-name">${email.topicDisplayName || email.topic}</span>
            ${email.topicCategory
              ? html`<span class="topic-category">${email.topicCategory}</span>`
              : nothing}
          </div>
        </uui-table-cell>
        <uui-table-cell>${email.templatePath}</uui-table-cell>
        <uui-table-cell class="center">
          <uui-toggle
            .checked=${email.enabled}
            ?disabled=${isBusy}
            @change=${(e: Event) => this._handleToggleEnabled(e, email)}
            label=${`Toggle ${email.name} enabled status`}>
          </uui-toggle>
        </uui-table-cell>
        <uui-table-cell class="center">
          <div class="stats">
            <span class="stat-sent">${email.totalSent} sent</span>
            ${email.totalFailed > 0
              ? html`<span class="stat-failed">${email.totalFailed} failed</span>`
              : nothing}
          </div>
        </uui-table-cell>
        <uui-table-cell>${email.lastSentUtc ? formatRelativeDate(email.lastSentUtc) : "-"}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              ?disabled=${isBusy}
              label=${`Edit email ${email.name}`}
              @click=${(e: Event) => {
                e.stopPropagation();
                this._handleEditEmail(email);
              }}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              color="danger"
              ?disabled=${isBusy}
              label=${`Delete email ${email.name}`}
              @click=${(e: Event) => this._handleDeleteEmail(e, email)}>
              ${isDeleting
                ? "Deleting..."
                : html`
                    <uui-icon name="icon-trash"></uui-icon>
                  `}
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderEmailsTable(): unknown {
    return html`
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
          ${this._emails.map((email) => this._renderEmailRow(email))}
        </uui-table>
      </div>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return this._renderLoadingState();
    }
    if (this._errorMessage) {
      return this._renderErrorState();
    }
    if (this._emails.length === 0) {
      return this._renderEmptyState();
    }
    return this._renderEmailsTable();
  }

  override render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="emails-container">
          ${this._renderSearchAndFilters()}
          ${this._renderContent()}

          ${this._emails.length > 0 && !this._isLoading
            ? html`
                <merchello-pagination
                  .state=${this._getPaginationState()}
                  .disabled=${this._isLoading}
                  @page-change=${this._handlePageChange}>
                </merchello-pagination>
              `
            : nothing}
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    css`
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
    `,
  ];
}

export default MerchelloEmailListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-email-list": MerchelloEmailListElement;
  }
}

