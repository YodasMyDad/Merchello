import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import {
  LitElement,
  css,
  customElement,
  html,
  nothing,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { MerchelloApi } from "@api/merchello-api.js";
import type { InstallSeedDataResultDto } from "@seed-data/types/seed-data.types.js";

@customElement("merchello-seed-data-workspace")
export class MerchelloSeedDataWorkspaceElement extends UmbElementMixin(LitElement) {
  @state()
  private _isInstalling = false;

  @state()
  private _isInstallComplete = false;

  @state()
  private _message = "";

  @state()
  private _hasError = false;

  private async _installSeedData(): Promise<void> {
    if (this._isInstalling || this._isInstallComplete) return;

    this._isInstalling = true;
    this._hasError = false;
    this._message = "";

    const { data, error } = await MerchelloApi.installSeedData();
    this._isInstalling = false;

    if (error || !data) {
      this._hasError = true;
      this._message = error?.message ?? "Seed data installation failed.";
      return;
    }

    this._applyInstallResult(data);
  }

  private _applyInstallResult(result: InstallSeedDataResultDto): void {
    this._hasError = !result.success;
    this._message = result.message;

    if (result.success) {
      this._isInstallComplete = true;
      this.dispatchEvent(
        new CustomEvent("seed-data-installed", { bubbles: true, composed: true }),
      );
    }
  }

  override render() {
    if (this._isInstallComplete) return this._renderComplete();
    if (this._isInstalling) return this._renderInstalling();
    return this._renderReady();
  }

  private _renderReady() {
    return html`
      <uui-box>
        <div class="header">
          <uui-icon name="icon-wand"></uui-icon>
          <div>
            <h3>Install Sample Data</h3>
            <p>
              Populate your store with sample products, warehouses, customers,
              and invoices to explore Merchello's features.
            </p>
          </div>
        </div>

        ${this._hasError
          ? html`
              <uui-alert color="danger">${this._message}</uui-alert>
              <div class="actions">
                <uui-button
                  look="primary"
                  label="Retry"
                  @click=${this._installSeedData}
                ></uui-button>
              </div>
            `
          : html`
              <uui-alert color="default">
                Installation typically takes about a minute. Please don't
                navigate away during installation.
              </uui-alert>
              <div class="actions">
                <uui-button
                  look="primary"
                  label="Install Sample Data"
                  @click=${this._installSeedData}
                ></uui-button>
              </div>
            `}
      </uui-box>
    `;
  }

  private _renderInstalling() {
    return html`
      <uui-box>
        <div class="installing">
          <uui-loader-bar></uui-loader-bar>
          <h3>Installing Sample Data...</h3>
          <p>
            Creating products, warehouses, customers, and invoices. This may
            take up to a minute.
          </p>
        </div>
      </uui-box>
    `;
  }

  private _renderComplete() {
    return html`
      <uui-box>
        <div class="complete">
          <uui-icon name="icon-check" class="success-icon"></uui-icon>
          <h3>Sample Data Installed</h3>
          ${this._message ? html`<p>${this._message}</p>` : nothing}
          <p class="next-steps">
            Explore your store by navigating to
            <strong>Products</strong>, <strong>Orders</strong>, or
            <strong>Customers</strong> in the sidebar.
          </p>
        </div>
      </uui-box>
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }

    h3 {
      margin: 0 0 var(--uui-size-space-2);
      color: var(--uui-color-text);
    }

    p {
      margin: 0;
      color: var(--uui-color-text-alt);
      line-height: 1.5;
    }

    .header {
      display: flex;
      gap: var(--uui-size-space-5);
      align-items: flex-start;
      margin-bottom: var(--uui-size-space-4);
    }

    .header > uui-icon {
      font-size: 2rem;
      color: var(--uui-color-interactive);
      flex-shrink: 0;
      margin-top: var(--uui-size-space-1);
    }

    .actions {
      margin-top: var(--uui-size-space-5);
    }

    uui-alert {
      margin-top: var(--uui-size-space-4);
    }

    .installing {
      text-align: center;
      padding: var(--uui-size-layout-2) var(--uui-size-layout-1);
    }

    .installing uui-loader-bar {
      margin-bottom: var(--uui-size-space-5);
    }

    .complete {
      text-align: center;
      padding: var(--uui-size-layout-2) var(--uui-size-layout-1);
    }

    .success-icon {
      font-size: 2.5rem;
      color: var(--uui-color-positive);
      margin-bottom: var(--uui-size-space-4);
    }

    .next-steps {
      margin-top: var(--uui-size-space-4);
      font-size: 0.875rem;
    }
  `;
}

export default MerchelloSeedDataWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-seed-data-workspace": MerchelloSeedDataWorkspaceElement;
  }
}
