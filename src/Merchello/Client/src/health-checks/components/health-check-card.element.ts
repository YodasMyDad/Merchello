import {
  LitElement,
  css,
  html,
  nothing,
  customElement,
  property,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type {
  HealthCheckMetadataDto,
  HealthCheckResultDto,
} from "@health-checks/types/health-check.types.js";

@customElement("merchello-health-check-card")
export class MerchelloHealthCheckCardElement extends UmbElementMixin(LitElement) {
  @property({ type: Object })
  metadata: HealthCheckMetadataDto | null = null;

  @property({ type: Object })
  result: HealthCheckResultDto | null = null;

  @property({ type: Boolean, attribute: "is-running" })
  isRunning = false;

  private _onClick(): void {
    if (!this.metadata || this.isRunning) return;
    this.dispatchEvent(new CustomEvent("check-detail", {
      detail: { alias: this.metadata.alias },
      bubbles: true,
      composed: true,
    }));
  }

  private _getStatusColor(): string {
    if (!this.result) return "var(--uui-color-border)";
    switch (this.result.status) {
      case "error": return "var(--uui-color-danger)";
      case "warning": return "var(--uui-color-warning)";
      case "success": return "var(--uui-color-positive)";
      default: return "var(--uui-color-border)";
    }
  }

  private _getStatusIcon(): string {
    if (!this.result) return "icon-science";
    switch (this.result.status) {
      case "error": return "icon-alert";
      case "warning": return "icon-alert";
      case "success": return "icon-check";
      default: return "icon-science";
    }
  }

  private _getStatusLabel(): string {
    if (!this.result) return "Not checked";
    switch (this.result.status) {
      case "error": return "Error";
      case "warning": return "Warning";
      case "success": return "Healthy";
      default: return "Unknown";
    }
  }

  override render() {
    if (!this.metadata) return nothing;

    const hasResult = this.result !== null;
    const statusColor = this._getStatusColor();

    return html`
      <button
        class="card"
        style="--status-color: ${statusColor}"
        @click=${this._onClick}
        ?disabled=${this.isRunning}>

        <div class="card-header">
          <div class="card-icon">
            <umb-icon name=${this.metadata.icon}></umb-icon>
          </div>
          <div class="card-status">
            ${this.isRunning
              ? html`<uui-loader-circle></uui-loader-circle>`
              : hasResult
                ? html`
                    <div class="status-indicator">
                      <umb-icon name=${this._getStatusIcon()}></umb-icon>
                      <span class="status-label">${this._getStatusLabel()}</span>
                    </div>
                  `
                : html`<span class="status-idle">Not checked</span>`
            }
          </div>
        </div>

        <div class="card-body">
          <h3 class="card-title">${this.metadata.name}</h3>
          <p class="card-description">${this.metadata.description}</p>
        </div>

        ${hasResult && !this.isRunning
          ? html`
              <div class="card-footer">
                <span class="card-summary">${this.result!.summary}</span>
                ${this.result!.affectedCount > 0
                  ? html`<span class="affected-count">${this.result!.affectedCount}</span>`
                  : nothing
                }
              </div>
            `
          : nothing
        }

      </button>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .card {
      all: unset;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-5);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      border-left: 4px solid var(--status-color, var(--uui-color-border));
      background: var(--uui-color-surface);
      cursor: pointer;
      transition: box-shadow 0.15s ease, border-color 0.15s ease;
      box-sizing: border-box;
      position: relative;
      text-align: left;
      width: 100%;
      height: 100%;
    }

    .card:hover:not([disabled]) {
      box-shadow: var(--uui-shadow-depth-1);
    }

    .card:focus-visible {
      outline: 2px solid var(--uui-color-focus);
      outline-offset: 2px;
    }

    .card[disabled] {
      cursor: default;
      opacity: 0.7;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
    }

    .card-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
      font-size: 18px;
      flex-shrink: 0;
    }

    .card-status {
      display: flex;
      align-items: center;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      color: var(--status-color);
      font-size: var(--uui-type-small-size);
      font-weight: 600;
    }

    .status-idle {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .card-body {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .card-title {
      margin: 0;
      font-size: var(--uui-type-default-size);
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .card-description {
      margin: 0;
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      line-height: 1.4;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-2);
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
    }

    .card-summary {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text);
    }

    .affected-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 var(--uui-size-space-2);
      border-radius: 12px;
      background: var(--status-color);
      color: #fff;
      font-size: var(--uui-type-small-size);
      font-weight: 600;
      flex-shrink: 0;
    }

    uui-loader-circle {
      font-size: 20px;
    }
  `;
}

export default MerchelloHealthCheckCardElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-health-check-card": MerchelloHealthCheckCardElement;
  }
}
