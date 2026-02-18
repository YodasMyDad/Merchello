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
import {
  getPriorityCategoryClass,
  PRIORITY_LEGEND,
} from "@notifications/types/notifications.types.js";
import "@shared/components/merchello-empty-state.element.js";
import { collectionLayoutStyles } from "@shared/styles/collection-layout.styles.js";

@customElement("merchello-notifications-list")
export class MerchelloNotificationsListElement extends UmbLitElement {
  @state() private _data?: NotificationDiscoveryResultDto;
  @state() private _loading = true;
  @state() private _loadError: string | null = null;
  @state() private _searchTerm = "";
  @state() private _expandedDomains = new Set<string>();

  #workspaceContext?: MerchelloNotificationsWorkspaceContext;

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloNotificationsWorkspaceContext | undefined;
      if (!this.#workspaceContext) return;

      this.observe(
        this.#workspaceContext.data,
        (data) => {
          const hadData = !!this._data;
          this._data = data;

          // Expand all domains by default on initial load for quick discovery.
          if (!hadData && data && this._expandedDomains.size === 0) {
            this._expandedDomains = new Set(data.domains.map((domain) => domain.domain));
          }
        },
        "_data"
      );
      this.observe(this.#workspaceContext.loading, (loading) => (this._loading = loading), "_loading");
      this.observe(this.#workspaceContext.loadError, (loadError) => (this._loadError = loadError), "_loadError");
      this.observe(this.#workspaceContext.searchTerm, (term) => (this._searchTerm = term), "_searchTerm");
    });
  }

  #handleSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    const term = target.value;

    this.#workspaceContext?.setSearchTerm(term);
    this.#expandMatchingDomains(term);
  }

  #clearSearch(): void {
    if (!this._searchTerm) return;
    this._searchTerm = "";
    this.#workspaceContext?.setSearchTerm("");
  }

  #retryLoad(): void {
    this.#workspaceContext?.loadData(true);
  }

  #expandMatchingDomains(term: string): void {
    const normalizedTerm = term.trim().toLowerCase();
    if (!normalizedTerm || !this._data) return;

    const expanded = new Set(this._expandedDomains);
    for (const domain of this._data.domains) {
      if (this.#filterNotifications(domain, normalizedTerm).length > 0) {
        expanded.add(domain.domain);
      }
    }
    this._expandedDomains = expanded;
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
    this._expandedDomains = new Set(this._data.domains.map((domain) => domain.domain));
  }

  #collapseAll(): void {
    this._expandedDomains = new Set();
  }

  #filterNotifications(group: NotificationDomainGroupDto, normalizedTerm: string): NotificationInfoDto[] {
    if (!normalizedTerm) return group.notifications;

    if (group.domain.toLowerCase().includes(normalizedTerm)) {
      return group.notifications;
    }

    return group.notifications.filter((notification) => {
      if (notification.typeName.toLowerCase().includes(normalizedTerm)) return true;
      if (notification.fullTypeName.toLowerCase().includes(normalizedTerm)) return true;

      return notification.handlers.some((handler) => {
        if (handler.typeName.toLowerCase().includes(normalizedTerm)) return true;
        if (handler.fullTypeName.toLowerCase().includes(normalizedTerm)) return true;
        if (handler.assemblyName?.toLowerCase().includes(normalizedTerm)) return true;
        return false;
      });
    });
  }

  #getFilteredDomains(): Array<{ domain: NotificationDomainGroupDto; notifications: NotificationInfoDto[] }> {
    if (!this._data) return [];

    const normalizedTerm = this._searchTerm.trim().toLowerCase();
    return this._data.domains
      .map((domain) => ({
        domain,
        notifications: this.#filterNotifications(domain, normalizedTerm),
      }))
      .filter((domain) => domain.notifications.length > 0);
  }

  #countHandlers(notifications: NotificationInfoDto[]): number {
    return notifications.reduce((sum, notification) => sum + notification.handlers.length, 0);
  }

  #countUnhandledNotifications(notifications: NotificationInfoDto[]): number {
    return notifications.filter((notification) => !notification.hasHandlers).length;
  }

  #countDuplicatePriorityHandlers(notifications: NotificationInfoDto[]): number {
    return notifications.reduce(
      (sum, notification) =>
        sum + notification.handlers.filter((handler) => handler.hasDuplicatePriority).length,
      0
    );
  }

  #getDomainPanelId(domainName: string): string {
    return `domain-${domainName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  }

  override render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div id="main" class="layout-container">
          ${this._loading
            ? this.#renderLoading()
            : this._loadError
            ? this.#renderLoadError()
            : this.#renderContent()}
        </div>
      </umb-body-layout>
    `;
  }

  #renderLoading() {
    return html`
      <uui-box>
        <div class="loading-container">
          <uui-loader></uui-loader>
          <p>Discovering notifications and handlers...</p>
        </div>
      </uui-box>
    `;
  }

  #renderLoadError() {
    return html`
      <uui-box class="error-box" headline="Could not load notifications">
        <div class="error-content">
          <p>${this._loadError}</p>
          <uui-button look="secondary" label="Retry" @click=${this.#retryLoad}>Retry</uui-button>
        </div>
      </uui-box>
    `;
  }

  #renderNoData() {
    return html`
      <uui-box>
        <merchello-empty-state
          icon="icon-bell"
          headline="No notifications discovered"
          message="No notification metadata was returned for this environment.">
          <uui-button slot="actions" look="secondary" label="Refresh" @click=${this.#retryLoad}>
            Refresh
          </uui-button>
        </merchello-empty-state>
      </uui-box>
    `;
  }

  #renderNoSearchResults() {
    return html`
      <uui-box>
        <merchello-empty-state
          icon="icon-search"
          headline="No matching notifications"
          message="Try a different search term or clear the current filter.">
          <uui-button slot="actions" look="secondary" label="Clear search" @click=${this.#clearSearch}>
            Clear search
          </uui-button>
        </merchello-empty-state>
      </uui-box>
    `;
  }

  #renderContent() {
    if (!this._data || this._data.domains.length === 0) {
      return this.#renderNoData();
    }

    const filteredDomains = this.#getFilteredDomains();
    const visibleNotifications = filteredDomains.reduce((sum, domain) => sum + domain.notifications.length, 0);
    const visibleHandlers = filteredDomains.reduce(
      (sum, domain) => sum + this.#countHandlers(domain.notifications),
      0
    );
    const totalUnhandled = this._data.domains.reduce(
      (sum, domain) => sum + this.#countUnhandledNotifications(domain.notifications),
      0
    );
    const hasActiveSearch = this._searchTerm.trim().length > 0;

    return html`
      <uui-box>
        <div class="summary-cards">
          <div class="stat-card">
            <div class="stat-value">${this._data.totalNotifications}</div>
            <div class="stat-label">Notifications</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._data.totalHandlers}</div>
            <div class="stat-label">Handler registrations</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this._data.domains.length}</div>
            <div class="stat-label">Domains</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${totalUnhandled}</div>
            <div class="stat-label">Unhandled notifications</div>
          </div>
        </div>
      </uui-box>

      <uui-box>
        <div class="filters">
          <div class="filters-top">
            <div class="search-box">
              <uui-input
                placeholder="Search notifications or handlers..."
                @input=${this.#handleSearch}
                .value=${this._searchTerm}
                label="Search notifications and handlers">
                <uui-icon name="icon-search" slot="prepend"></uui-icon>
                ${this._searchTerm
                  ? html`
                      <uui-button slot="append" compact look="secondary" label="Clear search" @click=${this.#clearSearch}>
                        <uui-icon name="icon-wrong"></uui-icon>
                      </uui-button>
                    `
                  : nothing}
              </uui-input>
            </div>
            <div class="control-buttons">
              <uui-button look="secondary" label="Expand all domains" @click=${this.#expandAll}>
                <uui-icon name="icon-navigation-down" slot="icon"></uui-icon>
                Expand all
              </uui-button>
              <uui-button look="secondary" label="Collapse all domains" @click=${this.#collapseAll}>
                <uui-icon name="icon-navigation-right" slot="icon"></uui-icon>
                Collapse all
              </uui-button>
            </div>
          </div>
        </div>
        <p class="results-summary">
          ${hasActiveSearch
            ? html`
                Showing ${visibleNotifications} notifications and ${visibleHandlers} handlers in
                ${filteredDomains.length} matching domains.
              `
            : html`
                Showing ${this._data.totalNotifications} notifications and ${this._data.totalHandlers} handlers.
              `}
        </p>
      </uui-box>

      <uui-box headline="Priority Legend">
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
      </uui-box>

      ${filteredDomains.length === 0
        ? this.#renderNoSearchResults()
        : html`
            <div class="domains">
              ${filteredDomains.map(({ domain, notifications }) => this.#renderDomain(domain, notifications))}
            </div>
          `}
    `;
  }

  #renderDomain(domain: NotificationDomainGroupDto, notifications: NotificationInfoDto[]) {
    const panelId = this.#getDomainPanelId(domain.domain);
    const isExpanded = this._expandedDomains.has(domain.domain);
    const handlerCount = this.#countHandlers(notifications);
    const notificationsWithoutHandlers = this.#countUnhandledNotifications(notifications);
    const duplicatePriorityHandlers = this.#countDuplicatePriorityHandlers(notifications);

    return html`
      <uui-box class="domain-box">
        <button
          type="button"
          class="domain-toggle"
          @click=${() => this.#toggleDomain(domain.domain)}
          aria-expanded=${isExpanded ? "true" : "false"}
          aria-controls=${panelId}
          aria-label=${isExpanded ? `Collapse ${domain.domain} domain` : `Expand ${domain.domain} domain`}>
          <span class="domain-main">
            <uui-icon name=${isExpanded ? "icon-navigation-down" : "icon-navigation-right"}></uui-icon>
            <span class="domain-title-group">
              <span class="domain-name">${domain.domain}</span>
              <span class="domain-stats">${notifications.length} notifications, ${handlerCount} handlers</span>
            </span>
          </span>
          <span class="domain-meta">
            ${notificationsWithoutHandlers > 0
              ? html`
                  <span class="status-chip warning">
                    ${notificationsWithoutHandlers} unhandled
                  </span>
                `
              : nothing}
            ${duplicatePriorityHandlers > 0
              ? html`
                  <span class="status-chip neutral">
                    ${duplicatePriorityHandlers} shared priorities
                  </span>
                `
              : nothing}
          </span>
        </button>
        ${isExpanded
          ? html`
              <div class="notifications-list" id=${panelId}>
                ${notifications.map((notification) => this.#renderNotification(notification))}
              </div>
            `
          : nothing}
      </uui-box>
    `;
  }

  #renderNotification(notification: NotificationInfoDto) {
    return html`
      <div class="notification-item ${notification.hasHandlers ? "" : "no-handlers"}">
        <div class="notification-header">
          <span class="notification-name" title=${notification.fullTypeName}>${notification.typeName}</span>
          <span class="notification-flags">
            ${notification.isCancelable
              ? html`<span class="status-chip info">Cancelable</span>`
              : nothing}
            ${!notification.hasHandlers
              ? html`<span class="status-chip warning">No handlers</span>`
              : nothing}
          </span>
        </div>
        ${notification.hasHandlers
          ? this.#renderHandlers(notification.handlers)
          : html`
              <p class="no-handlers-text">
                No handlers are currently registered for this notification.
              </p>
            `}
      </div>
    `;
  }

  #renderHandlers(handlers: NotificationHandlerInfoDto[]) {
    return html`
      <div class="handlers-list">
        ${handlers.map(
          (handler) => html`
            <div class="handler-item ${handler.hasDuplicatePriority ? "duplicate-priority" : ""}">
              <span class="execution-order">${handler.executionOrder}</span>
              <div class="handler-main">
                <div class="handler-top">
                  <span class="handler-name" title=${handler.fullTypeName}>${handler.typeName}</span>
                  <span class="priority-badge ${getPriorityCategoryClass(handler.priorityCategory)}">
                    ${handler.priority}
                  </span>
                  <span class="priority-category">${handler.priorityCategory}</span>
                </div>
                <div class="handler-meta">
                  ${handler.hasDuplicatePriority
                    ? html`
                        <span
                          class="status-chip warning"
                          title="Multiple handlers share this priority. Execution order between those handlers is non-deterministic.">
                          <uui-icon name="icon-alert"></uui-icon>
                          Shared priority
                        </span>
                      `
                    : nothing}
                  ${handler.assemblyName
                    ? html`<span class="assembly-name">${handler.assemblyName}</span>`
                    : nothing}
                </div>
              </div>
            </div>
          `
        )}
      </div>
    `;
  }

  static override styles = [
    collectionLayoutStyles,
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        background: var(--uui-color-background);
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--uui-size-layout-2);
        gap: var(--uui-size-space-3);
      }

      .loading-container p {
        margin: 0;
        color: var(--uui-color-text-alt);
      }

      .error-content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--uui-size-space-3);
        color: var(--uui-color-danger);
      }

      .error-content p {
        margin: 0;
      }

      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: var(--uui-size-space-3);
      }

      .stat-card {
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        padding: var(--uui-size-space-4);
      }

      .stat-value {
        font-size: var(--uui-type-h3-size);
        font-weight: 700;
        color: var(--uui-color-interactive);
      }

      .stat-label {
        margin-top: var(--uui-size-space-1);
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .search-box {
        max-width: 640px;
      }

      .control-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: var(--uui-size-space-2);
      }

      .results-summary {
        margin: var(--uui-size-space-3) 0 0;
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      .priority-legend {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: var(--uui-size-space-3);
      }

      .legend-item {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
        padding: var(--uui-size-space-3);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-surface);
        color: var(--uui-color-text);
      }

      .legend-range {
        font-size: var(--uui-type-small-size);
        font-weight: 700;
      }

      .legend-category {
        font-weight: 600;
      }

      .legend-desc {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .legend-item.priority-validation {
        border-color: var(--uui-color-positive);
        color: var(--uui-color-positive);
      }

      .legend-item.priority-early {
        border-color: var(--uui-color-interactive);
        color: var(--uui-color-interactive);
      }

      .legend-item.priority-default {
        border-color: var(--uui-color-border-emphasis, var(--uui-color-border));
        color: var(--uui-color-text-alt);
      }

      .legend-item.priority-processing {
        border-color: var(--uui-color-interactive-emphasis, var(--uui-color-interactive));
        color: var(--uui-color-interactive-emphasis, var(--uui-color-interactive));
      }

      .legend-item.priority-business {
        background: var(--merchello-color-warning-status-background, #8a6500);
        border-color: var(--merchello-color-warning-status-background, #8a6500);
        color: #fff;
      }

      .legend-item.priority-business .legend-desc {
        color: #fff;
      }

      .legend-item.priority-external {
        border-color: var(--uui-color-text-alt);
        color: var(--uui-color-text-alt);
      }

      .domains {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .domain-toggle {
        width: 100%;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--uui-size-space-3);
        cursor: pointer;
        text-align: left;
      }

      .domain-toggle:focus-visible {
        outline: 2px solid var(--uui-color-interactive);
        outline-offset: 2px;
      }

      .domain-main {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        min-width: 0;
      }

      .domain-title-group {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
        min-width: 0;
      }

      .domain-name {
        font-weight: 600;
        font-size: var(--uui-type-h5-size);
      }

      .domain-stats {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      .domain-meta {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--uui-size-space-2);
      }

      .notifications-list {
        margin-top: var(--uui-size-space-3);
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
        border-color: var(--merchello-color-warning-status-background, #8a6500);
      }

      .notification-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--uui-size-space-2);
      }

      .notification-name {
        font-family: var(--uui-font-monospace);
        font-size: var(--uui-type-small-size);
        font-weight: 600;
        word-break: break-word;
      }

      .notification-flags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--uui-size-space-2);
      }

      .no-handlers-text {
        margin: var(--uui-size-space-2) 0 0;
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .handlers-list {
        margin-top: var(--uui-size-space-3);
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      .handler-item {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: var(--uui-size-space-2);
        align-items: start;
        padding: var(--uui-size-space-2);
        border-radius: var(--uui-border-radius);
        border: 1px solid var(--uui-color-border);
        background: var(--uui-color-surface-alt);
      }

      .handler-item.duplicate-priority {
        border-left: 3px solid var(--merchello-color-warning-status-background, #8a6500);
      }

      .execution-order {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        background: var(--uui-color-interactive);
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: var(--uui-type-small-size);
        font-weight: 700;
      }

      .handler-main {
        min-width: 0;
      }

      .handler-top {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .handler-name {
        font-family: var(--uui-font-monospace);
        font-size: var(--uui-type-small-size);
        font-weight: 500;
        word-break: break-word;
      }

      .priority-badge {
        padding: 0 var(--uui-size-space-2);
        border-radius: var(--uui-border-radius);
        border: 1px solid var(--uui-color-border);
        font-size: var(--uui-type-small-size);
        font-weight: 700;
        background: var(--uui-color-surface);
        color: var(--uui-color-text);
        line-height: 1.5rem;
        min-width: 2.25rem;
        text-align: center;
      }

      .priority-badge.priority-validation {
        background: var(--uui-color-positive);
        border-color: var(--uui-color-positive);
        color: #fff;
      }

      .priority-badge.priority-early {
        background: var(--uui-color-interactive);
        border-color: var(--uui-color-interactive);
        color: #fff;
      }

      .priority-badge.priority-default {
        background: var(--uui-color-surface-emphasis);
        border-color: var(--uui-color-surface-emphasis);
      }

      .priority-badge.priority-processing {
        background: var(--uui-color-interactive-emphasis, var(--uui-color-interactive));
        border-color: var(--uui-color-interactive-emphasis, var(--uui-color-interactive));
        color: #fff;
      }

      .priority-badge.priority-business {
        background: var(--merchello-color-warning-status-background, #8a6500);
        border-color: var(--merchello-color-warning-status-background, #8a6500);
        color: #fff;
      }

      .priority-badge.priority-external {
        background: var(--uui-color-surface-alt);
        border-color: var(--uui-color-text-alt);
        color: var(--uui-color-text-alt);
      }

      .priority-category {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .handler-meta {
        margin-top: var(--uui-size-space-1);
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .assembly-name {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        gap: var(--uui-size-space-1);
        padding: 0 var(--uui-size-space-2);
        min-height: 1.5rem;
        border-radius: 999px;
        border: 1px solid var(--uui-color-border);
        background: var(--uui-color-surface-alt);
        color: var(--uui-color-text);
        font-size: var(--uui-type-small-size);
        font-weight: 600;
      }

      .status-chip uui-icon {
        font-size: var(--uui-type-small-size);
      }

      .status-chip.info {
        background: var(--uui-color-interactive);
        border-color: var(--uui-color-interactive);
        color: #fff;
      }

      .status-chip.warning {
        background: var(--merchello-color-warning-status-background, #8a6500);
        border-color: var(--merchello-color-warning-status-background, #8a6500);
        color: #fff;
      }

      .status-chip.neutral {
        background: var(--uui-color-surface-alt);
        border-color: var(--uui-color-border);
        color: var(--uui-color-text-alt);
      }

      @media (max-width: 900px) {
        .domain-toggle {
          flex-direction: column;
          align-items: flex-start;
        }

        .domain-meta {
          justify-content: flex-start;
        }
      }

      @media (max-width: 640px) {
        .search-box {
          min-width: 100%;
        }

        .control-buttons {
          width: 100%;
        }

        .control-buttons uui-button {
          flex: 1 1 auto;
        }
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
