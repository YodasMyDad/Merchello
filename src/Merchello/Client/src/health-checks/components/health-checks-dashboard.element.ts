import {
  LitElement,
  css,
  html,
  nothing,
  customElement,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_HEALTH_CHECK_DETAIL_MODAL } from "@health-checks/modals/health-check-detail-modal.token.js";
import type {
  HealthCheckMetadataDto,
  HealthCheckResultDto,
} from "@health-checks/types/health-check.types.js";
import "@health-checks/components/health-check-card.element.js";

interface CheckState {
  metadata: HealthCheckMetadataDto;
  result: HealthCheckResultDto | null;
  isRunning: boolean;
}

const STATUS_ORDER: Record<string, number> = {
  error: 0,
  warning: 1,
  success: 2,
};

@customElement("merchello-health-checks-dashboard")
export class MerchelloHealthChecksDashboardElement extends UmbElementMixin(LitElement) {
  @state() private _checks: CheckState[] = [];
  @state() private _isLoadingChecks = true;
  @state() private _isRunningAll = false;
  @state() private _errorMessage: string | null = null;

  #modalManager: UmbModalManagerContext | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    void this._loadAvailableChecks();
  }

  private async _loadAvailableChecks(): Promise<void> {
    this._isLoadingChecks = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getHealthChecks();

    this._isLoadingChecks = false;

    if (error || !data) {
      this._errorMessage = error?.message ?? "Failed to load health checks.";
      return;
    }

    this._checks = data
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((metadata) => ({ metadata, result: null, isRunning: false }));
  }

  private async _runAllChecks(): Promise<void> {
    if (this._isRunningAll) return;
    this._isRunningAll = true;

    // Mark all as running
    this._checks = this._checks.map((c) => ({ ...c, isRunning: true, result: null }));

    // Run all checks in parallel, update each card as it completes
    const promises = this._checks.map(async (checkState) => {
      const { data, error } = await MerchelloApi.runHealthCheck(checkState.metadata.alias);

      this._checks = this._checks.map((c) =>
        c.metadata.alias === checkState.metadata.alias
          ? { ...c, result: error ? null : (data ?? null), isRunning: false }
          : c,
      );

      // Re-sort after each completes
      this._sortChecks();
    });

    await Promise.allSettled(promises);
    this._isRunningAll = false;
  }

  private async _runSingleCheck(alias: string): Promise<void> {
    this._checks = this._checks.map((c) =>
      c.metadata.alias === alias ? { ...c, isRunning: true } : c,
    );

    const { data, error } = await MerchelloApi.runHealthCheck(alias);

    this._checks = this._checks.map((c) =>
      c.metadata.alias === alias
        ? { ...c, result: error ? null : (data ?? null), isRunning: false }
        : c,
    );

    this._sortChecks();
  }

  private _sortChecks(): void {
    this._checks = [...this._checks].sort((a, b) => {
      // Running checks stay in place
      if (a.isRunning || b.isRunning) return 0;

      // Checks with results sort by status priority
      const aStatus = a.result?.status;
      const bStatus = b.result?.status;

      // No result = sort to bottom
      if (!aStatus && !bStatus) return a.metadata.sortOrder - b.metadata.sortOrder;
      if (!aStatus) return 1;
      if (!bStatus) return -1;

      const aOrder = STATUS_ORDER[aStatus] ?? 3;
      const bOrder = STATUS_ORDER[bStatus] ?? 3;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.metadata.sortOrder - b.metadata.sortOrder;
    });
  }

  private _handleCheckDetail(event: CustomEvent<{ alias: string }>): void {
    const alias = event.detail.alias;
    const check = this._checks.find((c) => c.metadata.alias === alias);
    if (!check || !this.#modalManager) return;

    // Only open detail if there are affected items
    if (!check.result || check.result.affectedCount === 0) {
      // Run the check if it hasn't been run yet
      if (!check.result) {
        void this._runSingleCheck(alias);
      }
      return;
    }

    this.#modalManager.open(this, MERCHELLO_HEALTH_CHECK_DETAIL_MODAL, {
      data: {
        alias: check.metadata.alias,
        name: check.metadata.name,
        description: check.metadata.description,
        icon: check.metadata.icon,
      },
    });
  }

  private _renderHeader(): unknown {
    const anyRunning = this._checks.some((c) => c.isRunning);

    return html`
      <div class="header">
        <div class="header-text">
          <h2 class="header-title">Health Checks</h2>
          <p class="header-description">
            Monitor your store configuration and identify potential issues.
          </p>
        </div>
        <uui-button
          look="primary"
          color="positive"
          label="Run all health checks"
          ?disabled=${anyRunning || this._isLoadingChecks}
          @click=${this._runAllChecks}>
          ${this._isRunningAll ? "Running..." : "Run All Checks"}
        </uui-button>
      </div>
    `;
  }

  private _renderChecks(): unknown {
    if (this._isLoadingChecks) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    if (this._errorMessage) {
      return html`
        <div class="error-banner">
          <umb-icon name="icon-alert"></umb-icon>
          <span>${this._errorMessage}</span>
        </div>
      `;
    }

    if (this._checks.length === 0) {
      return html`<p class="hint">No health checks are registered.</p>`;
    }

    return html`
      <div class="checks-grid">
        ${this._checks.map((check) => html`
          <merchello-health-check-card
            .metadata=${check.metadata}
            .result=${check.result}
            ?is-running=${check.isRunning}
            @check-detail=${this._handleCheckDetail}>
          </merchello-health-check-card>
        `)}
      </div>
    `;
  }

  private _renderSummary(): unknown {
    const completed = this._checks.filter((c) => c.result !== null);
    if (completed.length === 0) return nothing;

    const errors = completed.filter((c) => c.result?.status === "error").length;
    const warnings = completed.filter((c) => c.result?.status === "warning").length;
    const success = completed.filter((c) => c.result?.status === "success").length;

    return html`
      <div class="summary-bar">
        ${errors > 0 ? html`<span class="summary-badge summary-error">${errors} error${errors === 1 ? "" : "s"}</span>` : nothing}
        ${warnings > 0 ? html`<span class="summary-badge summary-warning">${warnings} warning${warnings === 1 ? "" : "s"}</span>` : nothing}
        ${success > 0 ? html`<span class="summary-badge summary-success">${success} healthy</span>` : nothing}
      </div>
    `;
  }

  override render() {
    return html`
      <div class="dashboard">
        ${this._renderHeader()}
        ${this._renderSummary()}
        ${this._renderChecks()}
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
      padding: var(--uui-size-layout-1);
    }

    .dashboard {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--uui-size-space-4);
      flex-wrap: wrap;
    }

    .header-text {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .header-title {
      margin: 0;
      font-size: var(--uui-type-h3-size);
      font-weight: 700;
      color: var(--uui-color-text);
    }

    .header-description {
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-default-size);
    }

    .summary-bar {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .summary-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      padding: var(--uui-size-space-1) var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
      font-weight: 600;
    }

    .summary-error {
      background: color-mix(in srgb, var(--uui-color-danger) 12%, var(--uui-color-surface));
      color: var(--uui-color-danger);
    }

    .summary-warning {
      background: color-mix(in srgb, var(--uui-color-warning) 12%, var(--uui-color-surface));
      color: var(--merchello-color-warning-status-background, #8a6500);
    }

    .summary-success {
      background: color-mix(in srgb, var(--uui-color-positive) 12%, var(--uui-color-surface));
      color: var(--uui-color-positive);
    }

    .checks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--uui-size-space-4);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-5);
    }

    .hint {
      margin: 0;
      color: var(--uui-color-text-alt);
      text-align: center;
      padding: var(--uui-size-space-5);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    @media (max-width: 700px) {
      :host {
        padding: var(--uui-size-space-4);
      }

      .checks-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
}

export default MerchelloHealthChecksDashboardElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-health-checks-dashboard": MerchelloHealthChecksDashboardElement;
  }
}
