import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { WarningItem } from "@shared/types/index.js";

// Re-export for backwards compatibility
export type { WarningItem } from "@shared/types/index.js";

/**
 * A warning indicator that shows a popover with details on hover.
 * Use this to display validation issues or configuration problems.
 */
@customElement("merchello-warning-popover")
export class MerchelloWarningPopoverElement extends UmbElementMixin(LitElement) {
  /**
   * List of warnings/errors to display.
   * The severity is determined by the highest severity item (error > warning).
   */
  @property({ type: Array }) warnings: WarningItem[] = [];

  @state() private _isOpen = false;

  private _getSeverity(): "error" | "warning" | "none" {
    if (this.warnings.length === 0) return "none";
    if (this.warnings.some((w) => w.type === "error")) return "error";
    return "warning";
  }

  private _getIcon(): string {
    const severity = this._getSeverity();
    return severity === "error" ? "icon-delete" : "icon-alert";
  }

  private _handleMouseEnter(): void {
    this._isOpen = true;
  }

  private _handleMouseLeave(): void {
    this._isOpen = false;
  }

  private _handleClick(): void {
    this._isOpen = !this._isOpen;
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this._isOpen = !this._isOpen;
    } else if (e.key === "Escape") {
      this._isOpen = false;
    }
  }

  private _renderPopover(): unknown {
    if (!this._isOpen || this.warnings.length === 0) return nothing;

    return html`
      <div class="popover">
        <div class="popover-arrow"></div>
        <div class="popover-content">
          <ul class="warning-list">
            ${this.warnings.map(
              (warning) => html`
                <li class="warning-item ${warning.type}">
                  <uui-icon name="${warning.type === "error" ? "icon-delete" : "icon-alert"}"></uui-icon>
                  <span>${warning.message}</span>
                </li>
              `
            )}
          </ul>
        </div>
      </div>
    `;
  }

  override render() {
    const severity = this._getSeverity();

    if (severity === "none") return nothing;

    return html`
      <div
        class="warning-trigger ${severity}"
        tabindex="0"
        role="button"
        aria-label="${this.warnings.length} issue${this.warnings.length > 1 ? "s" : ""}"
        aria-expanded="${this._isOpen}"
        @mouseenter=${this._handleMouseEnter}
        @mouseleave=${this._handleMouseLeave}
        @click=${this._handleClick}
        @keydown=${this._handleKeyDown}>
        <uui-icon name="${this._getIcon()}"></uui-icon>
        ${this._renderPopover()}
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: inline-block;
      position: relative;
    }

    .warning-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      position: relative;
      transition: transform 0.15s ease;
    }

    .warning-trigger:hover {
      transform: scale(1.1);
    }

    .warning-trigger:focus {
      outline: 2px solid var(--uui-color-focus);
      outline-offset: 2px;
    }

    .warning-trigger.error {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .warning-trigger.warning {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .warning-trigger uui-icon {
      font-size: 0.875rem;
    }

    .popover {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      min-width: 220px;
      max-width: 300px;
    }

    .popover-arrow {
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid var(--uui-color-surface);
    }

    .popover-content {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      box-shadow: var(--uui-shadow-depth-3);
      padding: var(--uui-size-space-3);
    }

    .warning-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .warning-item {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      font-size: 0.8125rem;
      line-height: 1.4;
    }

    .warning-item uui-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .warning-item.error uui-icon {
      color: var(--uui-color-danger);
    }

    .warning-item.warning uui-icon {
      color: var(--uui-color-warning);
    }

    .warning-item span {
      color: var(--uui-color-text);
    }
  `;
}

export default MerchelloWarningPopoverElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-warning-popover": MerchelloWarningPopoverElement;
  }
}
