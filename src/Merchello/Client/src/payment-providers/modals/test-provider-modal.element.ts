import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { TestPaymentProviderModalData, TestPaymentProviderModalValue } from "@payment-providers/modals/test-provider-modal.token.js";
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
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

const STORAGE_KEY = "merchello-test-payment-provider-form";

type TabType = 'session' | 'payment' | 'express' | 'webhooks' | 'paymentlinks' | 'vault';

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
    tokenizeWithVerification?: (options: unknown) => Promise<{ success: boolean; nonce?: string; error?: string; isButtonFlow?: boolean }>;
    teardown?: () => void;
  };

  // Express checkout tab state
  @state() private _expressMethods: PaymentMethodSettingDto[] = [];
  @state() private _isLoadingExpressMethods = false;
  @state() private _loadingExpressMethod?: string;
  @state() private _expressError?: string;
  @state() private _expressResult?: { success: boolean; message: string; transactionId?: string };

  // Webhook tab state
  @state() private _webhookTemplates: WebhookEventTemplateDto[] = [];
  @state() private _isLoadingWebhookTemplates = false;
  @state() private _selectedWebhookEvent?: string;
  @state() private _customWebhookPayload = "";
  @state() private _useCustomPayload = false;
  @state() private _isSimulatingWebhook = false;
  @state() private _webhookResult?: WebhookSimulationResultDto;

  // Payment links tab state
  @state() private _isGeneratingPaymentLink = false;
  @state() private _paymentLinkResult?: { success: boolean; paymentUrl?: string; errorMessage?: string };
  @state() private _supportsPaymentLinks = false;

  // Vault tab state
  @state() private _supportsVaulting = false;
  @state() private _isCreatingVaultSetup = false;
  @state() private _vaultSetupResult?: { success: boolean; setupSessionId?: string; clientSecret?: string; redirectUrl?: string; providerCustomerId?: string; errorMessage?: string };
  @state() private _isConfirmingVault = false;
  @state() private _vaultConfirmResult?: { success: boolean; providerMethodId?: string; providerCustomerId?: string; displayLabel?: string; cardBrand?: string; last4?: string; expiryMonth?: number; expiryYear?: number; errorMessage?: string };
  @state() private _isChargingVault = false;
  @state() private _vaultChargeResult?: { success: boolean; transactionId?: string; errorMessage?: string };
  @state() private _vaultChargeAmount: number = 10.00;
  @state() private _vaultPaymentMethodToken: string = "";

  // Common state
  @state() private _errorMessage: string | null = null;

  #isConnected = false;
  #cardinalStyleElement?: HTMLStyleElement;
  #lightDomContainer?: HTMLElement;
  #lightDomHost?: HTMLElement;
  #expressLightDomContainers: Map<string, HTMLElement> = new Map();

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._restoreSavedValues();
    getStoreSettings();
    this._checkPaymentLinkSupport();
    this._checkVaultingSupport();
    this._createLightDomContainer();
  }

  private _createLightDomContainer(): void {
    // Create a container in the light DOM for payment forms
    // This is necessary because Stripe.js Payment Elements don't work inside Shadow DOM
    this.#lightDomContainer = document.createElement('div');
    this.#lightDomContainer.id = `merchello-payment-container-${Date.now()}`;
    this.#lightDomContainer.style.cssText = 'display: none;';
    this._getLightDomHost().appendChild(this.#lightDomContainer);
  }

  private _getLightDomHost(): HTMLElement {
    if (this.#lightDomHost?.isConnected) {
      return this.#lightDomHost;
    }

    // Sidebar modals render a <dialog> with a default <slot>. Appending to the
    // modal element keeps content in light DOM (Stripe compatibility) while still
    // being rendered in the dialog's top-layer via slot projection.
    const modalElement = this.closest('uui-modal-sidebar, uui-modal-dialog') as HTMLElement | null;
    const host = modalElement ?? this.parentElement ?? document.body;

    this.#lightDomHost = host;
    return host;
  }

  private _checkPaymentLinkSupport(): void {
    // Check if the provider metadata indicates payment link support
    this._supportsPaymentLinks = this.data?.setting.provider?.supportsPaymentLinks ?? false;
  }

  private _checkVaultingSupport(): void {
    // Check if the provider metadata indicates vaulting support
    this._supportsVaulting = this.data?.setting.provider?.supportsVaultedPayments ?? false;
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
    // Clean up Cardinal z-index fix
    this._removeCardinalZIndexFix();
    // Clean up light DOM containers
    this._cleanupLightDomContainers();
  }

  private _cleanupLightDomContainers(): void {
    if (this.#lightDomContainer) {
      this.#lightDomContainer.remove();
      this.#lightDomContainer = undefined;
    }
    // Clean up express checkout containers
    for (const container of this.#expressLightDomContainers.values()) {
      container.remove();
    }
    this.#expressLightDomContainers.clear();
    this.#lightDomHost = undefined;
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

  private _injectCardinalZIndexFix(): void {
    // Prevent duplicate injection
    if (this.#cardinalStyleElement) return;

    const style = document.createElement('style');
    style.id = 'merchello-cardinal-zindex-fix';
    style.textContent = `
      /* Fix for Cardinal Commerce 3DS modal appearing behind Umbraco modal */
      .cardinal-modal-overlay,
      .cardinal-modal,
      [id*="Cardinal"],
      [class*="Cardinal"],
      iframe[name*="Cardinal"],
      div[style*="z-index"][style*="position: fixed"] {
        z-index: 999999 !important;
      }
    `;
    document.head.appendChild(style);
    this.#cardinalStyleElement = style;
  }

  private _removeCardinalZIndexFix(): void {
    if (this.#cardinalStyleElement) {
      this.#cardinalStyleElement.remove();
      this.#cardinalStyleElement = undefined;
    }
  }

  private async _handleTabChange(tab: TabType): Promise<void> {
    this._activeTab = tab;
    this._saveFormValues();

    // Hide light DOM containers when switching away from payment/express tabs
    this._hideLightDomContainers();

    // Re-show containers if switching to payment/express tabs with loaded content
    // Need to wait for render to ensure shadow placeholders are available
    await this.updateComplete;

    if (tab === 'payment' && this._paymentFormLoaded) {
      this._showPaymentFormContainer();
    }

    if (tab === 'express') {
      this._showExpressButtonContainers();
    }

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

    // Tear down existing adapter before re-loading
    if (this.#currentAdapter?.teardown) {
      try {
        this.#currentAdapter.teardown();
      } catch {
        // Ignore teardown errors
      }
      this.#currentAdapter = undefined;
    }

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

      // Inject z-index fix for Cardinal 3DS modal (used by Braintree)
      this._injectCardinalZIndexFix();

      // Set loaded=true BEFORE rendering so the placeholder is visible for measuring
      this._paymentFormLoaded = true;
      await this.updateComplete;

      // Try to render the payment form
      await this._renderPaymentAdapter(data);
    } catch (err) {
      this._paymentFormLoaded = false;
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

    // Get the Shadow DOM placeholder for positioning reference
    const shadowPlaceholder = this.shadowRoot?.querySelector('#payment-form-container') as HTMLElement;
    if (!shadowPlaceholder || !this.#lightDomContainer) {
      throw new Error("Payment form container not found.");
    }

    // Use light DOM container for Stripe compatibility (Stripe.js doesn't work inside Shadow DOM)
    // Position it over the Shadow DOM placeholder
    this._positionLightDomContainer(shadowPlaceholder, this.#lightDomContainer);
    this.#lightDomContainer.style.display = 'block';
    this.#lightDomContainer.innerHTML = '';

    // Create a minimal checkout object for the adapter
    const mockCheckout = {
      showError: (message: string) => { this._paymentFormError = message; },
      hideError: () => { this._paymentFormError = undefined; },
    };

    await adapter.render(this.#lightDomContainer, session, mockCheckout);

    // Store adapter reference for later use
    this.#currentAdapter = adapter;
  }

  private _positionLightDomContainer(reference: HTMLElement, container: HTMLElement): void {
    const rect = reference.getBoundingClientRect();
    container.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      min-height: ${rect.height}px;
      z-index: 100000;
      background: var(--uui-color-surface, white);
      padding: 16px;
      border-radius: 8px;
      box-sizing: border-box;
    `;
  }

  private _hideLightDomContainers(): void {
    // Only hide containers - don't clear innerHTML to preserve mounted Stripe elements
    if (this.#lightDomContainer) {
      this.#lightDomContainer.style.display = 'none';
    }
    for (const container of this.#expressLightDomContainers.values()) {
      container.style.display = 'none';
    }
  }

  private _showPaymentFormContainer(): void {
    if (!this.#lightDomContainer || !this._paymentFormLoaded) return;

    const shadowPlaceholder = this.shadowRoot?.querySelector('#payment-form-container') as HTMLElement;
    if (shadowPlaceholder) {
      this._positionLightDomContainer(shadowPlaceholder, this.#lightDomContainer);
      this.#lightDomContainer.style.display = 'block';
    }
  }

  private _showExpressButtonContainers(): void {
    for (const [methodAlias, container] of this.#expressLightDomContainers.entries()) {
      const shadowPlaceholder = this.shadowRoot?.querySelector(`#express-button-${methodAlias}`) as HTMLElement;
      if (shadowPlaceholder) {
        this._positionLightDomContainer(shadowPlaceholder, container);
        container.style.display = 'block';
      }
    }
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
      // Use tokenizeWithVerification if available (includes 3DS), otherwise fall back to tokenize
      const tokenResult = this.#currentAdapter.tokenizeWithVerification
        ? await this.#currentAdapter.tokenizeWithVerification({
            email: 'test@example.com',
            billingAddress: {
              firstName: 'Test',
              lastName: 'User',
              line1: '123 Test Street',
              city: 'Test City',
              region: 'CA',
              postalCode: '12345',
              countryCode: 'US'
            }
          })
        : await this.#currentAdapter.tokenize();

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

  private async _loadExpressButton(method: PaymentMethodSettingDto): Promise<void> {
    this._loadingExpressMethod = method.methodAlias;
    this._expressError = undefined;

    const settingId = this.data?.setting.id;
    if (!settingId) {
      this._expressError = "Setting ID missing.";
      this._loadingExpressMethod = undefined;
      return;
    }

    try {
      // Get the express checkout config from the API
      const { data, error } = await MerchelloApi.getTestExpressConfig(settingId, method.methodAlias, this._amount);

      if (!this.#isConnected) return;

      if (error || !data) {
        this._expressError = error?.message || "Failed to get express checkout config";
        this._loadingExpressMethod = undefined;
        return;
      }

      // Load the client SDK (from sdkConfig if provider puts it there, e.g., Braintree)
      const clientSdkUrl = data.sdkConfig?.clientSdkUrl as string | undefined;
      if (clientSdkUrl) {
        await this._loadScript(clientSdkUrl);
      }

      // Load the method-specific SDK
      if (data.sdkUrl) {
        await this._loadScript(data.sdkUrl);
      }

      // Load the custom adapter if provided
      if (data.customAdapterUrl) {
        await this._loadScript(data.customAdapterUrl);
      }

      // Wait for next frame to ensure container is in DOM
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Find the Shadow DOM placeholder for this method
      const shadowPlaceholder = this.shadowRoot?.querySelector(`#express-button-${method.methodAlias}`) as HTMLElement;
      if (!shadowPlaceholder) {
        this._expressError = `Container not found for ${method.methodAlias}`;
        this._loadingExpressMethod = undefined;
        return;
      }

      // Create or get light DOM container for this express button (for Shadow DOM compatibility)
      let lightDomContainer = this.#expressLightDomContainers.get(method.methodAlias);
      if (!lightDomContainer) {
        lightDomContainer = document.createElement('div');
        lightDomContainer.id = `merchello-express-container-${method.methodAlias}-${Date.now()}`;
        this._getLightDomHost().appendChild(lightDomContainer);
        this.#expressLightDomContainers.set(method.methodAlias, lightDomContainer);
      }

      // Position and show the light DOM container
      this._positionLightDomContainer(shadowPlaceholder, lightDomContainer);
      lightDomContainer.style.display = 'block';
      lightDomContainer.innerHTML = '';

      // Get the adapter from global registry
      const adapters = (window as unknown as { MerchelloExpressAdapters?: Record<string, unknown> }).MerchelloExpressAdapters;
      if (!adapters) {
        this._expressError = "Express adapters not found. SDK may not have loaded correctly.";
        this._loadingExpressMethod = undefined;
        return;
      }

      // Try provider-specific adapter first, then generic
      const providerAlias = this.data?.setting.providerAlias || '';
      const adapter = (adapters[`${providerAlias}:${method.methodAlias}`] || adapters[providerAlias]) as {
        render?: (container: HTMLElement, method: unknown, config: unknown, checkout: unknown) => Promise<void>;
        teardown?: (methodAlias: string) => void;
      };

      if (!adapter?.render) {
        this._expressError = `Express adapter for '${providerAlias}' not found or missing render method.`;
        this._loadingExpressMethod = undefined;
        return;
      }

      // Create a mock checkout object for the adapter
      const mockCheckout = {
        isProcessing: false,
        error: null as string | null,
        processExpressCheckout: async (
          _providerAlias: string,
          _methodAlias: string,
          nonce: string,
          _customerData: unknown,
          _providerData: unknown
        ) => {
          // For testing, just show success with the nonce
          this._expressResult = {
            success: true,
            message: `Express checkout successful! Nonce: ${nonce.substring(0, 20)}...`,
            transactionId: nonce,
          };
          this._loadingExpressMethod = undefined;
        },
      };

      // Prepare method config for the adapter
      const methodConfig = {
        methodAlias: method.methodAlias,
        sdkUrl: data.sdkUrl,
        sdkConfig: data.sdkConfig,
      };

      // Prepare checkout config
      const checkoutConfig = {
        amount: this._amount,
        currency: data.sdkConfig?.currency || 'USD',
      };

      await adapter.render(lightDomContainer, methodConfig, checkoutConfig, mockCheckout);
    } catch (err) {
      this._expressError = err instanceof Error ? err.message : "Failed to load express button";
    }

    this._loadingExpressMethod = undefined;
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
  // Payment Links Tab
  // ============================================

  private async _handleGeneratePaymentLink(): Promise<void> {
    this._isGeneratingPaymentLink = true;
    this._paymentLinkResult = undefined;

    const settingId = this.data?.setting.id;
    const providerAlias = this.data?.setting.providerAlias;
    if (!settingId || !providerAlias) {
      this._paymentLinkResult = { success: false, errorMessage: "Provider settings missing." };
      this._isGeneratingPaymentLink = false;
      return;
    }

    const { data, error } = await MerchelloApi.testPaymentLink(settingId, { amount: this._amount });

    if (!this.#isConnected) return;

    if (error) {
      this._paymentLinkResult = { success: false, errorMessage: error.message };
    } else if (data) {
      this._paymentLinkResult = {
        success: data.success,
        paymentUrl: data.paymentUrl,
        errorMessage: data.errorMessage,
      };
    }

    this._isGeneratingPaymentLink = false;
  }

  // ============================================
  // Rendering
  // ============================================

  private _handleClose(): void {
    this._cleanupLightDomContainers();
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

  private _getDefaultVaultToken(): string {
    const alias = this.data?.setting.providerAlias?.toLowerCase() || 'default';
    switch (alias) {
      case 'stripe':
        // Stripe test PaymentMethod ID (usable for SetupIntent confirmation)
        return 'pm_card_visa';
      case 'braintree':
        // Braintree test nonce
        return 'fake-valid-nonce';
      default:
        return '';
    }
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
        ${this._supportsPaymentLinks ? html`
          <button
            class="tab ${this._activeTab === 'paymentlinks' ? 'active' : ''}"
            @click=${() => this._handleTabChange('paymentlinks')}
          >
            Payment Links
          </button>
        ` : nothing}
        ${this._supportsVaulting ? html`
          <button
            class="tab ${this._activeTab === 'vault' ? 'active' : ''}"
            @click=${() => this._handleTabChange('vault')}
          >
            Vault
          </button>
        ` : nothing}
      </div>
    `;
  }

  private _renderAmountInput(): unknown {
    const currencySymbol = getCurrencySymbol();
    return html`
      <div class="form-row">
        <label>Test Amount (${currencySymbol})</label>
        <uui-input
          label="Test amount"
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
          label="Create test session"
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
            label="Load payment form"
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
            label="Process test payment"
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
          <span>Some express checkout buttons may not work in the backoffice due to domain restrictions. PayPal typically works in sandbox mode.</span>
        </div>

        ${this._renderAmountInput()}

        ${this._isLoadingExpressMethods ? html`
          <uui-loader-bar></uui-loader-bar>
        ` : nothing}

        ${!this._isLoadingExpressMethods && this._expressMethods.length === 0 ? html`
          <p class="empty-state">No express checkout methods enabled for this provider.</p>
        ` : nothing}

        ${this._expressError ? html`
          <div class="result-errors">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._expressError}</span>
          </div>
        ` : nothing}

        ${this._expressResult ? html`
          <div class="result-card ${this._expressResult.success ? 'success' : 'error'}">
            <uui-icon name="${this._expressResult.success ? 'icon-check' : 'icon-alert'}"></uui-icon>
            <span>${this._expressResult.message}</span>
          </div>
        ` : nothing}

        ${this._expressMethods.length > 0 ? html`
          <div class="express-methods-list">
            ${this._expressMethods.map(method => html`
              <div class="express-method-card">
                <div class="express-method-header">
                  <span class="method-name">${method.displayName}</span>
                  <span class="method-alias">${method.methodAlias}</span>
                </div>
                <div id="express-button-${method.methodAlias}" class="express-button-container">
                  <!-- Button will be rendered here -->
                </div>
                <uui-button
                  label="Load express button"
                  look="secondary"
                  ?disabled=${this._loadingExpressMethod === method.methodAlias}
                  @click=${() => this._loadExpressButton(method)}
                >
                  ${this._loadingExpressMethod === method.methodAlias ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
                  ${this._loadingExpressMethod === method.methodAlias ? "Loading..." : "Load Button"}
                </uui-button>
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
                label="Webhook event type"
                .options=${this._webhookTemplates.map(t => ({ name: t.displayName, value: t.eventType, selected: this._selectedWebhookEvent === t.eventType }))}
                .value=${this._selectedWebhookEvent || ''}
                @change=${(e: Event) => this._selectedWebhookEvent = (e.target as HTMLSelectElement).value}
              ></uui-select>
            </div>
          ` : nothing}

          <div class="form-row">
            <label>
              <uui-checkbox
                label="Use custom payload"
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
                label="Custom payload"
                .value=${this._customWebhookPayload}
                @input=${(e: Event) => this._customWebhookPayload = (e.target as HTMLTextAreaElement).value}
                placeholder='{"type": "payment.completed", ...}'
              ></uui-textarea>
              <span class="hint">Enter the raw webhook JSON payload to test.</span>
            </div>
          ` : nothing}

          ${this._renderAmountInput()}

          <uui-button
            label="Simulate webhook"
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

  private _renderPaymentLinksTab(): unknown {
    return html`
      <div class="tab-content">
        <p class="tab-description">Test payment link generation for this provider.</p>

        ${this._renderAmountInput()}

        <uui-button
          label="Generate test payment link"
          look="primary"
          ?disabled=${this._isGeneratingPaymentLink}
          @click=${this._handleGeneratePaymentLink}
        >
          ${this._isGeneratingPaymentLink ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
          ${this._isGeneratingPaymentLink ? "Generating..." : "Generate Test Payment Link"}
        </uui-button>

        ${this._paymentLinkResult ? html`
          <div class="results-section">
            <div class="result-card ${this._paymentLinkResult.success ? 'success' : 'error'}">
              <uui-icon name="${this._paymentLinkResult.success ? 'icon-check' : 'icon-alert'}"></uui-icon>
              <span>${this._paymentLinkResult.success ? "Payment link generated successfully" : "Failed to generate payment link"}</span>
            </div>

            ${this._paymentLinkResult.errorMessage ? html`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <span>${this._paymentLinkResult.errorMessage}</span>
              </div>
            ` : nothing}

            ${this._paymentLinkResult.paymentUrl ? html`
              <div class="result-details">
                <div class="detail-row">
                  <span class="detail-label">Payment URL</span>
                  <a href="${this._paymentLinkResult.paymentUrl}" target="_blank" rel="noopener noreferrer" class="url-link">
                    ${this._paymentLinkResult.paymentUrl} <uui-icon name="icon-out"></uui-icon>
                  </a>
                </div>
                <div class="payment-link-actions">
                  <uui-button
                    label="Copy payment link"
                    look="secondary"
                    @click=${() => this._copyPaymentLink()}
                  >
                    <uui-icon name="icon-documents"></uui-icon> Copy Link
                  </uui-button>
                  <uui-button
                    label="Open payment link"
                    look="primary"
                    @click=${() => window.open(this._paymentLinkResult?.paymentUrl, '_blank')}
                  >
                    <uui-icon name="icon-out"></uui-icon> Open Link
                  </uui-button>
                </div>
              </div>
            ` : nothing}
          </div>
        ` : nothing}
      </div>
    `;
  }

  private async _copyPaymentLink(): Promise<void> {
    if (!this._paymentLinkResult?.paymentUrl) return;

    try {
      await navigator.clipboard.writeText(this._paymentLinkResult.paymentUrl);
      // Could add a toast notification here
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = this._paymentLinkResult.paymentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  // ============================================
  // Vault Tab
  // ============================================

  private _renderVaultTab(): unknown {
    const testCard = this._getTestCardInfo();
    const providerAlias = this.data?.setting.providerAlias?.toLowerCase() || '';
    const needsToken = providerAlias !== 'paypal';
    const tokenPlaceholder = this._getDefaultVaultToken() || 'Enter token/nonce';

    return html`
      <div class="tab-content">
        <p class="tab-description">Test vaulted payments functionality - save and charge payment methods without a real transaction.</p>

        <!-- Step 1: Create Vault Setup Session -->
        <div class="vault-section">
          <h4>1. Create Vault Setup Session</h4>
          <p class="hint">Create a setup session to save a payment method for future use.</p>

          <uui-button
            label="Create vault setup session"
            look="primary"
            ?disabled=${this._isCreatingVaultSetup}
            @click=${this._handleCreateVaultSetup}
          >
            ${this._isCreatingVaultSetup ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            ${this._isCreatingVaultSetup ? "Creating..." : "Create Vault Setup Session"}
          </uui-button>

          ${this._vaultSetupResult ? html`
            <div class="result-card ${this._vaultSetupResult.success ? 'success' : 'error'}">
              <uui-icon name="${this._vaultSetupResult.success ? 'icon-check' : 'icon-alert'}"></uui-icon>
              <span>${this._vaultSetupResult.success ? "Setup session created" : "Failed to create setup session"}</span>
            </div>

            ${this._vaultSetupResult.errorMessage ? html`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <span>${this._vaultSetupResult.errorMessage}</span>
              </div>
            ` : nothing}

            ${this._vaultSetupResult.success ? html`
              <div class="result-details">
                <div class="detail-row">
                  <span class="detail-label">Session ID</span>
                  <span class="detail-value monospace">${this._vaultSetupResult.setupSessionId}</span>
                </div>
                ${this._vaultSetupResult.clientSecret ? html`
                  <div class="detail-row">
                    <span class="detail-label">Client Secret</span>
                    <span class="detail-value monospace truncate">${this._vaultSetupResult.clientSecret}</span>
                  </div>
                ` : nothing}
                ${this._vaultSetupResult.redirectUrl ? html`
                  <div class="detail-row">
                    <span class="detail-label">Approval URL</span>
                    <a class="url-link" href="${this._vaultSetupResult.redirectUrl}" target="_blank" rel="noopener">
                      ${this._vaultSetupResult.redirectUrl}
                    </a>
                  </div>
                ` : nothing}
                ${this._vaultSetupResult.providerCustomerId ? html`
                  <div class="detail-row">
                    <span class="detail-label">Provider Customer ID</span>
                    <span class="detail-value monospace">${this._vaultSetupResult.providerCustomerId}</span>
                  </div>
                ` : nothing}
              </div>
            ` : nothing}
          ` : nothing}
        </div>

        <!-- Step 2: Confirm Vault Setup (Card Entry) -->
        ${this._vaultSetupResult?.success ? html`
          <div class="vault-section">
            <h4>2. Confirm Vault Setup</h4>
            <div class="test-card-info">
              <strong>Test Card:</strong> ${testCard.card} | <strong>Exp:</strong> ${testCard.expiry} | <strong>CVV:</strong> ${testCard.cvv}
            </div>

            ${needsToken ? html`
              <div class="form-row">
                <label>Payment Method Token / Nonce</label>
                <uui-input
                  label="Payment method token"
                  .value=${this._vaultPaymentMethodToken}
                  placeholder="${tokenPlaceholder}"
                  @input=${(e: Event) => (this._vaultPaymentMethodToken = (e.target as HTMLInputElement).value)}
                ></uui-input>
                <p class="hint">Use a provider test token (e.g., Stripe pm_card_visa, Braintree fake-valid-nonce).</p>
              </div>
            ` : html`
              <p class="hint">No token required. Complete the approval in the provider's window before confirming.</p>
            `}

            <div id="vault-form-container" class="payment-form-container">
              <!-- Payment form would be rendered here by the adapter -->
              <p class="hint">In a real implementation, the provider's payment form would appear here.</p>
            </div>

            <uui-button
              label="Confirm and save payment method"
              look="primary"
              ?disabled=${this._isConfirmingVault}
              @click=${this._handleConfirmVaultSetup}
            >
              ${this._isConfirmingVault ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
              ${this._isConfirmingVault ? "Confirming..." : "Confirm & Save Payment Method"}
            </uui-button>

            ${this._vaultConfirmResult ? html`
              <div class="result-card ${this._vaultConfirmResult.success ? 'success' : 'error'}">
                <uui-icon name="${this._vaultConfirmResult.success ? 'icon-check' : 'icon-alert'}"></uui-icon>
                <span>${this._vaultConfirmResult.success ? "Payment method saved" : "Failed to save payment method"}</span>
              </div>

              ${this._vaultConfirmResult.errorMessage ? html`
                <div class="result-errors">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._vaultConfirmResult.errorMessage}</span>
                </div>
              ` : nothing}

              ${this._vaultConfirmResult.success ? html`
                <div class="result-details">
                  <div class="detail-row">
                    <span class="detail-label">Display Label</span>
                    <span class="detail-value">${this._vaultConfirmResult.displayLabel}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Provider Method ID</span>
                    <span class="detail-value monospace">${this._vaultConfirmResult.providerMethodId}</span>
                  </div>
                  ${this._vaultConfirmResult.providerCustomerId ? html`
                    <div class="detail-row">
                      <span class="detail-label">Provider Customer ID</span>
                      <span class="detail-value monospace">${this._vaultConfirmResult.providerCustomerId}</span>
                    </div>
                  ` : nothing}
                  ${this._vaultConfirmResult.cardBrand ? html`
                    <div class="detail-row">
                      <span class="detail-label">Card Brand</span>
                      <span class="detail-value">${this._vaultConfirmResult.cardBrand}</span>
                    </div>
                  ` : nothing}
                  ${this._vaultConfirmResult.last4 ? html`
                    <div class="detail-row">
                      <span class="detail-label">Last 4</span>
                      <span class="detail-value">${this._vaultConfirmResult.last4}</span>
                    </div>
                  ` : nothing}
                  ${this._vaultConfirmResult.expiryMonth && this._vaultConfirmResult.expiryYear ? html`
                    <div class="detail-row">
                      <span class="detail-label">Expiry</span>
                      <span class="detail-value">${String(this._vaultConfirmResult.expiryMonth).padStart(2, '0')}/${String(this._vaultConfirmResult.expiryYear).slice(-2)}</span>
                    </div>
                  ` : nothing}
                </div>
              ` : nothing}
            ` : nothing}
          </div>
        ` : nothing}

        <!-- Step 3: Test Charge -->
        ${this._vaultConfirmResult?.success ? html`
          <div class="vault-section">
            <h4>3. Test Charge</h4>
            <p class="hint">Charge the saved payment method.</p>

            <div class="form-row">
              <label>Charge Amount</label>
              <uui-input
                label="Charge amount"
                type="number"
                min="0.01"
                step="0.01"
                .value=${String(this._vaultChargeAmount)}
                @input=${(e: Event) => (this._vaultChargeAmount = parseFloat((e.target as HTMLInputElement).value) || 10)}
              ></uui-input>
            </div>

            <div class="button-group">
              <uui-button
                label="Test vault charge"
                look="primary"
                ?disabled=${this._isChargingVault}
                @click=${this._handleTestVaultCharge}
              >
                ${this._isChargingVault ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
                ${this._isChargingVault ? "Charging..." : "Test Charge"}
              </uui-button>

              <uui-button
                label="Delete vaulted method"
                look="secondary"
                color="danger"
                @click=${this._handleDeleteVaultedMethod}
              >
                Delete Method
              </uui-button>
            </div>

            ${this._vaultChargeResult ? html`
              <div class="result-card ${this._vaultChargeResult.success ? 'success' : 'error'}">
                <uui-icon name="${this._vaultChargeResult.success ? 'icon-check' : 'icon-alert'}"></uui-icon>
                <span>${this._vaultChargeResult.success ? "Charge successful" : "Charge failed"}</span>
              </div>

              ${this._vaultChargeResult.errorMessage ? html`
                <div class="result-errors">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._vaultChargeResult.errorMessage}</span>
                </div>
              ` : nothing}

              ${this._vaultChargeResult.transactionId ? html`
                <div class="result-details">
                  <div class="detail-row">
                    <span class="detail-label">Transaction ID</span>
                    <span class="detail-value monospace">${this._vaultChargeResult.transactionId}</span>
                  </div>
                </div>
              ` : nothing}
            ` : nothing}
          </div>
        ` : nothing}
      </div>
    `;
  }

  private async _handleCreateVaultSetup(): Promise<void> {
    this._isCreatingVaultSetup = true;
    this._vaultSetupResult = undefined;
    this._vaultConfirmResult = undefined;
    this._vaultChargeResult = undefined;

    const settingId = this.data?.setting.id;
    if (!settingId) {
      this._vaultSetupResult = { success: false, errorMessage: "Setting ID missing." };
      this._isCreatingVaultSetup = false;
      return;
    }

    try {
      const { data, error } = await MerchelloApi.testVaultSetup(settingId, {});

      if (error || !data) {
        this._vaultSetupResult = {
          success: false,
          errorMessage: error?.message ?? "Failed to create vault setup session."
        };
      } else {
        this._vaultSetupResult = {
          success: data.success ?? false,
          setupSessionId: data.setupSessionId,
          clientSecret: data.clientSecret,
          redirectUrl: data.redirectUrl,
          providerCustomerId: data.providerCustomerId,
          errorMessage: data.errorMessage
        };
        if (!this._vaultPaymentMethodToken) {
          this._vaultPaymentMethodToken = this._getDefaultVaultToken();
        }
      }
    } catch (err) {
      this._vaultSetupResult = {
        success: false,
        errorMessage: err instanceof Error ? err.message : "Unexpected error"
      };
    }

    this._isCreatingVaultSetup = false;
  }

  private async _handleConfirmVaultSetup(): Promise<void> {
    this._isConfirmingVault = true;
    this._vaultConfirmResult = undefined;
    this._vaultChargeResult = undefined;

    const settingId = this.data?.setting.id;
    if (!settingId || !this._vaultSetupResult?.setupSessionId) {
      this._vaultConfirmResult = { success: false, errorMessage: "Setup session not created." };
      this._isConfirmingVault = false;
      return;
    }

    try {
      const { data, error } = await MerchelloApi.testVaultConfirm(settingId, {
        setupSessionId: this._vaultSetupResult.setupSessionId,
        // In real implementation, paymentMethodToken would come from the SDK
        paymentMethodToken: this._vaultPaymentMethodToken || undefined,
        providerCustomerId: this._vaultSetupResult.providerCustomerId
      });

      if (error || !data) {
        this._vaultConfirmResult = {
          success: false,
          errorMessage: error?.message ?? "Failed to confirm vault setup."
        };
      } else {
        this._vaultConfirmResult = {
          success: data.success ?? false,
          providerMethodId: data.providerMethodId,
          providerCustomerId: data.providerCustomerId,
          displayLabel: data.displayLabel,
          cardBrand: data.cardBrand,
          last4: data.last4,
          expiryMonth: data.expiryMonth,
          expiryYear: data.expiryYear,
          errorMessage: data.errorMessage
        };
      }
    } catch (err) {
      this._vaultConfirmResult = {
        success: false,
        errorMessage: err instanceof Error ? err.message : "Unexpected error"
      };
    }

    this._isConfirmingVault = false;
  }

  private async _handleTestVaultCharge(): Promise<void> {
    this._isChargingVault = true;
    this._vaultChargeResult = undefined;

    const settingId = this.data?.setting.id;
    if (!settingId || !this._vaultConfirmResult?.providerMethodId) {
      this._vaultChargeResult = { success: false, errorMessage: "No vaulted method available." };
      this._isChargingVault = false;
      return;
    }

    try {
      const { data, error } = await MerchelloApi.testVaultCharge(settingId, {
        providerMethodId: this._vaultConfirmResult.providerMethodId,
        providerCustomerId: this._vaultConfirmResult.providerCustomerId ?? this._vaultSetupResult?.providerCustomerId,
        amount: this._vaultChargeAmount,
        currencyCode: "USD"
      });

      if (error || !data) {
        this._vaultChargeResult = {
          success: false,
          errorMessage: error?.message ?? "Failed to charge vaulted method."
        };
      } else {
        this._vaultChargeResult = {
          success: data.success ?? false,
          transactionId: data.transactionId,
          errorMessage: data.errorMessage
        };
      }
    } catch (err) {
      this._vaultChargeResult = {
        success: false,
        errorMessage: err instanceof Error ? err.message : "Unexpected error"
      };
    }

    this._isChargingVault = false;
  }

  private async _handleDeleteVaultedMethod(): Promise<void> {
    const settingId = this.data?.setting.id;
    if (!settingId || !this._vaultConfirmResult?.providerMethodId) {
      return;
    }

    try {
      await MerchelloApi.testVaultDelete(settingId, this._vaultConfirmResult.providerMethodId);

      // Reset vault state
      this._vaultSetupResult = undefined;
      this._vaultConfirmResult = undefined;
      this._vaultChargeResult = undefined;
    } catch (err) {
      this._errorMessage = err instanceof Error ? err.message : "Failed to delete vaulted method";
    }
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
              <uui-button look="secondary" compact label="Dismiss" @click=${() => (this._errorMessage = null)}>Dismiss</uui-button>
            </div>
          ` : nothing}

          ${this._renderTabs()}

          ${this._activeTab === 'session' ? this._renderSessionTab() : nothing}
          ${this._activeTab === 'payment' ? this._renderPaymentFormTab() : nothing}
          ${this._activeTab === 'express' ? this._renderExpressCheckoutTab() : nothing}
          ${this._activeTab === 'webhooks' ? this._renderWebhooksTab() : nothing}
          ${this._activeTab === 'paymentlinks' ? this._renderPaymentLinksTab() : nothing}
          ${this._activeTab === 'vault' ? this._renderVaultTab() : nothing}
        </div>

        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>Close</uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    modalLayoutStyles,
    css`
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
      width: 100%;
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

    /* Payment link actions */
    .payment-link-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-3);
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
      gap: var(--uui-size-space-3);
    }

    .express-method-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .express-method-card {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .express-method-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .express-button-container {
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .express-button-container:empty {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .express-button-container:empty::before {
      content: "Click 'Load Button' to render the express checkout button";
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

    /* Vault section */
    .vault-section {
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .vault-section h4 {
      margin: 0 0 var(--uui-size-space-2) 0;
      font-size: 0.9375rem;
    }

    .vault-section .hint {
      margin-bottom: var(--uui-size-space-3);
    }

    .payment-form-container {
      min-height: 100px;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border: 1px dashed var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-3);
    }

    .button-group {
      display: flex;
      gap: var(--uui-size-space-2);
    }
  `,
  ];
}

export default MerchelloTestPaymentProviderModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-test-payment-provider-modal": MerchelloTestPaymentProviderModalElement;
  }
}

