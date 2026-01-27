import {
  html,
  css,
  customElement,
  state,
  nothing,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import type { MerchelloNotificationsWorkspaceContext } from "@notifications/contexts/notifications-workspace.context.js";
import type {
  NotificationDiscoveryResultDto,
  NotificationDomainGroupDto,
  NotificationInfoDto,
  NotificationHandlerInfoDto,
} from "@notifications/types/notifications.types.js";
import { getPriorityCategoryClass, PRIORITY_LEGEND } from "@notifications/types/notifications.types.js";

@customElement("merchello-notifications-list")
export class MerchelloNotificationsListElement extends UmbLitElement {
  @state() private _data?: NotificationDiscoveryResultDto;
  @state() private _loading = true;
  @state() private _searchTerm = "";
  @state() private _expandedDomains = new Set<string>();

  #workspaceContext?: MerchelloNotificationsWorkspaceContext;

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloNotificationsWorkspaceContext | undefined;
      if (!this.#workspaceContext?.data) return;
      this.observe(this.#workspaceContext.data, (data) => (this._data = data), "_data");
      this.observe(this.#workspaceContext.loading, (loading) => (this._loading = loading), "_loading");
      this.observe(this.#workspaceContext.searchTerm, (term) => (this._searchTerm = term), "_searchTerm");
    });
  }

  #handleSearch(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.#workspaceContext?.setSearchTerm(target.value);
  }

  #toggleDomain(domain: string): void {
    const expanded = new Set(this._expandedDomains);
    if (expanded.has(domain)) {
      expanded.delete(domain);
    } else {
      expanded.add(domain);
    }
    this._expandedDomains = expanded;
  }

  #expandAll(): void {
    if (!this._data) return;
    this._expandedDomains = new Set(this._data.domains.map((d) => d.domain));
  }

  #collapseAll(): void {
    this._expandedDomains = new Set();
  }

  #filterNotifications(group: NotificationDomainGroupDto): NotificationInfoDto[] {
    if (!this._searchTerm) return group.notifications;
    const term = this._searchTerm.toLowerCase();
    return group.notifications.filter(
      (n) =>
        n.typeName.toLowerCase().includes(term) ||
        n.handlers.some((h) => h.typeName.toLowerCase().includes(term))
    );
  }

  override render() {
    return html`
      <umb-body-layout header-fit-height>
        <div id="main">
          ${this._loading ? this.#renderLoading() : this.#renderContent()}
        </div>
      </umb-body-layout>
    `;
  }

  #renderLoading() {
    return html`
      <div class="loading-container">
        <uui-loader></uui-loader>
        <p>Discovering notifications and handlers...</p>
      </div>
    `;
  }

  #renderContent() {
    if (!this._data) {
      return html`<uui-box><p>No data available</p></uui-box>`;
    }

    return html`
      <!-- Summary Stats -->
      <div class="summary-cards">
        <div class="stat-card">
          <div class="stat-value">${this._data.totalNotifications}</div>
          <div class="stat-label">Notifications</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${this._data.totalHandlers}</div>
          <div class="stat-label">Handler Registrations</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${this._data.domains.length}</div>
          <div class="stat-label">Domains</div>
        </div>
      </div>

      <!-- Search and Controls -->
      <div class="controls-row">
        <uui-input
          placeholder="Search notifications or handlers..."
          @input=${this.#handleSearch}
          .value=${this._searchTerm}
        >
          <uui-icon name="icon-search" slot="prepend"></uui-icon>
        </uui-input>
        <div class="control-buttons">
          <uui-button look="secondary" @click=${this.#expandAll} label="Expand All">
            <uui-icon name="icon-navigation-down"></uui-icon> Expand All
          </uui-button>
          <uui-button look="secondary" @click=${this.#collapseAll} label="Collapse All">
            <uui-icon name="icon-navigation-right"></uui-icon> Collapse All
          </uui-button>
        </div>
      </div>

      <!-- Priority Legend -->
      <div class="priority-legend">
        ${PRIORITY_LEGEND.map(
          (item) => html`
            <div class="legend-item ${getPriorityCategoryClass(item.category)}">
              <span class="legend-range">${item.range}</span>
              <span class="legend-category">${item.category}</span>
              <span class="legend-desc">${item.description}</span>
            </div>
          `
        )}
      </div>

      <!-- Domain Groups -->
      <div class="domains">
        ${this._data.domains.map((domain) => this.#renderDomain(domain))}
      </div>
    `;
  }

  #renderDomain(domain: NotificationDomainGroupDto) {
    const filtered = this.#filterNotifications(domain);
    if (this._searchTerm && filtered.length === 0) return nothing;

    const isExpanded = this._expandedDomains.has(domain.domain);
    const notificationsWithoutHandlers = domain.notifications.filter((n) => !n.hasHandlers).length;

    return html`
      <uui-box>
        <div class="domain-header" @click=${() => this.#toggleDomain(domain.domain)}>
          <uui-icon name=${isExpanded ? "icon-navigation-down" : "icon-navigation-right"}></uui-icon>
          <span class="domain-name">${domain.domain}</span>
          <span class="domain-stats">
            ${domain.notificationCount} notifications, ${domain.handlerCount} handlers
            ${notificationsWithoutHandlers > 0
              ? html`<span class="warning">(${notificationsWithoutHandlers} unhandled)</span>`
              : nothing}
          </span>
        </div>
        ${isExpanded ? this.#renderNotifications(filtered) : nothing}
      </uui-box>
    `;
  }

  #renderNotifications(notifications: NotificationInfoDto[]) {
    return html`
      <div class="notifications-list">
        ${notifications.map((n) => this.#renderNotification(n))}
      </div>
    `;
  }

  #renderNotification(notification: NotificationInfoDto) {
    return html`
      <div class="notification-item ${notification.hasHandlers ? "" : "no-handlers"}">
        <div class="notification-header">
          <span class="notification-name">${notification.typeName}</span>
          ${notification.isCancelable
            ? html`<uui-tag look="secondary" color="warning">Cancelable</uui-tag>`
            : nothing}
          ${!notification.hasHandlers
            ? html`<uui-tag look="secondary" color="default">No handlers</uui-tag>`
            : nothing}
        </div>
        ${notification.hasHandlers ? this.#renderHandlers(notification.handlers) : nothing}
      </div>
    `;
  }

  #renderHandlers(handlers: NotificationHandlerInfoDto[]) {
    return html`
      <div class="handlers-list">
        ${handlers.map(
          (h) => html`
            <div class="handler-item ${h.hasDuplicatePriority ? "duplicate-priority" : ""}">
              <span class="execution-order">${h.executionOrder}</span>
              <span class="handler-name">${h.typeName}</span>
              <span class="priority-badge ${getPriorityCategoryClass(h.priorityCategory)}">
                ${h.priority}
              </span>
              <span class="priority-category">${h.priorityCategory}</span>
              ${h.hasDuplicatePriority
                ? html`<span class="duplicate-warning" title="Multiple handlers share this priority. Execution order between them is non-deterministic.">
                    <uui-icon name="icon-alert"></uui-icon> shared priority
                  </span>`
                : nothing}
              ${h.assemblyName
                ? html`<span class="assembly-name">${h.assemblyName}</span>`
                : nothing}
            </div>
          `
        )}
      </div>
    `;
  }

  static override styles = [
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      #main {
        padding: var(--uui-size-layout-1);
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--uui-size-layout-3);
        gap: var(--uui-size-space-3);
      }

      .summary-cards {
        display: flex;
        gap: var(--uui-size-space-4);
      }

      .stat-card {
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        padding: var(--uui-size-space-5) var(--uui-size-space-6);
        text-align: center;
        min-width: 140px;
      }

      .stat-value {
        font-size: var(--uui-type-h2-size);
        font-weight: bold;
        color: var(--uui-color-interactive);
      }

      .stat-label {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .controls-row {
        display: flex;
        gap: var(--uui-size-space-4);
        align-items: center;
        flex-wrap: wrap;
      }

      .controls-row uui-input {
        flex: 1;
        min-width: 250px;
        max-width: 400px;
      }

      .control-buttons {
        display: flex;
        gap: var(--uui-size-space-2);
      }

      .priority-legend {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: var(--uui-size-space-3);
        font-size: var(--uui-type-small-size);
      }

      @media (max-width: 900px) {
        .priority-legend {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (max-width: 600px) {
        .priority-legend {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      .legend-item {
        padding: 6px 10px;
        border-radius: var(--uui-border-radius);
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .legend-range {
        font-weight: 700;
        font-size: 11px;
      }

      .legend-category {
        font-weight: 600;
        font-size: 12px;
      }

      .legend-desc {
        font-size: 10px;
        opacity: 0.8;
      }

      .legend-item.priority-validation { background: #e8f5e9; color: #2e7d32; }
      .legend-item.priority-early { background: #e3f2fd; color: #1565c0; }
      .legend-item.priority-default { background: #f5f5f5; color: #616161; }
      .legend-item.priority-processing { background: #e0f2f1; color: #00695c; }
      .legend-item.priority-business { background: #fff8e1; color: #e65100; }
      .legend-item.priority-external { background: #ede7f6; color: #512da8; }

      .domains {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .domain-header {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        cursor: pointer;
        padding: var(--uui-size-space-2);
        margin: calc(-1 * var(--uui-size-space-2));
        border-radius: var(--uui-border-radius);
      }

      .domain-header:hover {
        background: var(--uui-color-surface-alt);
      }

      .domain-name {
        font-weight: 600;
        font-size: var(--uui-type-h5-size);
      }

      .domain-stats {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      .warning {
        color: var(--uui-color-warning);
      }

      .notifications-list {
        padding: var(--uui-size-space-3) 0 0 0;
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .notification-item {
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        padding: var(--uui-size-space-3);
        background: var(--uui-color-surface);
      }

      .notification-item.no-handlers {
        border-color: var(--uui-color-warning);
        background: color-mix(in srgb, var(--uui-color-warning) 5%, var(--uui-color-surface));
      }

      .notification-header {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        margin-bottom: var(--uui-size-space-2);
      }

      .notification-name {
        font-weight: 500;
        font-family: var(--uui-font-monospace);
        font-size: 13px;
      }

      .handlers-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
        padding-left: var(--uui-size-space-4);
      }

      .handler-item {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        font-size: var(--uui-type-small-size);
        padding: var(--uui-size-space-1) var(--uui-size-space-2);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
      }

      .execution-order {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--uui-color-interactive);
        color: var(--uui-color-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 11px;
        flex-shrink: 0;
      }

      .handler-name {
        font-family: var(--uui-font-monospace);
        flex: 1;
        font-size: 12px;
      }

      .priority-badge {
        padding: 2px 6px;
        border-radius: var(--uui-border-radius);
        font-weight: 600;
        font-size: 11px;
        flex-shrink: 0;
      }

      .priority-badge.priority-validation { background: #e8f5e9; color: #2e7d32; }
      .priority-badge.priority-early { background: #e3f2fd; color: #1565c0; }
      .priority-badge.priority-default { background: #f5f5f5; color: #616161; }
      .priority-badge.priority-processing { background: #e0f2f1; color: #00695c; }
      .priority-badge.priority-business { background: #fff8e1; color: #e65100; }
      .priority-badge.priority-external { background: #ede7f6; color: #512da8; }

      .priority-category {
        color: var(--uui-color-text-alt);
        font-size: 10px;
        flex-shrink: 0;
      }

      .handler-item.duplicate-priority {
        border-left: 3px solid var(--uui-color-warning);
      }

      .duplicate-warning {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--uui-color-warning-emphasis);
        font-size: 10px;
        font-weight: 500;
        flex-shrink: 0;
      }

      .duplicate-warning uui-icon {
        font-size: 12px;
      }

      .assembly-name {
        color: var(--uui-color-text-alt);
        font-size: 10px;
        font-style: italic;
        flex-shrink: 0;
      }
    `,
  ];
}

export default MerchelloNotificationsListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-notifications-list": MerchelloNotificationsListElement;
  }
}
