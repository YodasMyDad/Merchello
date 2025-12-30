import { html as a, nothing as i, css as F, state as d, customElement as E } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as z } from "@umbraco-cms/backoffice/modal";
import { M as b } from "./merchello-api-BtOE5E-_.js";
import { b as R, a as W } from "./store-settings-CnI1tEbR.js";
var h = /* @__PURE__ */ ((e) => (e[e.Redirect = 0] = "Redirect", e[e.HostedFields = 10] = "HostedFields", e[e.Widget = 20] = "Widget", e[e.DirectForm = 30] = "DirectForm", e))(h || {}), C = Object.defineProperty, L = Object.getOwnPropertyDescriptor, T = (e) => {
  throw TypeError(e);
}, l = (e, t, s, r) => {
  for (var o = r > 1 ? void 0 : r ? L(t, s) : t, c = e.length - 1, m; c >= 0; c--)
    (m = e[c]) && (o = (r ? m(t, s, o) : m(o)) || o);
  return r && o && C(t, s, o), o;
}, S = (e, t, s) => t.has(e) || T("Cannot " + s), u = (e, t, s) => (S(e, t, "read from private field"), t.get(e)), x = (e, t, s) => t.has(e) ? T("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), f = (e, t, s, r) => (S(e, t, "write to private field"), t.set(e, s), s), v, p;
const w = "merchello-test-payment-provider-form", P = {
  stripe: { card: "4242 4242 4242 4242", expiry: "Any future date", cvv: "Any 3 digits" },
  braintree: { card: "4111 1111 1111 1111", expiry: "Any future date", cvv: "Any 3 digits" },
  default: { card: "4242 4242 4242 4242", expiry: "Any future date", cvv: "Any 3 digits" }
};
let n = class extends z {
  constructor() {
    super(...arguments), this._activeTab = "session", this._amount = 100, this._isTesting = !1, this._isLoadingPaymentForm = !1, this._paymentFormLoaded = !1, this._isProcessingPayment = !1, x(this, v), this._expressMethods = [], this._isLoadingExpressMethods = !1, this._webhookTemplates = [], this._isLoadingWebhookTemplates = !1, this._customWebhookPayload = "", this._useCustomPayload = !1, this._isSimulatingWebhook = !1, this._errorMessage = null, x(this, p, !1);
  }
  connectedCallback() {
    super.connectedCallback(), f(this, p, !0), this._restoreSavedValues(), R();
  }
  disconnectedCallback() {
    if (super.disconnectedCallback(), f(this, p, !1), u(this, v)?.teardown)
      try {
        u(this, v).teardown();
      } catch {
      }
    f(this, v, void 0);
  }
  _restoreSavedValues() {
    try {
      const e = localStorage.getItem(w);
      if (e) {
        const t = JSON.parse(e);
        t.amount !== void 0 && (this._amount = t.amount), t.activeTab && (this._activeTab = t.activeTab);
      }
    } catch {
    }
  }
  _saveFormValues() {
    try {
      const e = {
        amount: this._amount,
        activeTab: this._activeTab
      };
      localStorage.setItem(w, JSON.stringify(e));
    } catch {
    }
  }
  async _handleTabChange(e) {
    this._activeTab = e, this._saveFormValues(), e === "webhooks" && this._webhookTemplates.length === 0 && await this._loadWebhookTemplates(), e === "express" && this._expressMethods.length === 0 && await this._loadExpressMethods();
  }
  // ============================================
  // Session Tab
  // ============================================
  async _handleTestSession() {
    this._isTesting = !0, this._errorMessage = null, this._testResult = void 0, this._saveFormValues();
    const e = this.data?.setting.id;
    if (!e) {
      this._errorMessage = "Setting ID missing.", this._isTesting = !1;
      return;
    }
    const t = { amount: this._amount }, { data: s, error: r } = await b.testPaymentProvider(e, t);
    if (u(this, p)) {
      if (r) {
        this._errorMessage = r.message, this._isTesting = !1;
        return;
      }
      this._testResult = s, this._isTesting = !1;
    }
  }
  // ============================================
  // Payment Form Tab
  // ============================================
  async _handleLoadPaymentForm() {
    this._isLoadingPaymentForm = !0, this._paymentFormError = void 0, this._paymentFormLoaded = !1;
    const e = this.data?.setting.id;
    if (!e) {
      this._paymentFormError = "Setting ID missing.", this._isLoadingPaymentForm = !1;
      return;
    }
    const t = { amount: this._amount }, { data: s, error: r } = await b.testPaymentProvider(e, t);
    if (u(this, p)) {
      if (r || !s?.isSuccessful) {
        this._paymentFormError = r?.message || s?.errorMessage || "Failed to create session", this._isLoadingPaymentForm = !1;
        return;
      }
      if (this._testResult = s, s.integrationType === h.Redirect) {
        this._paymentFormError = "Redirect integrations cannot render inline forms. Use the Session tab to get the redirect URL.", this._isLoadingPaymentForm = !1;
        return;
      }
      if (s.integrationType === h.DirectForm) {
        this._paymentFormLoaded = !0, this._isLoadingPaymentForm = !1;
        return;
      }
      if (!s.javaScriptSdkUrl || !s.adapterUrl) {
        this._paymentFormError = "Provider did not return SDK or adapter URLs.", this._isLoadingPaymentForm = !1;
        return;
      }
      try {
        await this._loadScript(s.javaScriptSdkUrl), await this._loadScript(s.adapterUrl), await this._renderPaymentAdapter(s), this._paymentFormLoaded = !0;
      } catch (o) {
        this._paymentFormError = o instanceof Error ? o.message : "Failed to load payment form";
      }
      this._isLoadingPaymentForm = !1;
    }
  }
  _loadScript(e, t = 3e4) {
    return new Promise((s, r) => {
      if (document.querySelector(`script[src="${e}"]`)) {
        s();
        return;
      }
      const o = document.createElement("script");
      o.src = e;
      const c = setTimeout(() => {
        r(new Error(`Script loading timed out after ${t / 1e3} seconds: ${e}`));
      }, t);
      o.onload = () => {
        clearTimeout(c), s();
      }, o.onerror = () => {
        clearTimeout(c), r(new Error(`Failed to load script: ${e}`));
      }, document.head.appendChild(o);
    });
  }
  async _renderPaymentAdapter(e) {
    const t = window.MerchelloPaymentAdapters;
    if (!t)
      throw new Error("Payment adapters not found. SDK may not have loaded correctly.");
    const s = t[e.providerAlias];
    if (!s?.render)
      throw new Error(`Adapter for '${e.providerAlias}' not found or missing render method.`);
    await new Promise((c) => requestAnimationFrame(c));
    const r = this.shadowRoot?.querySelector("#payment-form-container");
    if (!r)
      throw new Error("Payment form container not found.");
    const o = {
      showError: (c) => {
        this._paymentFormError = c;
      },
      hideError: () => {
        this._paymentFormError = void 0;
      }
    };
    await s.render(r, e, o), f(this, v, s);
  }
  async _handleProcessTestPayment() {
    if (!u(this, v)?.tokenize) {
      this._paymentFormError = "Payment adapter does not support tokenization.";
      return;
    }
    if (!this._testResult?.sessionId) {
      this._paymentFormError = "No active session. Please load the payment form first.";
      return;
    }
    const e = this.data?.setting.id;
    if (!e) {
      this._paymentFormError = "Setting ID missing.";
      return;
    }
    this._isProcessingPayment = !0, this._paymentFormError = void 0, this._paymentResult = void 0;
    try {
      const t = await u(this, v).tokenize();
      if (!t.success) {
        t.isButtonFlow ? this._paymentFormError = t.error || "Please use the payment button to complete payment." : this._paymentFormError = t.error || "Failed to get payment details. Please check your card information.", this._isProcessingPayment = !1;
        return;
      }
      const { data: s, error: r } = await b.processTestPayment(e, {
        sessionId: this._testResult.sessionId,
        paymentMethodToken: t.nonce,
        methodAlias: this._testResult.methodAlias,
        amount: this._amount,
        testInvoiceId: this._testResult.testInvoiceId
      });
      if (!u(this, p)) return;
      r ? this._paymentResult = {
        success: !1,
        message: r.message
      } : s && (this._paymentResult = {
        success: s.success,
        message: s.success ? `Payment successful! Transaction ID: ${s.transactionId || "N/A"}` : s.errorMessage || "Payment failed.",
        transactionId: s.transactionId
      });
    } catch (t) {
      this._paymentResult = {
        success: !1,
        message: t instanceof Error ? t.message : "An unexpected error occurred."
      };
    }
    this._isProcessingPayment = !1;
  }
  // ============================================
  // Express Checkout Tab
  // ============================================
  async _loadExpressMethods() {
    this._isLoadingExpressMethods = !0;
    const e = this.data?.setting.id;
    if (!e) {
      this._isLoadingExpressMethods = !1;
      return;
    }
    const { data: t } = await b.getPaymentProviderMethods(e);
    u(this, p) && (t && (this._expressMethods = t.filter((s) => s.isExpressCheckout && s.isEnabled)), this._isLoadingExpressMethods = !1);
  }
  // ============================================
  // Webhook Tab
  // ============================================
  async _loadWebhookTemplates() {
    this._isLoadingWebhookTemplates = !0;
    const e = this.data?.setting.id;
    if (!e) {
      this._isLoadingWebhookTemplates = !1;
      return;
    }
    const { data: t } = await b.getWebhookEventTemplates(e);
    u(this, p) && (t && (this._webhookTemplates = t, t.length > 0 && !this._selectedWebhookEvent && (this._selectedWebhookEvent = t[0].eventType)), this._isLoadingWebhookTemplates = !1);
  }
  async _handleSimulateWebhook() {
    this._isSimulatingWebhook = !0, this._webhookResult = void 0;
    const e = this.data?.setting.id;
    if (!e) {
      this._webhookResult = { success: !1, validationSkipped: !1, validationPassed: !1, actionsPerformed: [], errorMessage: "Setting ID missing." }, this._isSimulatingWebhook = !1;
      return;
    }
    const t = {
      eventType: this._selectedWebhookEvent || "payment.completed",
      amount: this._amount,
      customPayload: this._useCustomPayload ? this._customWebhookPayload : void 0
    }, { data: s, error: r } = await b.simulateWebhook(e, t);
    u(this, p) && (r ? this._webhookResult = { success: !1, validationSkipped: !1, validationPassed: !1, actionsPerformed: [], errorMessage: r.message } : s && (this._webhookResult = s), this._isSimulatingWebhook = !1);
  }
  // ============================================
  // Rendering
  // ============================================
  _handleClose() {
    this.modalContext?.reject();
  }
  _getIntegrationTypeName(e) {
    switch (e) {
      case h.Redirect:
        return "Redirect";
      case h.HostedFields:
        return "Hosted Fields";
      case h.Widget:
        return "Widget";
      case h.DirectForm:
        return "Direct Form";
      default:
        return "Unknown";
    }
  }
  _getTestCardInfo() {
    const e = this.data?.setting.providerAlias?.toLowerCase() || "default";
    return P[e] || P.default;
  }
  _renderTabs() {
    return a`
      <div class="tabs">
        <button
          class="tab ${this._activeTab === "session" ? "active" : ""}"
          @click=${() => this._handleTabChange("session")}
        >
          Session
        </button>
        <button
          class="tab ${this._activeTab === "payment" ? "active" : ""}"
          @click=${() => this._handleTabChange("payment")}
        >
          Payment Form
        </button>
        <button
          class="tab ${this._activeTab === "express" ? "active" : ""}"
          @click=${() => this._handleTabChange("express")}
        >
          Express Checkout
        </button>
        <button
          class="tab ${this._activeTab === "webhooks" ? "active" : ""}"
          @click=${() => this._handleTabChange("webhooks")}
        >
          Webhooks
        </button>
      </div>
    `;
  }
  _renderAmountInput() {
    const e = W();
    return a`
      <div class="form-row">
        <label>Test Amount (${e})</label>
        <uui-input
          type="number"
          min="0.01"
          step="0.01"
          .value=${String(this._amount)}
          @input=${(t) => this._amount = parseFloat(t.target.value) || 100}
        ></uui-input>
      </div>
    `;
  }
  _renderSessionTab() {
    return a`
      <div class="tab-content">
        <p class="tab-description">Test your provider configuration by creating a payment session.</p>

        ${this._renderAmountInput()}

        <uui-button
          look="primary"
          ?disabled=${this._isTesting}
          @click=${this._handleTestSession}
        >
          ${this._isTesting ? a`<uui-loader-circle></uui-loader-circle>` : i}
          ${this._isTesting ? "Creating Session..." : "Create Test Session"}
        </uui-button>

        ${this._testResult ? this._renderSessionResults() : i}
      </div>
    `;
  }
  _renderSessionResults() {
    if (!this._testResult) return i;
    const { isSuccessful: e, integrationType: t, errorMessage: s, errorCode: r, sessionId: o, redirectUrl: c, clientToken: m, clientSecret: y, javaScriptSdkUrl: _, adapterUrl: $, formFields: k } = this._testResult;
    return a`
      <div class="results-section">
        ${!e && s ? a`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <div>
                  <p>${s}</p>
                  ${r ? a`<p class="error-code">Error code: ${r}</p>` : i}
                </div>
              </div>
            ` : i}

        ${e ? a`
              <div class="result-card success">
                <uui-icon name="icon-check"></uui-icon>
                <span>Session created successfully</span>
              </div>
            ` : i}

        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Integration Type</span>
            <span class="badge">${this._getIntegrationTypeName(t)}</span>
          </div>

          ${o ? a`
            <div class="detail-row">
              <span class="detail-label">Session ID</span>
              <span class="detail-value monospace">${o}</span>
            </div>
          ` : i}

          ${c ? a`
            <div class="detail-row">
              <span class="detail-label">Redirect URL</span>
              <a href="${c}" target="_blank" rel="noopener noreferrer" class="url-link">
                ${c} <uui-icon name="icon-out"></uui-icon>
              </a>
            </div>
          ` : i}

          ${m ? a`
            <div class="detail-row">
              <span class="detail-label">Client Token</span>
              <span class="detail-value monospace truncate" title="${m}">${m}</span>
            </div>
          ` : i}

          ${y ? a`
            <div class="detail-row">
              <span class="detail-label">Client Secret</span>
              <span class="detail-value monospace truncate" title="${y}">${y}</span>
            </div>
          ` : i}

          ${_ ? a`
            <div class="detail-row">
              <span class="detail-label">JavaScript SDK URL</span>
              <a href="${_}" target="_blank" rel="noopener noreferrer" class="url-link">
                ${_} <uui-icon name="icon-out"></uui-icon>
              </a>
            </div>
          ` : i}

          ${$ ? a`
            <div class="detail-row">
              <span class="detail-label">Adapter URL</span>
              <span class="detail-value monospace">${$}</span>
            </div>
          ` : i}

          ${k && k.length > 0 ? a`
            <div class="detail-section">
              <span class="detail-label">Form Fields</span>
              <div class="form-fields-list">
                ${k.map((g) => a`
                  <div class="form-field-item">
                    <span class="field-label">${g.label}</span>
                    <span class="field-key">${g.key}</span>
                    <div class="field-meta">
                      <span class="field-type">${g.fieldType}</span>
                      ${g.isRequired ? a`<span class="field-required">Required</span>` : i}
                    </div>
                  </div>
                `)}
              </div>
            </div>
          ` : i}
        </div>
      </div>
    `;
  }
  _renderPaymentFormTab() {
    const e = this._getTestCardInfo(), t = this._testResult?.integrationType === h.Widget;
    return a`
      <div class="tab-content">
        <p class="tab-description">Load and test the actual payment form with sandbox credentials.</p>

        ${this._renderAmountInput()}

        <div class="test-card-info">
          <strong>Test Card:</strong> ${e.card} | <strong>Exp:</strong> ${e.expiry} | <strong>CVV:</strong> ${e.cvv}
        </div>

        ${this._paymentFormLoaded ? i : a`
          <uui-button
            look="primary"
            ?disabled=${this._isLoadingPaymentForm}
            @click=${this._handleLoadPaymentForm}
          >
            ${this._isLoadingPaymentForm ? a`<uui-loader-circle></uui-loader-circle>` : i}
            ${this._isLoadingPaymentForm ? "Loading..." : "Load Payment Form"}
          </uui-button>
        `}

        ${this._paymentFormError ? a`
          <div class="result-errors">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._paymentFormError}</span>
          </div>
        ` : i}

        <div id="payment-form-container" class="${this._paymentFormLoaded ? "visible" : "hidden"}">
          <!-- Payment form will be rendered here by the adapter -->
        </div>

        ${this._paymentFormLoaded && !t ? a`
          <uui-button
            look="primary"
            ?disabled=${this._isProcessingPayment}
            @click=${this._handleProcessTestPayment}
          >
            ${this._isProcessingPayment ? a`<uui-loader-circle></uui-loader-circle>` : i}
            ${this._isProcessingPayment ? "Processing..." : "Process Test Payment"}
          </uui-button>
        ` : i}

        ${this._paymentFormLoaded && t ? a`
          <p class="hint">Use the payment buttons above to complete the test payment.</p>
        ` : i}

        ${this._paymentResult ? a`
          <div class="result-card ${this._paymentResult.success ? "success" : "error"}">
            <uui-icon name="${this._paymentResult.success ? "icon-check" : "icon-alert"}"></uui-icon>
            <span>${this._paymentResult.message}</span>
          </div>
        ` : i}
      </div>
    `;
  }
  _renderExpressCheckoutTab() {
    return a`
      <div class="tab-content">
        <p class="tab-description">Express checkout buttons (Apple Pay, Google Pay, PayPal) require domain verification and HTTPS.</p>

        <div class="warning-box">
          <uui-icon name="icon-alert"></uui-icon>
          <span>Express checkout buttons may not work in the backoffice due to domain restrictions. Use these tests on your actual checkout page.</span>
        </div>

        ${this._isLoadingExpressMethods ? a`
          <uui-loader-bar></uui-loader-bar>
        ` : i}

        ${!this._isLoadingExpressMethods && this._expressMethods.length === 0 ? a`
          <p class="empty-state">No express checkout methods enabled for this provider.</p>
        ` : i}

        ${this._expressMethods.length > 0 ? a`
          <div class="express-methods-list">
            ${this._expressMethods.map((e) => a`
              <div class="express-method-item">
                <span class="method-name">${e.displayName}</span>
                <span class="method-alias">${e.methodAlias}</span>
              </div>
            `)}
          </div>
        ` : i}
      </div>
    `;
  }
  _renderWebhooksTab() {
    return a`
      <div class="tab-content">
        <p class="tab-description">Simulate webhook events to test your provider's webhook handling.</p>

        ${this._isLoadingWebhookTemplates ? a`
          <uui-loader-bar></uui-loader-bar>
        ` : i}

        ${this._isLoadingWebhookTemplates ? i : a`
          ${this._webhookTemplates.length > 0 ? a`
            <div class="form-row">
              <label>Event Type</label>
              <uui-select
                .value=${this._selectedWebhookEvent || ""}
                @change=${(e) => this._selectedWebhookEvent = e.target.value}
              >
                ${this._webhookTemplates.map((e) => a`
                  <uui-select-option value="${e.eventType}">${e.displayName}</uui-select-option>
                `)}
              </uui-select>
            </div>
          ` : i}

          <div class="form-row">
            <label>
              <uui-checkbox
                ?checked=${this._useCustomPayload}
                @change=${(e) => this._useCustomPayload = e.target.checked}
              ></uui-checkbox>
              Use custom payload
            </label>
          </div>

          ${this._useCustomPayload ? a`
            <div class="form-row">
              <label>Custom Payload (JSON)</label>
              <uui-textarea
                .value=${this._customWebhookPayload}
                @input=${(e) => this._customWebhookPayload = e.target.value}
                placeholder='{"type": "payment.completed", ...}'
              ></uui-textarea>
              <span class="hint">Enter the raw webhook JSON payload to test.</span>
            </div>
          ` : i}

          ${this._renderAmountInput()}

          <uui-button
            look="primary"
            ?disabled=${this._isSimulatingWebhook || !this._useCustomPayload && !this._selectedWebhookEvent}
            @click=${this._handleSimulateWebhook}
          >
            ${this._isSimulatingWebhook ? a`<uui-loader-circle></uui-loader-circle>` : i}
            ${this._isSimulatingWebhook ? "Simulating..." : "Simulate Webhook"}
          </uui-button>

          ${this._webhookResult ? this._renderWebhookResult() : i}
        `}
      </div>
    `;
  }
  _renderWebhookResult() {
    if (!this._webhookResult) return i;
    const { success: e, validationSkipped: t, eventTypeDetected: s, actionsPerformed: r, payload: o, errorMessage: c } = this._webhookResult;
    return a`
      <div class="results-section">
        <div class="result-card ${e ? "success" : "error"}">
          <uui-icon name="${e ? "icon-check" : "icon-alert"}"></uui-icon>
          <span>${e ? "Webhook processed successfully" : "Webhook processing failed"}</span>
        </div>

        ${c ? a`
          <div class="result-errors">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${c}</span>
          </div>
        ` : i}

        <div class="result-details">
          ${t ? a`
            <div class="detail-row">
              <span class="detail-label">Validation</span>
              <span class="badge">Skipped (test mode)</span>
            </div>
          ` : i}

          ${s ? a`
            <div class="detail-row">
              <span class="detail-label">Event Detected</span>
              <span class="detail-value">${s}</span>
            </div>
          ` : i}

          ${r && r.length > 0 ? a`
            <div class="detail-section">
              <span class="detail-label">Actions Performed</span>
              <ul class="actions-list">
                ${r.map((m) => a`<li>${m}</li>`)}
              </ul>
            </div>
          ` : i}

          ${o ? a`
            <details class="payload-details">
              <summary>View Payload</summary>
              <pre class="payload-content">${o}</pre>
            </details>
          ` : i}
        </div>
      </div>
    `;
  }
  render() {
    const e = this.data?.setting.displayName ?? "Provider";
    return a`
      <umb-body-layout headline="Test ${e}">
        <div id="main">
          ${this._errorMessage ? a`
            <div class="error-banner">
              <uui-icon name="icon-alert"></uui-icon>
              <span>${this._errorMessage}</span>
              <uui-button look="secondary" compact @click=${() => this._errorMessage = null}>Dismiss</uui-button>
            </div>
          ` : i}

          ${this._renderTabs()}

          ${this._activeTab === "session" ? this._renderSessionTab() : i}
          ${this._activeTab === "payment" ? this._renderPaymentFormTab() : i}
          ${this._activeTab === "express" ? this._renderExpressCheckoutTab() : i}
          ${this._activeTab === "webhooks" ? this._renderWebhooksTab() : i}
        </div>

        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>Close</uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
v = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
n.styles = F`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--uui-color-border);
      margin-bottom: var(--uui-size-space-2);
    }

    .tab {
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--uui-color-text-alt);
      transition: all 0.2s ease;
    }

    .tab:hover {
      color: var(--uui-color-text);
      background: var(--uui-color-surface-alt);
    }

    .tab.active {
      color: var(--uui-color-interactive);
      border-bottom-color: var(--uui-color-interactive);
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .tab-description {
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    /* Form elements */
    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    label {
      font-weight: 600;
      font-size: 0.8125rem;
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    uui-input, uui-select, uui-textarea {
      width: 100%;
    }

    uui-textarea {
      min-height: 100px;
      font-family: monospace;
    }

    /* Test card info */
    .test-card-info {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      font-size: 0.8125rem;
      font-family: monospace;
    }

    /* Warning box */
    .warning-box {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-warning-emphasis);
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
    }

    /* Payment form container */
    #payment-form-container {
      min-height: 200px;
      padding: var(--uui-size-space-4);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
    }

    #payment-form-container.hidden {
      display: none;
    }

    /* Results */
    .results-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-3);
    }

    .result-card {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      font-weight: 600;
    }

    .result-card.success {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .result-card.error {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .result-errors {
      display: flex;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
    }

    .result-errors p {
      margin: 0;
    }

    .error-code {
      font-size: 0.75rem;
      margin-top: var(--uui-size-space-2) !important;
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

    /* Error banner */
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

    /* Form fields list */
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

    /* Express methods list */
    .express-methods-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .express-method-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .method-name {
      font-weight: 600;
    }

    .method-alias {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      font-family: monospace;
    }

    .empty-state {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    /* Actions list */
    .actions-list {
      margin: 0;
      padding-left: var(--uui-size-space-5);
    }

    .actions-list li {
      margin: var(--uui-size-space-1) 0;
    }

    /* Payload details */
    .payload-details {
      margin-top: var(--uui-size-space-2);
    }

    .payload-details summary {
      cursor: pointer;
      color: var(--uui-color-interactive);
      font-size: 0.875rem;
    }

    .payload-content {
      margin: var(--uui-size-space-2) 0 0 0;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      font-size: 0.75rem;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
l([
  d()
], n.prototype, "_activeTab", 2);
l([
  d()
], n.prototype, "_amount", 2);
l([
  d()
], n.prototype, "_isTesting", 2);
l([
  d()
], n.prototype, "_testResult", 2);
l([
  d()
], n.prototype, "_isLoadingPaymentForm", 2);
l([
  d()
], n.prototype, "_paymentFormLoaded", 2);
l([
  d()
], n.prototype, "_paymentFormError", 2);
l([
  d()
], n.prototype, "_isProcessingPayment", 2);
l([
  d()
], n.prototype, "_paymentResult", 2);
l([
  d()
], n.prototype, "_expressMethods", 2);
l([
  d()
], n.prototype, "_isLoadingExpressMethods", 2);
l([
  d()
], n.prototype, "_webhookTemplates", 2);
l([
  d()
], n.prototype, "_isLoadingWebhookTemplates", 2);
l([
  d()
], n.prototype, "_selectedWebhookEvent", 2);
l([
  d()
], n.prototype, "_customWebhookPayload", 2);
l([
  d()
], n.prototype, "_useCustomPayload", 2);
l([
  d()
], n.prototype, "_isSimulatingWebhook", 2);
l([
  d()
], n.prototype, "_webhookResult", 2);
l([
  d()
], n.prototype, "_errorMessage", 2);
n = l([
  E("merchello-test-payment-provider-modal")
], n);
const U = n;
export {
  n as MerchelloTestPaymentProviderModalElement,
  U as default
};
//# sourceMappingURL=test-provider-modal.element-C8BrEsH_.js.map
