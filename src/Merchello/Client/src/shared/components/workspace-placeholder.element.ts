import {
  LitElement,
  css,
  html,
  customElement,
  property,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

/**
 * Shared placeholder component for workspaces that are not yet implemented.
 * Use this component to display a consistent "coming soon" message across the app.
 *
 * @example
 * ```html
 * <merchello-workspace-placeholder
 *   icon="icon-chart-curve"
 *   title="Analytics"
 *   description="Sales analytics and reporting coming soon."
 *   hint="This section will provide insights into sales performance, customer behavior, and revenue trends.">
 * </merchello-workspace-placeholder>
 * ```
 */
@customElement("merchello-workspace-placeholder")
export class MerchelloWorkspacePlaceholderElement extends UmbElementMixin(LitElement) {
  /** Icon name to display (e.g., "icon-chart-curve", "icon-users", "icon-tag") */
  @property({ type: String }) icon = "icon-settings";

  /** Title text displayed as main heading */
  @property({ type: String }) title = "Coming Soon";

  /** Primary description text */
  @property({ type: String }) description = "";

  /** Secondary hint text displayed below the description */
  @property({ type: String }) hint = "";

  render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          <uui-box headline=${this.title}>
            <div class="placeholder">
              <uui-icon name=${this.icon}></uui-icon>
              <h2>${this.title}</h2>
              <p>${this.description}</p>
              ${this.hint ? html`<p class="hint">${this.hint}</p>` : ""}
            </div>
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = [
    css`
      :host {
        display: block;
        height: 100%;
      }

      .content {
        padding: var(--uui-size-layout-1);
      }

      .placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--uui-size-layout-4);
        text-align: center;
      }

      .placeholder uui-icon {
        font-size: 4rem;
        color: var(--uui-color-border-emphasis);
        margin-bottom: var(--uui-size-space-4);
      }

      .placeholder h2 {
        margin: 0 0 var(--uui-size-space-2) 0;
        color: var(--uui-color-text);
      }

      .placeholder p {
        margin: 0;
        color: var(--uui-color-text-alt);
      }

      .placeholder .hint {
        margin-top: var(--uui-size-space-4);
        font-size: 0.875rem;
      }
    `,
  ];
}

export default MerchelloWorkspacePlaceholderElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-workspace-placeholder": MerchelloWorkspacePlaceholderElement;
  }
}
