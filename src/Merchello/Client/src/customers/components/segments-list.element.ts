import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { CustomerSegmentListItemDto } from "@customers/types/segment.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getSegmentDetailHref, getSegmentCreateHref } from "@shared/utils/navigation.js";
import "@shared/components/merchello-empty-state.element.js";

@customElement("merchello-segments-list")
export class MerchelloSegmentsListElement extends UmbElementMixin(LitElement) {
  @state() private _segments: CustomerSegmentListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _deletingId: string | null = null;

  #notificationContext?: UmbNotificationContext;
  #modalManager?: UmbModalManagerContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadSegments();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadSegments(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getCustomerSegments();

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._segments = data;
    }

    this._isLoading = false;
  }

  private async _handleDelete(segment: CustomerSegmentListItemDto): Promise<void> {
    if (segment.isSystemSegment) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Cannot delete", message: "System segments cannot be deleted." }
      });
      return;
    }

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Segment",
        content: `Are you sure you want to delete "${segment.name}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    const result = await modalContext?.onSubmit().catch(() => undefined);
    if (!result) return; // User cancelled
    if (!this.#isConnected) return; // Component disconnected while modal was open

    this._deletingId = segment.id;
    const { error } = await MerchelloApi.deleteCustomerSegment(segment.id);

    if (!this.#isConnected) return;

    this._deletingId = null;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Delete failed", message: error.message }
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Segment deleted", message: `"${segment.name}" has been deleted.` }
    });
    this._loadSegments();
  }

  private _formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  private _getSegmentTypeBadgeColor(type: string): string {
    return type === "Automated" ? "positive" : "default";
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
        headline="No segments yet"
        message="Create segments to group customers for targeted marketing and pricing.">
        <uui-button
          slot="action"
          look="primary"
          href=${getSegmentCreateHref()}
          label="Create Segment">
          Create Segment
        </uui-button>
      </merchello-empty-state>
    `;
  }

  private _renderSegmentRow(segment: CustomerSegmentListItemDto): unknown {
    const isDeleting = this._deletingId === segment.id;

    return html`
      <uui-table-row>
        <uui-table-cell>
          <div class="segment-name-cell">
            <a href=${getSegmentDetailHref(segment.id)} class="segment-name">
              ${segment.name}
            </a>
            ${segment.isSystemSegment
              ? html`<uui-tag look="secondary" class="system-badge">System</uui-tag>`
              : nothing}
            ${segment.description
              ? html`<span class="segment-description">${segment.description}</span>`
              : nothing}
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <uui-tag color=${this._getSegmentTypeBadgeColor(segment.segmentType)}>
            ${segment.segmentType}
          </uui-tag>
        </uui-table-cell>
        <uui-table-cell class="center">${segment.memberCount}</uui-table-cell>
        <uui-table-cell>
          <uui-tag color=${segment.isActive ? "positive" : "warning"}>
            ${segment.isActive ? "Active" : "Inactive"}
          </uui-tag>
        </uui-table-cell>
        <uui-table-cell>${this._formatDate(segment.dateCreated)}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              href=${getSegmentDetailHref(segment.id)}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            ${!segment.isSystemSegment
              ? html`
                  <uui-button
                    look="secondary"
                    compact
                    label="Delete"
                    ?disabled=${isDeleting}
                    @click=${() => this._handleDelete(segment)}>
                    ${isDeleting
                      ? html`<uui-loader-circle></uui-loader-circle>`
                      : html`<uui-icon name="icon-delete"></uui-icon>`}
                  </uui-button>
                `
              : nothing}
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderSegmentsTable(): unknown {
    return html`
      <div class="table-container">
        <uui-table class="segments-table">
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Type</uui-table-head-cell>
            <uui-table-head-cell class="center">Members</uui-table-head-cell>
            <uui-table-head-cell>Status</uui-table-head-cell>
            <uui-table-head-cell>Created</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._segments.map((s) => this._renderSegmentRow(s))}
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
    if (this._segments.length === 0) {
      return this._renderEmptyState();
    }
    return this._renderSegmentsTable();
  }

  render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="segments-container">
          <!-- Header with create button -->
          <div class="header-actions">
            <uui-button
              look="primary"
              href=${getSegmentCreateHref()}
              label="Create Segment">
              <uui-icon name="icon-add"></uui-icon>
              Create Segment
            </uui-button>
          </div>

          <!-- Content -->
          ${this._renderContent()}
        </div>
      </umb-body-layout>
    `;
  }

  static styles = [
    css`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .segments-container {
        max-width: 100%;
        padding: var(--uui-size-layout-1);
      }

      .header-actions {
        display: flex;
        justify-content: flex-end;
        margin-bottom: var(--uui-size-space-4);
      }

      .table-container {
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .segments-table {
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

      .segment-name-cell {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .segment-name {
        font-weight: 500;
        color: var(--uui-color-interactive);
        text-decoration: none;
      }

      .segment-name:hover {
        text-decoration: underline;
      }

      .segment-description {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .system-badge {
        font-size: 10px;
        margin-left: var(--uui-size-space-2);
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
      }
    `,
  ];
}

export default MerchelloSegmentsListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-segments-list": MerchelloSegmentsListElement;
  }
}
