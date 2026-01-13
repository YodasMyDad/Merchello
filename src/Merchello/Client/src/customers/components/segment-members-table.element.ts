import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { SegmentMemberDto } from "@customers/types/segment.types.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_CUSTOMER_PICKER_MODAL } from "../modals/customer-picker-modal.token.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";

@customElement("merchello-segment-members-table")
export class MerchelloSegmentMembersTableElement extends UmbElementMixin(LitElement) {
  @property({ type: String }) segmentId: string = "";

  @state() private _members: SegmentMemberDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _page = 1;
  @state() private _pageSize = 50;
  @state() private _totalItems = 0;
  @state() private _totalPages = 0;
  @state() private _removingIds: Set<string> = new Set();

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
    if (this.segmentId) {
      this._loadMembers();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("segmentId") && this.segmentId) {
      this._page = 1;
      this._loadMembers();
    }
  }

  private async _loadMembers(): Promise<void> {
    if (!this.segmentId) return;

    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getSegmentMembers(
      this.segmentId,
      this._page,
      this._pageSize
    );

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._members = data.items;
      this._totalItems = data.totalItems;
      this._totalPages = data.totalPages;
    }

    this._isLoading = false;
  }

  private async _handleAddMembers(): Promise<void> {
    const existingMemberIds = this._members.map(m => m.customerId);

    const modal = this.#modalManager?.open(this, MERCHELLO_CUSTOMER_PICKER_MODAL, {
      data: {
        excludeCustomerIds: existingMemberIds,
        multiSelect: true,
      },
    });

    const result = await modal?.onSubmit().catch(() => undefined);

    if (!this.#isConnected) return;

    if (result?.selectedCustomerIds?.length) {
      const { error } = await MerchelloApi.addSegmentMembers(this.segmentId, {
        customerIds: result.selectedCustomerIds,
      });

      if (error) {
        this.#notificationContext?.peek("danger", {
          data: { headline: "Add failed", message: error.message }
        });
        return;
      }

      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Members added",
          message: `${result.selectedCustomerIds.length} customer(s) added to the segment.`
        }
      });

      this._loadMembers();
      this._dispatchMembersChanged();
    }
  }

  private async _handleRemoveMember(member: SegmentMemberDto): Promise<void> {
    const displayName = member.customerName || member.customerEmail;

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Remove Member",
        content: `Are you sure you want to remove ${displayName} from this segment?`,
        confirmLabel: "Remove",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }
    if (!this.#isConnected) return; // Component disconnected while modal was open

    this._removingIds = new Set([...this._removingIds, member.customerId]);

    const { error } = await MerchelloApi.removeSegmentMembers(this.segmentId, {
      customerIds: [member.customerId],
    });

    if (!this.#isConnected) return;

    this._removingIds = new Set([...this._removingIds].filter(id => id !== member.customerId));

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Remove failed", message: error.message }
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Member removed", message: "Customer has been removed from the segment." }
    });

    this._loadMembers();
    this._dispatchMembersChanged();
  }

  private _dispatchMembersChanged(): void {
    this.dispatchEvent(new CustomEvent("members-changed", { bubbles: true, composed: true }));
  }

  private _handlePageChange(e: CustomEvent<PageChangeEventDetail>): void {
    this._page = e.detail.page;
    this._loadMembers();
  }

  private _getPaginationState(): PaginationState {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages,
    };
  }

  private _formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    return html`
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

  private _renderMemberRow(member: SegmentMemberDto): unknown {
    const isRemoving = this._removingIds.has(member.customerId);

    return html`
      <uui-table-row>
        <uui-table-cell>
          <span class="member-name">${member.customerName || "—"}</span>
        </uui-table-cell>
        <uui-table-cell>${member.customerEmail}</uui-table-cell>
        <uui-table-cell>${this._formatDate(member.dateAdded)}</uui-table-cell>
        <uui-table-cell>${member.notes || "—"}</uui-table-cell>
        <uui-table-cell>
          <uui-button
            look="secondary"
            compact
            label="Remove"
            ?disabled=${isRemoving}
            @click=${() => this._handleRemoveMember(member)}>
            ${isRemoving
              ? html`<uui-loader-circle></uui-loader-circle>`
              : html`<uui-icon name="icon-delete"></uui-icon>`}
          </uui-button>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderMembersTable(): unknown {
    return html`
      <div class="table-container">
        <uui-table class="members-table">
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Email</uui-table-head-cell>
            <uui-table-head-cell>Added</uui-table-head-cell>
            <uui-table-head-cell>Notes</uui-table-head-cell>
            <uui-table-head-cell class="actions-header"></uui-table-head-cell>
          </uui-table-head>
          ${this._members.map((m) => this._renderMemberRow(m))}
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
    if (this._members.length === 0) {
      return this._renderEmptyState();
    }
    return this._renderMembersTable();
  }

  override render() {
    return html`
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
        ${this._members.length > 0 && !this._isLoading
          ? html`
              <merchello-pagination
                .state=${this._getPaginationState()}
                .disabled=${this._isLoading}
                @page-change=${this._handlePageChange}>
              </merchello-pagination>
            `
          : nothing}
      </div>
    `;
  }

  static override readonly styles = [
    css`
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-segment-members-table": MerchelloSegmentMembersTableElement;
  }
}
