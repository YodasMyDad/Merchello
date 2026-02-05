import { nothing as i, html as s, css as b, state as v, customElement as _ } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as x } from "@umbraco-cms/backoffice/modal";
import { M as y } from "./merchello-api-DkRa4ImO.js";
import { c as p } from "./formatting-DQoM1drN.js";
var z = Object.defineProperty, $ = Object.getOwnPropertyDescriptor, g = (e) => {
  throw TypeError(e);
}, c = (e, r, a, o) => {
  for (var t = o > 1 ? void 0 : o ? $(r, a) : r, n = e.length - 1, u; n >= 0; n--)
    (u = e[n]) && (t = (o ? u(r, a, t) : u(t)) || t);
  return o && t && z(r, a, t), t;
}, m = (e, r, a) => r.has(e) || g("Cannot " + a), w = (e, r, a) => (m(e, r, "read from private field"), r.get(e)), k = (e, r, a) => r.has(e) ? g("Cannot add the same private member more than once") : r instanceof WeakSet ? r.add(e) : r.set(e, a), f = (e, r, a, o) => (m(e, r, "write to private field"), r.set(e, a), a), d;
let l = class extends x {
  constructor() {
    super(...arguments), this._isTesting = !1, this._errorMessage = null, k(this, d, !1);
  }
  connectedCallback() {
    super.connectedCallback(), f(this, d, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), f(this, d, !1);
  }
  async _handleTest() {
    const e = this.data?.provider;
    if (!e) {
      this._errorMessage = "No provider specified";
      return;
    }
    this._isTesting = !0, this._errorMessage = null, this._testResult = void 0;
    const { data: r, error: a } = await y.testExchangeRateProvider(e.alias);
    if (w(this, d)) {
      if (a) {
        this._errorMessage = a.message, this._isTesting = !1;
        return;
      }
      this._testResult = r, this._isTesting = !1;
    }
  }
  _handleClose() {
    this.modalContext?.reject();
  }
  _formatDate(e) {
    return e ? new Date(e).toLocaleString() : "Unknown";
  }
  _formatRate(e) {
    return e >= 100 ? p(e, 2) : e >= 1 ? p(e, 4) : p(e, 6);
  }
  _renderProviderInfo() {
    const e = this.data?.provider;
    return e ? s`
      <div class="provider-info">
        <div class="provider-header">
          ${e.icon ? s`<uui-icon name="${e.icon}"></uui-icon>` : s`<uui-icon name="icon-globe"></uui-icon>`}
          <div class="provider-details">
            <span class="provider-name">${e.displayName}</span>
            <span class="provider-alias">${e.alias}</span>
          </div>
        </div>
        ${e.description ? s`<p class="provider-description">${e.description}</p>` : i}
        <div class="provider-features">
          ${e.supportsHistoricalRates ? s`<span class="feature-badge">Supports Historical Rates</span>` : i}
          ${e.supportedCurrencies.length > 0 ? s`<span class="feature-badge">${e.supportedCurrencies.length} Currencies</span>` : i}
        </div>
      </div>
    ` : i;
  }
  _renderResults() {
    if (!this._testResult) return i;
    const { isSuccessful: e, errorMessage: r, baseCurrency: a, sampleRates: o, rateTimestamp: t, totalRatesCount: n } = this._testResult;
    return s`
      <div class="results-section">
        <h3>Test Results</h3>

        ${!e && r ? s`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <div>
                  <p>${r}</p>
                </div>
              </div>
            ` : i}

        ${e ? s`
              <div class="result-card success">
                <div class="result-header">
                  <uui-icon name="icon-check"></uui-icon>
                  <span>Successfully fetched exchange rates</span>
                </div>
              </div>
            ` : i}

        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Base Currency</span>
            <span class="detail-value">
              <span class="badge">${a}</span>
            </span>
          </div>

          <div class="detail-row">
            <span class="detail-label">Total Rates Available</span>
            <span class="detail-value">${n} currencies</span>
          </div>

          ${t ? s`
                <div class="detail-row">
                  <span class="detail-label">Rate Timestamp</span>
                  <span class="detail-value">${this._formatDate(t)}</span>
                </div>
              ` : i}

          ${o && Object.keys(o).length > 0 ? s`
                <div class="detail-section">
                  <span class="detail-label">Sample Rates (1 ${a} =)</span>
                  <div class="rates-table">
                    ${Object.entries(o).map(
      ([u, h]) => s`
                        <div class="rate-row">
                          <span class="rate-currency">${u}</span>
                          <span class="rate-value">${this._formatRate(h)}</span>
                        </div>
                      `
    )}
                  </div>
                </div>
              ` : i}
        </div>
      </div>
    `;
  }
  render() {
    const e = this.data?.provider?.displayName ?? "Provider";
    return s`
      <umb-body-layout headline="Test ${e}">
        <div id="main">
          ${this._errorMessage ? s`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                  <uui-button look="secondary" compact label="Dismiss" @click=${() => this._errorMessage = null}>
                    Dismiss
                  </uui-button>
                </div>
              ` : i}

          ${this._renderProviderInfo()}

          <div class="instructions">
            <p>
              Click "Test Provider" to fetch exchange rates from this provider. This will validate
              that the provider is configured correctly and can retrieve rates.
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
            ${this._isTesting ? s`<uui-loader-circle></uui-loader-circle>` : i}
            ${this._isTesting ? "Testing..." : "Test Provider"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
l.styles = b`
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

    .provider-header > uui-icon {
      font-size: 1.5rem;
      color: var(--uui-color-text-alt);
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
      gap: var(--uui-size-space-3);
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

    .detail-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
    }

    .detail-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
    }

    .detail-value {
      word-break: break-all;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      background: var(--uui-color-surface-alt);
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .rates-table {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: var(--uui-size-space-2);
    }

    .rate-row {
      display: flex;
      justify-content: space-between;
      padding: var(--uui-size-space-2);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .rate-currency {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .rate-value {
      font-family: monospace;
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
c([
  v()
], l.prototype, "_isTesting", 2);
c([
  v()
], l.prototype, "_testResult", 2);
c([
  v()
], l.prototype, "_errorMessage", 2);
l = c([
  _("merchello-exchange-rate-provider-test-modal")
], l);
const P = l;
export {
  l as MerchelloExchangeRateProviderTestModalElement,
  P as default
};
//# sourceMappingURL=test-provider-modal.element-BLao488n.js.map
