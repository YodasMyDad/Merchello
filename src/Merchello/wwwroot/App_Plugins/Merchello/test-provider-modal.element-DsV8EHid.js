import { nothing as t, unsafeHTML as h, html as i, css as m, state as p, customElement as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as _ } from "@umbraco-cms/backoffice/modal";
import { M as x } from "./merchello-api-NdGX4WPd.js";
import { m as y } from "./modal-layout.styles-C2OaUji5.js";
var z = Object.defineProperty, $ = Object.getOwnPropertyDescriptor, f = (e) => {
  throw TypeError(e);
}, l = (e, r, s, o) => {
  for (var a = o > 1 ? void 0 : o ? $(r, s) : r, d = e.length - 1, c; d >= 0; d--)
    (c = e[d]) && (a = (o ? c(r, s, a) : c(a)) || a);
  return o && a && z(r, s, a), a;
}, g = (e, r, s) => r.has(e) || f("Cannot " + s), k = (e, r, s) => (g(e, r, "read from private field"), r.get(e)), w = (e, r, s) => r.has(e) ? f("Cannot add the same private member more than once") : r instanceof WeakSet ? r.add(e) : r.set(e, s), v = (e, r, s, o) => (g(e, r, "write to private field"), r.set(e, s), s), u;
let n = class extends _ {
  constructor() {
    super(...arguments), this._isTesting = !1, this._errorMessage = null, w(this, u, !1);
  }
  connectedCallback() {
    super.connectedCallback(), v(this, u, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), v(this, u, !1);
  }
  async _handleTest() {
    const e = this.data?.provider;
    if (!e) {
      this._errorMessage = "No provider specified";
      return;
    }
    this._isTesting = !0, this._errorMessage = null, this._testResult = void 0;
    const { data: r, error: s } = await x.testAddressLookupProvider(e.alias);
    if (k(this, u)) {
      if (s) {
        this._errorMessage = s.message, this._isTesting = !1;
        return;
      }
      this._testResult = r, this._isTesting = !1;
    }
  }
  _handleClose() {
    this.modalContext?.reject();
  }
  _formatSupportedCountries(e) {
    const r = e?.supportedCountries;
    return !r || r.length === 0 || r.some((s) => s === "*") ? "All countries" : r.join(", ");
  }
  _renderProviderIcon(e) {
    return e ? e.iconSvg ? i`<span class="provider-icon-svg">${h(e.iconSvg)}</span>` : i`<uui-icon name="${e.icon ?? "icon-map-location"}"></uui-icon>` : t;
  }
  _renderProviderInfo() {
    const e = this.data?.provider;
    return e ? i`
      <div class="provider-info">
        <div class="provider-header">
          ${this._renderProviderIcon(e)}
          <div class="provider-details">
            <span class="provider-name">${e.displayName}</span>
            <span class="provider-alias">${e.alias}</span>
          </div>
        </div>
        ${e.description ? i`<p class="provider-description">${e.description}</p>` : t}
        <div class="provider-features">
          <span class="feature-badge">${this._formatSupportedCountries(e)}</span>
          ${e.requiresApiCredentials ? i`<span class="feature-badge">Requires credentials</span>` : i`<span class="feature-badge">No credentials required</span>`}
        </div>
      </div>
    ` : t;
  }
  _renderResults() {
    if (!this._testResult) return t;
    const { isSuccessful: e, errorMessage: r, details: s } = this._testResult;
    return i`
      <div class="results-section">
        <h3>Test Results</h3>

        ${!e && r ? i`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <div>
                  <p>${r}</p>
                </div>
              </div>
            ` : t}

        ${e ? i`
              <div class="result-card success">
                <div class="result-header">
                  <uui-icon name="icon-check"></uui-icon>
                  <span>Provider connection successful</span>
                </div>
              </div>
            ` : t}

        ${s && Object.keys(s).length > 0 ? i`
              <div class="result-details">
                ${Object.entries(s).map(([o, a]) => i`
                  <div class="detail-row">
                    <span class="detail-label">${o}</span>
                    <span class="detail-value">${a}</span>
                  </div>
                `)}
              </div>
            ` : t}
      </div>
    `;
  }
  render() {
    const e = this.data?.provider?.displayName ?? "Provider";
    return i`
      <umb-body-layout headline="Test ${e}">
        <div id="main">
          ${this._errorMessage ? i`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                  <uui-button look="secondary" compact label="Dismiss" @click=${() => this._errorMessage = null}>
                    Dismiss
                  </uui-button>
                </div>
              ` : t}

          ${this._renderProviderInfo()}

          <div class="instructions">
            <p>
              Run a test to confirm this provider can connect and return address suggestions.
              This does not store any customer data.
            </p>
          </div>

          ${this._renderResults()}
        </div>

        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>
            Close
          </uui-button>
          <uui-button
            label="Test Provider"
            look="primary"
            color="positive"
            ?disabled=${this._isTesting}
            @click=${this._handleTest}
          >
            ${this._isTesting ? i`<uui-loader-circle></uui-loader-circle>` : t}
            ${this._isTesting ? "Testing..." : "Test Provider"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
n.styles = [
  y,
  m`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .error-banner span {
      flex: 1;
    }

    .provider-info {
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .provider-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .provider-header > uui-icon,
    .provider-icon-svg {
      font-size: 1.5rem;
      color: var(--uui-color-text-alt);
      width: 24px;
      height: 24px;
    }

    .provider-icon-svg svg {
      width: 100%;
      height: 100%;
    }

    .provider-details {
      display: flex;
      flex-direction: column;
    }

    .provider-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .provider-alias {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .provider-description {
      margin: var(--uui-size-space-3) 0 0 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .provider-features {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-3);
    }

    .feature-badge {
      display: inline-block;
      padding: 2px 8px;
      background: var(--uui-color-surface-alt);
      border-radius: 12px;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .instructions {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .instructions p {
      margin: 0;
    }

    .results-section {
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-4);
    }

    .results-section h3 {
      margin: 0 0 var(--uui-size-space-3) 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
    }

    .result-errors {
      display: flex;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-3);
    }

    .result-errors p {
      margin: 0;
    }

    .result-card {
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-3);
    }

    .result-card.success {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .result-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-weight: 600;
    }

    .result-details {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .detail-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .detail-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .detail-value {
      word-break: break-word;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `
];
l([
  p()
], n.prototype, "_isTesting", 2);
l([
  p()
], n.prototype, "_testResult", 2);
l([
  p()
], n.prototype, "_errorMessage", 2);
n = l([
  b("merchello-address-lookup-provider-test-modal")
], n);
const R = n;
export {
  n as MerchelloAddressLookupProviderTestModalElement,
  R as default
};
//# sourceMappingURL=test-provider-modal.element-DsV8EHid.js.map
