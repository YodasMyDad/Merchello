import { LitElement as m, html as o, nothing as p, css as g, state as c, customElement as _ } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as v } from "@umbraco-cms/backoffice/element-api";
import { M as f } from "./merchello-api-B1P1cUX9.js";
var b = Object.defineProperty, y = Object.getOwnPropertyDescriptor, d = (e, s, i, a) => {
  for (var t = a > 1 ? void 0 : a ? y(s, i) : s, r = e.length - 1, l; r >= 0; r--)
    (l = e[r]) && (t = (a ? l(s, i, t) : l(t)) || t);
  return a && t && b(s, i, t), t;
};
let n = class extends v(m) {
  constructor() {
    super(...arguments), this._isInstalling = !1, this._isInstallComplete = !1, this._message = "", this._hasError = !1;
  }
  async _installSeedData() {
    if (this._isInstalling || this._isInstallComplete) return;
    this._isInstalling = !0, this._hasError = !1, this._message = "";
    const { data: e, error: s } = await f.installSeedData();
    if (this._isInstalling = !1, s || !e) {
      this._hasError = !0, this._message = s?.message ?? "Seed data installation failed.";
      return;
    }
    this._applyInstallResult(e);
  }
  _applyInstallResult(e) {
    this._hasError = !e.success, this._message = e.message, e.success && (this._isInstallComplete = !0, this.dispatchEvent(
      new CustomEvent("seed-data-installed", { bubbles: !0, composed: !0 })
    ));
  }
  render() {
    return this._isInstallComplete ? this._renderComplete() : this._isInstalling ? this._renderInstalling() : this._renderReady();
  }
  _renderReady() {
    return o`
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

        ${this._hasError ? o`
              <uui-alert color="danger">${this._message}</uui-alert>
              <div class="actions">
                <uui-button
                  look="primary"
                  label="Retry"
                  @click=${this._installSeedData}
                ></uui-button>
              </div>
            ` : o`
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
  _renderInstalling() {
    return o`
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
  _renderComplete() {
    return o`
      <uui-box>
        <div class="complete">
          <uui-icon name="icon-check" class="success-icon"></uui-icon>
          <h3>Sample Data Installed</h3>
          ${this._message ? o`<p>${this._message}</p>` : p}
          <p class="next-steps">
            Explore your store by navigating to
            <strong>Products</strong>, <strong>Orders</strong>, or
            <strong>Customers</strong> in the sidebar.
          </p>
        </div>
      </uui-box>
    `;
  }
};
n.styles = g`
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
d([
  c()
], n.prototype, "_isInstalling", 2);
d([
  c()
], n.prototype, "_isInstallComplete", 2);
d([
  c()
], n.prototype, "_message", 2);
d([
  c()
], n.prototype, "_hasError", 2);
n = d([
  _("merchello-seed-data-workspace")
], n);
var I = Object.defineProperty, S = Object.getOwnPropertyDescriptor, h = (e, s, i, a) => {
  for (var t = a > 1 ? void 0 : a ? S(s, i) : s, r = e.length - 1, l; r >= 0; r--)
    (l = e[r]) && (t = (a ? l(s, i, t) : l(t)) || t);
  return a && t && I(s, i, t), t;
};
let u = class extends v(m) {
  constructor() {
    super(...arguments), this._isLoading = !0, this._showSeedData = !1;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadStatus();
  }
  async _loadStatus() {
    this._isLoading = !0;
    const { data: e } = await f.getSeedDataStatus();
    this._showSeedData = e?.isEnabled === !0 && e?.isInstalled === !1, this._isLoading = !1;
  }
  _onSeedDataInstalled() {
    this._showSeedData = !1;
  }
  render() {
    return this._isLoading ? p : this._showSeedData ? o`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          <merchello-seed-data-workspace
            @seed-data-installed=${this._onSeedDataInstalled}
          ></merchello-seed-data-workspace>
        </div>
      </umb-body-layout>
    ` : p;
  }
};
u.styles = [
  g`
      :host {
        display: block;
        height: 100%;
      }

      .content {
        padding: var(--uui-size-layout-1);
        max-width: 64rem;
      }
    `
];
h([
  c()
], u.prototype, "_isLoading", 2);
h([
  c()
], u.prototype, "_showSeedData", 2);
u = h([
  _("merchello-settings-workspace")
], u);
const z = u;
export {
  u as MerchelloSettingsWorkspaceElement,
  z as default
};
//# sourceMappingURL=settings-workspace.element-CSFqh_Pk.js.map
