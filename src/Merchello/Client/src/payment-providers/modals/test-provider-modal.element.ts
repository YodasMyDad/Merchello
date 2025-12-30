import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { TestPaymentProviderModalData, TestPaymentProviderModalValue } from "./test-provider-modal.token.js";
import type {
  TestPaymentProviderDto,
  TestPaymentProviderResultDto,
  WebhookEventTemplateDto,
  SimulateWebhookDto,
  WebhookSimulationResultDto,
  PaymentMethodSettingDto,
} from '@payment-providers/types/payment-providers.types.js';
import { PaymentIntegrationType } from '@payment-providers/types/payment-providers.types.js';
import { MerchelloApi } from "@api/merchello-api.js";
import { getCurrencySymbol, getStoreSettings } from "@api/store-settings.js";

const STORAGE_KEY = "merchello-test-payment-provider-form";

type TabType = 'session' | 'payment' | 'express' | 'webhooks';

interface SavedFormValues {
  amount?: number;
  activeTab?: TabType;
}

// Test card information for different providers
const TEST_CARDS: Record<string, { card: string; expiry: string; cvv: string }> = {
  stripe: { card: "4242 4242 4242 4242", expiry: "Any future date", cvv: "Any 3 digits" },
  braintree: { card: "4111 1111 1111 1111", expiry: "Any future date", cvv: "Any 3 digits" },
  default: { card: "4242 4242 4242 4242", expiry: "Any future date", cvv: "Any 3 digits" },
};

@customElement("merchello-test-payment-provider-modal")
export class MerchelloTestPaymentProviderModalElement extends UmbModalBaseElement<
  TestPaymentProviderModalData,
  TestPaymentProviderModalValue
> {
  // Tab state
  @state() private _activeTab: TabType = 'session';

  // Form state
  @state() private _amount: number = 100.0;

  // Session tab state
  @state() private _isTesting = false;
  @state() private _testResult?: TestPaymentProviderResultDto;

  // Payment form tab state
  @state() private _isLoadingPaymentForm = false;
  @state() private _paymentFormLoaded = false;
  @state() private _paymentFormError?: string;
  @state() private _isProcessingPayment = false;
  @state() private _paymentResult?: { success: boolean; message: string; transactionId?: string };

  // Payment adapter reference
  #currentAdapter?: {
    render?: (container: HTMLElement, session: unknown, checkout: unknown) => Promise<void>;
    tokenize?: () => Promise<{ success: boolean; nonce?: string; error?: string; isButtonFlow?: boolean }>;
    teardown?: () => void;
  };

  // Express checkout tab state
  @state() private _expressMethods: PaymentMethodSettingDto[] = [];
  @state() private _isLoadingExpressMethods = false;

  // Webhook tab state
  @state() private _webhookTemplates: WebhookEventTemplateDto[] = [];
  @state() private _isLoadingWebhookTemplates = false;
  @state() private _selectedWebhookEvent?: string;
  @state() private _customWebhookPayload = "";
  @state() private _useCustomPayload = false;
  @state() private _isSimulatingWebhook = false;
  @state() private _webhookResult?: WebhookSimulationResultDto;

  // Common state
  @state() private _errorMessage: string | null = null;

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._restoreSavedValues();
    getStoreSettings();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
    // Tear down adapter if active
    if (this.#currentAdapter?.teardown) {
      try {
        this.#currentAdapter.teardown();
      } catch {
        // Ignore teardown errors
      }
    }
    this.#currentAdapter = undefined;
  }

  private _restoreSavedValues(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const values: SavedFormValues = JSON.parse(saved);
        if (values.amount !== undefined) this._amount = values.amount;
        if (values.activeTab) this._activeTab = values.activeTab;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private _saveFormValues(): void {
    try {
      const values: SavedFormValues = {
        amount: this._amount,
        activeTab: this._activeTab,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      // Ignore localStorage errors
    }
  }

  private async _handleTabChange(tab: TabType): Promise<void> {
    this._activeTab = tab;
    this._saveFormValues();

    // Load data when switching to certain tabs
    if (tab === 'webhooks' && this._webhookTemplates.length === 0) {
      await this._loadWebhookTemplates();
    }
    if (tab === 'express' && this._expressMethods.length === 0) {
      await this._loadExpressMethods();
    }
  }

  // ============================================
  // Session Tab
  // ============================================

  private async _handleTestSession(): Promise<void> {
    this._isTesting = true;
    this._errorMessage = null;
    this._testResult = undefined;
    this._saveFormValues();

    const settingId = this.data?.setting.id;
    if (!settingId) {
      this._errorMessage = "Setting ID missing.";
      this._isTesting = false;
      return;
    }

    const request: TestPaymentProviderDto = { amount: this._amount };
    const { data, error } = await MerchelloApi.testPaymentProvider(settingId, request);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isTesting = false;
      return;
    }

    this._testResult = data;
    this._isTesting = false;
  }

  // ============================================
  // Payment Form Tab
  // ============================================

  private async _handleLoadPaymentForm(): Promise<void> {
    this._isLoadingPaymentForm = true;
    this._paymentFormError = undefined;
    this._paymentFormLoaded = false;

    const settingId = this.data?.setting.id;
    if (!settingId) {
      this._paymentFormError = "Setting ID missing.";
      this._isLoadingPaymentForm = false;
      return;
    }

    // First create a test session
    const request: TestPaymentProviderDto = { amount: this._amount };
    const { data, error } = await MerchelloApi.testPaymentProvider(settingId, request);

    if (!this.#isConnected) return;

    if (error || !data?.isSuccessful) {
      this._paymentFormError = error?.message || data?.errorMessage || "Failed to create session";
      this._isLoadingPaymentForm = false;
      return;
    }

    // Store the session result for payment form
    this._testResult = data;

    // Check if this integration type supports payment form rendering
    if (data.integrationType === PaymentIntegrationType.Redirect) {
      this._paymentFormError = "Redirect integrations cannot render inline forms. Use the Session tab to get the redirect URL.";
      this._isLoadingPaymentForm = false;
      return;
    }

    // For DirectForm, we can render form fields directly
    if (data.integrationType === PaymentIntegrationType.DirectForm) {
      this._paymentFormLoaded = true;
      this._isLoadingPaymentForm = false;
      return;
    }

    // For HostedFields/Widget, we need to load the SDK and adapter
    if (!data.javaScriptSdkUrl || !data.adapterUrl) {
      this._paymentFormError = "Provider did not return SDK or adapter URLs.";
      this._isLoadingPaymentForm = false;
      return;
    }

    try {
      // Load SDK script
      await this._loadScript(data.javaScriptSdkUrl);

      // Load adapter script
      await this._loadScript(data.adapterUrl);

      // Try to render the payment form
      await this._renderPaymentAdapter(data);

      this._paymentFormLoaded = true;
    } catch (err) {
      this._paymentFormError = err instanceof Error ? err.message : "Failed to load payment form";
    }

    this._isLoadingPaymentForm = false;
  }

  private _loadScript(url: string, timeoutMs: number = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script already loaded
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = url;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Script loading timed out after ${timeoutMs / 1000} seconds: ${url}`));
      }, timeoutMs);

      script.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to load script: ${url}`));
      };
      document.head.appendChild(script);
    });
  }

  private async _renderPaymentAdapter(session: TestPaymentProviderResultDto): Promise<void> {
    // Get the adapter from global registry
    const adapters = (window as unknown as { MerchelloPaymentAdapters?: Record<string, unknown> }).MerchelloPaymentAdapters;
    if (!adapters) {
      throw new Error("Payment adapters not found. SDK may not have loaded correctly.");
    }

    const adapter = adapters[session.providerAlias] as {
      render?: (container: HTMLElement, session: unknown, checkout: unknown) => Promise<void>;
      tokenize?: () => Promise<{ success: boolean; nonce?: string; error?: string; isButtonFlow?: boolean }>;
      teardown?: () => void;
    };
    if (!adapter?.render) {
      throw new Error(`Adapter for '${session.providerAlias}' not found or missing render method.`);
    }

    // Wait for next frame to ensure container is in DOM
    await new Promise(resolve => requestAnimationFrame(resolve));

    const container = this.shadowRoot?.querySelector('#payment-form-container') as HTMLElement;
    if (!container) {
      throw new Error("Payment form container not found.");
    }

    // Create a minimal checkout object for the adapter
    const mockCheckout = {
      showError: (message: string) => { this._paymentFormError = message; },
      hideError: () => { this._paymentFormError = undefined; },
    };

    await adapter.render(container, session, mockCheckout);

    // Store adapter reference for later use
    this.#currentAdapter = adapter;
  }

  private async _handleProcessTestPayment(): Promise<void> {
    if (!this.#currentAdapter?.tokenize) {
      this._paymentFormError = "Payment adapter does not support tokenization.";
      return;
    }

    if (!this._testResult?.sessionId) {
      this._paymentFormError = "No active session. Please load the payment form first.";
      return;
    }

    const settingId = this.data?.setting.id;
    if (!settingId) {
      this._paymentFormError = "Setting ID missing.";
      return;
    }

    this._isProcessingPayment = true;
    this._paymentFormError = undefined;
    this._paymentResult = undefined;

    try {
      // Call adapter to get payment method token/nonce
      const tokenResult = await this.#currentAdapter.tokenize();

      if (!tokenResult.success) {
        // Check if this is a button-based flow (like PayPal)
        if (tokenResult.isButtonFlow) {
          this._paymentFormError = tokenResult.error || "Please use the payment button to complete payment.";
        } else {
          this._paymentFormError = tokenResult.error || "Failed to get payment details. Please check your card information.";
        }
        this._isProcessingPayment = false;
        return;
      }

      // Call API to process the test payment
      const { data, error } = await MerchelloApi.processTestPayment(settingId, {
        sessionId: this._testResult.sessionId,
        paymentMethodToken: tokenResult.nonce,
        methodAlias: this._testResult.methodAlias,
        amount: this._amount,
        testInvoiceId: this._testResult.testInvoiceId,
      });

      if (!this.#isConnected) return;

      if (error) {
        this._paymentResult = {
          success: false,
          message: error.message,
        };
      } else if (data) {
        this._paymentResult = {
          success: data.success,
          message: data.success
            ? `Payment successful! Transaction ID: ${data.transactionId || 'N/A'}`
            : data.errorMessage || "Payment failed.",
          transactionId: data.transactionId,
        };
      }
    } catch (err) {
      this._paymentResult = {
        success: false,
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
      };
    }

    this._isProcessingPayment = false;
  }

  // ============================================
  // Express Checkout Tab
  // ============================================

  private async _loadExpressMethods(): Promise<void> {
    this._isLoadingExpressMethods = true;

    const settingId = this.data?.setting.id;
    if (!settingId) {
      this._isLoadingExpressMethods = false;
      return;
    }

    const { data } = await MerchelloApi.getPaymentProviderMethods(settingId);

    if (!this.#isConnected) return;

    if (data) {
      this._expressMethods = data.filter(m => m.isExpressCheckout && m.isEnabled);
    }

    this._isLoadingExpressMethods = false;
  }

  // ============================================
  // Webhook Tab
  // ============================================

  private async _loadWebhookTemplates(): Promise<void> {
    this._isLoadingWebhookTemplates = true;

    const settingId = this.data?.setting.id;
    if (!settingId) {
      this._isLoadingWebhookTemplates = false;
      return;
    }

    const { data } = await MerchelloApi.getWebhookEventTemplates(settingId);

    if (!this.#isConnected) return;

    if (data) {
      this._webhookTemplates = data;
      if (data.length > 0 && !this._selectedWebhookEvent) {
        this._selectedWebhookEvent = data[0].eventType;
      }
    }

    this._isLoadingWebhookTemplates = false;
  }

  private async _handleSimulateWebhook(): Promise<void> {
    this._isSimulatingWebhook = true;
    this._webhookResult = undefined;

    const settingId = this.data?.setting.id;
    if (!settingId) {
      this._webhookResult = { success: false, validationSkipped: false, validationPassed: false, actionsPerformed: [], errorMessage: "Setting ID missing." };
      this._isSimulatingWebhook = false;
      return;
    }

    const request: SimulateWebhookDto = {
      eventType: this._selectedWebhookEvent || "payment.completed",
      amount: this._amount,
      customPayload: this._useCustomPayload ? this._customWebhookPayload : undefined,
    };

    const { data, error } = await MerchelloApi.simulateWebhook(settingId, request);

    if (!this.#isConnected) return;

    if (error) {
      this._webhookResult = { success: false, validationSkipped: false, validationPassed: false, actionsPerformed: [], errorMessage: error.message };
    } else if (data) {
      this._webhookResult = data;
    }

    this._isSimulatingWebhook = false;
  }

  // ============================================
  // Rendering
  // ============================================

  private _handleClose(): void {
    this.modalContext?.reject();
  }

  private _getIntegrationTypeName(integrationType: PaymentIntegrationType): string {
    switch (integrationType) {
      case PaymentIntegrationType.Redirect: return "Redirect";
      case PaymentIntegrationType.HostedFields: return "Hosted Fields";
      case PaymentIntegrationType.Widget: return "Widget";
      case PaymentIntegrationType.DirectForm: return "Direct Form";
      default: return "Unknown";
    }
  }

  private _getTestCardInfo(): { card: string; expiry: string; cvv: string } {
    const alias = this.data?.setting.providerAlias?.toLowerCase() || 'default';
    return TEST_CARDS[alias] || TEST_CARDS.default;
  }

  private _renderTabs(): unknown {
    return html`
      <div class="tabs">
        <button
          class="tab ${this._activeTab === 'session' ? 'active' : ''}"
          @click=${() => this._handleTabChange('session')}
        >
          Session
        </button>
        <button
          class="tab ${this._activeTab === 'payment' ? 'active' : ''}"
          @click=${() => this._handleTabChange('payment')}
        >
          Payment Form
        </button>
        <button
          class="tab ${this._activeTab === 'express' ? 'active' : ''}"
          @click=${() => this._handleTabChange('express')}
        >
          Express Checkout
        </button>
        <button
          class="tab ${this._activeTab === 'webhooks' ? 'active' : ''}"
          @click=${() => this._handleTabChange('webhooks')}
        >
          Webhooks
        </button>
      </div>
    `;
  }

  private _renderAmountInput(): unknown {
    const currencySymbol = getCurrencySymbol();
    return html`
      <div class="form-row">
        <label>Test Amount (${currencySymbol})</label>
        <uui-input
          type="number"
          min="0.01"
          step="0.01"
          .value=${String(this._amount)}
          @input=${(e: Event) => (this._amount = parseFloat((e.target as HTMLInputElement).value) || 100)}
        ></uui-input>
      </div>
    `;
  }

  private _renderSessionTab(): unknown {
    return html`
      <div class="tab-content">
        <p class="tab-description">Test your provider configuration by creating a payment session.</p>

        ${this._renderAmountInput()}

        <uui-button
          look="primary"
          ?disabled=${this._isTesting}
          @click=${this._handleTestSession}
        >
          ${this._isTesting ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
          ${this._isTesting ? "Creating Session..." : "Create Test Session"}
        </uui-button>

        ${this._testResult ? this._renderSessionResults() : nothing}
      </div>
    `;
  }

  private _renderSessionResults(): unknown {
    if (!this._testResult) return nothing;

    const { isSuccessful: success, integrationType, errorMessage, errorCode, sessionId, redirectUrl, clientToken, clientSecret, javaScriptSdkUrl, adapterUrl, formFields } = this._testResult;

    return html`
      <div class="results-section">
        ${!success && errorMessage
          ? html`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <div>
                  <p>${errorMessage}</p>
                  ${errorCode ? html`<p class="error-code">Error code: ${errorCode}</p>` : nothing}
                </div>
              </div>
            `
          : nothing}

        ${success
          ? html`
              <div class="result-card success">
                <uui-icon name="icon-check"></uui-icon>
                <span>Session created successfully</span>
              </div>
            `
          : nothing}

        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Integration Type</span>
            <span class="badge">${this._getIntegrationTypeName(integrationType)}</span>
          </div>

          ${sessionId ? html`
            <div class="detail-row">
              <span class="detail-label">Session ID</span>
              <span class="detail-value monospace">${sessionId}</span>
            </div>
          ` : nothing}

          ${redirectUrl ? html`
            <div class="detail-row">
              <span class="detail-label">Redirect URL</span>
              <a href="${redirectUrl}" target="_blank" rel="noopener noreferrer" class="url-link">
                ${redirectUrl} <uui-icon name="icon-out"></uui-icon>
              </a>
            </div>
          ` : nothing}

          ${clientToken ? html`
            <div class="detail-row">
              <span class="detail-label">Client Token</span>
              <span class="detail-value monospace truncate" title="${clientToken}">${clientToken}</span>
            </div>
          ` : nothing}

          ${clientSecret ? html`
            <div class="detail-row">
              <span class="detail-label">Client Secret</span>
              <span class="detail-value monospace truncate" title="${clientSecret}">${clientSecret}</span>
            </div>
          ` : nothing}

          ${javaScriptSdkUrl ? html`
            <div class="detail-row">
              <span class="detail-label">JavaScript SDK URL</span>
              <a href="${javaScriptSdkUrl}" target="_blank" rel="noopener noreferrer" class="url-link">
                ${javaScriptSdkUrl} <uui-icon name="icon-out"></uui-icon>
              </a>
            </div>
          ` : nothing}

          ${adapterUrl ? html`
            <div class="detail-row">
              <span class="detail-label">Adapter URL</span>
              <span class="detail-value monospace">${adapterUrl}</span>
            </div>
          ` : nothing}

          ${formFields && formFields.length > 0 ? html`
            <div class="detail-section">
              <span class="detail-label">Form Fields</span>
              <div class="form-fields-list">
                ${formFields.map(field => html`
                  <div class="form-field-item">
                    <span class="field-label">${field.label}</span>
                    <span class="field-key">${field.key}</span>
                    <div class="field-meta">
                      <span class="field-type">${field.fieldType}</span>
                      ${field.isRequired ? html`<span class="field-required">Required</span>` : nothing}
                    </div>
                  </div>
                `)}
              </div>
            </div>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private _renderPaymentFormTab(): unknown {
    const testCard = this._getTestCardInfo();
    const isWidgetIntegration = this._testResult?.integrationType === PaymentIntegrationType.Widget;

    return html`
      <div class="tab-content">
        <p class="tab-description">Load and test the actual payment form with sandbox credentials.</p>

        ${this._renderAmountInput()}

        <div class="test-card-info">
          <strong>Test Card:</strong> ${testCard.card} | <strong>Exp:</strong> ${testCard.expiry} | <strong>CVV:</strong> ${testCard.cvv}
        </div>

        ${!this._paymentFormLoaded ? html`
          <uui-button
            look="primary"
            ?disabled=${this._isLoadingPaymentForm}
            @click=${this._handleLoadPaymentForm}
          >
            ${this._isLoadingPaymentForm ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            ${this._isLoadingPaymentForm ? "Loading..." : "Load Payment Form"}
          </uui-button>
        ` : nothing}

        ${this._paymentFormError ? html`
          <div class="result-errors">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._paymentFormError}</span>
          </div>
        ` : nothing}

        <div id="payment-form-container" class="${this._paymentFormLoaded ? 'visible' : 'hidden'}">
          <!-- Payment form will be rendered here by the adapter -->
        </div>

        ${this._paymentFormLoaded && !isWidgetIntegration ? html`
          <uui-button
            look="primary"
            ?disabled=${this._isProcessingPayment}
            @click=${this._handleProcessTestPayment}
          >
            ${this._isProcessingPayment ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            ${this._isProcessingPayment ? "Processing..." : "Process Test Payment"}
          </uui-button>
        ` : nothing}

        ${this._paymentFormLoaded && isWidgetIntegration ? html`
          <p class="hint">Use the payment buttons above to complete the test payment.</p>
        ` : nothing}

        ${this._paymentResult ? html`
          <div class="result-card ${this._paymentResult.success ? 'success' : 'error'}">
            <uui-icon name="${this._paymentResult.success ? 'icon-check' : 'icon-alert'}"></uui-icon>
            <span>${this._paymentResult.message}</span>
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _renderExpressCheckoutTab(): unknown {
    return html`
      <div class="tab-content">
        <p class="tab-description">Express checkout buttons (Apple Pay, Google Pay, PayPal) require domain verification and HTTPS.</p>

        <div class="warning-box">
          <uui-icon name="icon-alert"></uui-icon>
          <span>Express checkout buttons may not work in the backoffice due to domain restrictions. Use these tests on your actual checkout page.</span>
        </div>

        ${this._isLoadingExpressMethods ? html`
          <uui-loader-bar></uui-loader-bar>
        ` : nothing}

        ${!this._isLoadingExpressMethods && this._expressMethods.length === 0 ? html`
          <p class="empty-state">No express checkout methods enabled for this provider.</p>
        ` : nothing}

        ${this._expressMethods.length > 0 ? html`
          <div class="express-methods-list">
            ${this._expressMethods.map(method => html`
              <div class="express-method-item">
                <span class="method-name">${method.displayName}</span>
                <span class="method-alias">${method.methodAlias}</span>
              </div>
            `)}
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _renderWebhooksTab(): unknown {
    return html`
      <div class="tab-content">
        <p class="tab-description">Simulate webhook events to test your provider's webhook handling.</p>

        ${this._isLoadingWebhookTemplates ? html`
          <uui-loader-bar></uui-loader-bar>
        ` : nothing}

        ${!this._isLoadingWebhookTemplates ? html`
          ${this._webhookTemplates.length > 0 ? html`
            <div class="form-row">
              <label>Event Type</label>
              <uui-select
                .value=${this._selectedWebhookEvent || ''}
                @change=${(e: Event) => this._selectedWebhookEvent = (e.target as HTMLSelectElement).value}
              >
                ${this._webhookTemplates.map(t => html`
                  <uui-select-option value="${t.eventType}">${t.displayName}</uui-select-option>
                `)}
              </uui-select>
            </div>
          ` : nothing}

          <div class="form-row">
            <label>
              <uui-checkbox
                ?checked=${this._useCustomPayload}
                @change=${(e: Event) => this._useCustomPayload = (e.target as HTMLInputElement).checked}
              ></uui-checkbox>
              Use custom payload
            </label>
          </div>

          ${this._useCustomPayload ? html`
            <div class="form-row">
              <label>Custom Payload (JSON)</label>
              <uui-textarea
                .value=${this._customWebhookPayload}
                @input=${(e: Event) => this._customWebhookPayload = (e.target as HTMLTextAreaElement).value}
                placeholder='{"type": "payment.completed", ...}'
              ></uui-textarea>
              <span class="hint">Enter the raw webhook JSON payload to test.</span>
            </div>
          ` : nothing}

          ${this._renderAmountInput()}

          <uui-button
            look="primary"
            ?disabled=${this._isSimulatingWebhook || (!this._useCustomPayload && !this._selectedWebhookEvent)}
            @click=${this._handleSimulateWebhook}
          >
            ${this._isSimulatingWebhook ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            ${this._isSimulatingWebhook ? "Simulating..." : "Simulate Webhook"}
          </uui-button>

          ${this._webhookResult ? this._renderWebhookResult() : nothing}
        ` : nothing}
      </div>
    `;
  }

  private _renderWebhookResult(): unknown {
    if (!this._webhookResult) return nothing;

    const { success, validationSkipped, eventTypeDetected, actionsPerformed, payload, errorMessage } = this._webhookResult;

    return html`
      <div class="results-section">
        <div class="result-card ${success ? 'success' : 'error'}">
          <uui-icon name="${success ? 'icon-check' : 'icon-alert'}"></uui-icon>
          <span>${success ? "Webhook processed successfully" : "Webhook processing failed"}</span>
        </div>

        ${errorMessage ? html`
          <div class="result-errors">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${errorMessage}</span>
          </div>
        ` : nothing}

        <div class="result-details">
          ${validationSkipped ? html`
            <div class="detail-row">
              <span class="detail-label">Validation</span>
              <span class="badge">Skipped (test mode)</span>
            </div>
          ` : nothing}

          ${eventTypeDetected ? html`
            <div class="detail-row">
              <span class="detail-label">Event Detected</span>
              <span class="detail-value">${eventTypeDetected}</span>
            </div>
          ` : nothing}

          ${actionsPerformed && actionsPerformed.length > 0 ? html`
            <div class="detail-section">
              <span class="detail-label">Actions Performed</span>
              <ul class="actions-list">
                ${actionsPerformed.map(action => html`<li>${action}</li>`)}
              </ul>
            </div>
          ` : nothing}

          ${payload ? html`
            <details class="payload-details">
              <summary>View Payload</summary>
              <pre class="payload-content">${payload}</pre>
            </details>
          ` : nothing}
        </div>
      </div>
    `;
  }

  override render() {
    const providerName = this.data?.setting.displayName ?? "Provider";

    return html`
      <umb-body-layout headline="Test ${providerName}">
        <div id="main">
          ${this._errorMessage ? html`
            <div class="error-banner">
              <uui-icon name="icon-alert"></uui-icon>
              <span>${this._errorMessage}</span>
              <uui-button look="secondary" compact @click=${() => (this._errorMessage = null)}>Dismiss</uui-button>
            </div>
          ` : nothing}

          ${this._renderTabs()}

          ${this._activeTab === 'session' ? this._renderSessionTab() : nothing}
          ${this._activeTab === 'payment' ? this._renderPaymentFormTab() : nothing}
          ${this._activeTab === 'express' ? this._renderExpressCheckoutTab() : nothing}
          ${this._activeTab === 'webhooks' ? this._renderWebhooksTab() : nothing}
        </div>

        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>Close</uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
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
}

export default MerchelloTestPaymentProviderModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-test-payment-provider-modal": MerchelloTestPaymentProviderModalElement;
  }
}
