import { html as r, nothing as i, css as $, state as m, customElement as k } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as z } from "@umbraco-cms/backoffice/modal";
import { M as w } from "./merchello-api-BSrPLgGs.js";
import { a as S, g as T } from "./store-settings-CoNaLkN5.js";
var c = /* @__PURE__ */ ((e) => (e[e.Redirect = 0] = "Redirect", e[e.HostedFields = 10] = "HostedFields", e[e.Widget = 20] = "Widget", e[e.DirectForm = 30] = "DirectForm", e))(c || {}), C = Object.defineProperty, R = Object.getOwnPropertyDescriptor, x = (e) => {
  throw TypeError(e);
}, v = (e, s, a, t) => {
  for (var o = t > 1 ? void 0 : t ? R(s, a) : s, n = e.length - 1, u; n >= 0; n--)
    (u = e[n]) && (o = (t ? u(s, a, o) : u(o)) || o);
  return t && o && C(s, a, o), o;
}, y = (e, s, a) => s.has(e) || x("Cannot " + a), M = (e, s, a) => (y(e, s, "read from private field"), s.get(e)), F = (e, s, a) => s.has(e) ? x("Cannot add the same private member more than once") : s instanceof WeakSet ? s.add(e) : s.set(e, a), b = (e, s, a, t) => (y(e, s, "write to private field"), s.set(e, a), a), p;
const _ = "merchello-test-payment-provider-form";
let l = class extends z {
  constructor() {
    super(...arguments), this._amount = 100, this._isTesting = !1, this._errorMessage = null, F(this, p, !1);
  }
  connectedCallback() {
    super.connectedCallback(), b(this, p, !0), this._restoreSavedValues(), S();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), b(this, p, !1);
  }
  _restoreSavedValues() {
    try {
      const e = localStorage.getItem(_);
      if (e) {
        const s = JSON.parse(e);
        s.amount !== void 0 && (this._amount = s.amount);
      }
    } catch {
    }
  }
  _saveFormValues() {
    try {
      const e = {
        amount: this._amount
      };
      localStorage.setItem(_, JSON.stringify(e));
    } catch {
    }
  }
  async _handleTest() {
    this._isTesting = !0, this._errorMessage = null, this._testResult = void 0, this._saveFormValues();
    const e = this.data?.setting.id;
    if (!e) {
      this._errorMessage = "Setting ID missing.", this._isTesting = !1;
      return;
    }
    const s = {
      amount: this._amount
    }, { data: a, error: t } = await w.testPaymentProvider(e, s);
    if (M(this, p)) {
      if (t) {
        this._errorMessage = t.message, this._isTesting = !1;
        return;
      }
      this._testResult = a, this._isTesting = !1;
    }
  }
  _handleClose() {
    this.modalContext?.reject();
  }
  _getIntegrationTypeName(e) {
    switch (e) {
      case c.Redirect:
        return "Redirect";
      case c.HostedFields:
        return "Hosted Fields";
      case c.Widget:
        return "Widget";
      case c.DirectForm:
        return "Direct Form";
      default:
        return "Unknown";
    }
  }
  _renderForm() {
    const e = T();
    return r`
      <div class="form-section">
        <h3>Test Configuration</h3>
        <div class="form-row">
          <label>Test Amount (${e})</label>
          <uui-input
            type="number"
            min="0.01"
            step="0.01"
            .value=${String(this._amount)}
            @input=${(s) => this._amount = parseFloat(s.target.value) || 100}
          ></uui-input>
          <span class="hint">Amount used for the test payment session</span>
        </div>
      </div>
    `;
  }
  _renderResults() {
    if (!this._testResult) return i;
    const { success: e, integrationType: s, errorMessage: a, errorCode: t, sessionId: o, redirectUrl: n, clientToken: u, clientSecret: f, javaScriptSdkUrl: g, formFields: h } = this._testResult;
    return r`
      <div class="results-section">
        <h3>Results</h3>

        ${!e && a ? r`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <div>
                  <p>${a}</p>
                  ${t ? r`<p class="error-code">Error code: ${t}</p>` : i}
                </div>
              </div>
            ` : i}

        ${e ? r`
              <div class="result-card success">
                <div class="result-header">
                  <uui-icon name="icon-check"></uui-icon>
                  <span>Session created successfully</span>
                </div>
              </div>
            ` : i}

        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Integration Type</span>
            <span class="detail-value">
              <span class="badge">${this._getIntegrationTypeName(s)}</span>
            </span>
          </div>

          ${o ? r`
                <div class="detail-row">
                  <span class="detail-label">Session ID</span>
                  <span class="detail-value monospace">${o}</span>
                </div>
              ` : i}

          ${n ? r`
                <div class="detail-row">
                  <span class="detail-label">Redirect URL</span>
                  <span class="detail-value">
                    <a href="${n}" target="_blank" rel="noopener noreferrer" class="url-link">
                      ${n}
                      <uui-icon name="icon-out"></uui-icon>
                    </a>
                  </span>
                </div>
              ` : i}

          ${u ? r`
                <div class="detail-row">
                  <span class="detail-label">Client Token</span>
                  <span class="detail-value monospace truncate" title="${u}">${u}</span>
                </div>
              ` : i}

          ${f ? r`
                <div class="detail-row">
                  <span class="detail-label">Client Secret</span>
                  <span class="detail-value monospace truncate" title="${f}">${f}</span>
                </div>
              ` : i}

          ${g ? r`
                <div class="detail-row">
                  <span class="detail-label">JavaScript SDK URL</span>
                  <span class="detail-value">
                    <a href="${g}" target="_blank" rel="noopener noreferrer" class="url-link">
                      ${g}
                      <uui-icon name="icon-out"></uui-icon>
                    </a>
                  </span>
                </div>
              ` : i}

          ${h && h.length > 0 ? r`
                <div class="detail-section">
                  <span class="detail-label">Form Fields</span>
                  <div class="form-fields-list">
                    ${h.map(
      (d) => r`
                        <div class="form-field-item">
                          <span class="field-label">${d.label}</span>
                          <span class="field-key">${d.key}</span>
                          <div class="field-meta">
                            <span class="field-type">${d.fieldType}</span>
                            ${d.isRequired ? r`<span class="field-required">Required</span>` : i}
                          </div>
                          ${d.description ? r`<span class="field-description">${d.description}</span>` : i}
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
    const e = this.data?.setting.displayName ?? "Provider";
    return r`
      <umb-body-layout headline="Test ${e}">
        <div id="main">
          ${this._errorMessage ? r`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                  <uui-button
                    look="secondary"
                    compact
                    @click=${() => this._errorMessage = null}
                  >
                    Dismiss
                  </uui-button>
                </div>
              ` : i}

          ${this._renderForm()}
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
            ${this._isTesting ? r`<uui-loader-circle></uui-loader-circle>` : i}
            ${this._isTesting ? "Testing..." : "Test Provider"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
p = /* @__PURE__ */ new WeakMap();
l.styles = $`
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

    .form-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .form-section h3 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      border-bottom: 1px solid var(--uui-color-border);
      padding-bottom: var(--uui-size-space-2);
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    label {
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    uui-input {
      width: 100%;
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

    .error-code {
      font-size: 0.75rem;
      margin-top: var(--uui-size-space-2) !important;
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

    .detail-value.monospace {
      font-family: monospace;
      font-size: 0.8125rem;
    }

    .detail-value.truncate {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      background: var(--uui-color-surface-alt);
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .url-link {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      color: var(--uui-color-interactive);
      text-decoration: none;
      word-break: break-all;
    }

    .url-link:hover {
      text-decoration: underline;
    }

    .url-link uui-icon {
      flex-shrink: 0;
    }

    .form-fields-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .form-field-item {
      padding: var(--uui-size-space-2);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .field-label {
      font-weight: 600;
      display: block;
    }

    .field-key {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      font-family: monospace;
    }

    .field-meta {
      display: flex;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-1);
    }

    .field-type {
      font-size: 0.6875rem;
      padding: 1px 6px;
      background: var(--uui-color-border);
      border-radius: 4px;
    }

    .field-required {
      font-size: 0.6875rem;
      padding: 1px 6px;
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: 4px;
    }

    .field-description {
      display: block;
      margin-top: var(--uui-size-space-1);
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
v([
  m()
], l.prototype, "_amount", 2);
v([
  m()
], l.prototype, "_isTesting", 2);
v([
  m()
], l.prototype, "_testResult", 2);
v([
  m()
], l.prototype, "_errorMessage", 2);
l = v([
  k("merchello-test-payment-provider-modal")
], l);
const P = l;
export {
  l as MerchelloTestPaymentProviderModalElement,
  P as default
};
//# sourceMappingURL=test-provider-modal.element-BWdLOFM0.js.map
