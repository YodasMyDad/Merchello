import {
  LitElement,
  css,
  html,
  nothing,
  customElement,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, type UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT, type UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type {
  UcpFlowDiagnosticsDto,
  UcpFlowStepResultDto,
  UcpFlowTestAddressDto,
  UcpFlowTestBuyerInfoDto,
  UcpFlowTestCompleteSessionPayloadDto,
  UcpFlowTestCreateSessionPayloadDto,
  UcpFlowTestDiscountsDto,
  UcpFlowTestFulfillmentDto,
  UcpFlowTestFulfillmentGroupSelectionDto,
  UcpFlowTestFulfillmentMethodDto,
  UcpFlowTestLineItemDto,
  UcpFlowTestUpdateSessionPayloadDto,
  UcpTestCancelSessionRequestDto,
  UcpTestCompleteSessionRequestDto,
  UcpTestCreateSessionRequestDto,
  UcpTestGetOrderRequestDto,
  UcpTestGetSessionRequestDto,
  UcpTestManifestRequestDto,
  UcpTestUpdateSessionRequestDto,
} from "@api/merchello-api.js";
import { MERCHELLO_PRODUCT_PICKER_MODAL } from "@shared/product-picker/product-picker-modal.token.js";
import type { ProductPickerSelection, SelectedAddon } from "@shared/product-picker/product-picker.types.js";
import { formatNumber } from "@shared/utils/formatting.js";

type UcpFlowMode = "adapter" | "strict";
type UcpFlowTemplatePreset = "physical" | "digital" | "incomplete" | "multi-item";

interface UcpFlowSelectedProduct {
  key: string;
  productId: string;
  productRootId: string;
  name: string;
  sku: string | null;
  price: number;
  imageUrl: string | null;
  quantity: number;
  selectedAddons: SelectedAddon[];
}

interface UcpFlowFulfillmentOption {
  id: string;
  title: string;
  amount: number | null;
  currency: string | null;
}

interface UcpFlowFulfillmentGroup {
  id: string;
  name: string;
  selectedOptionId: string | null;
  options: UcpFlowFulfillmentOption[];
}

@customElement("merchello-ucp-flow-tester")
export class MerchelloUcpFlowTesterElement extends UmbElementMixin(LitElement) {
  @state()
  private _isLoadingDiagnostics = true;

  @state()
  private _diagnosticsError: string | null = null;

  @state()
  private _diagnostics: UcpFlowDiagnosticsDto | null = null;

  @state()
  private _modeRequested: UcpFlowMode = "adapter";

  @state()
  private _templatePreset: UcpFlowTemplatePreset = "physical";

  @state()
  private _agentId = "";

  @state()
  private _dryRun = true;

  @state()
  private _realOrderConfirmed = false;

  @state()
  private _paymentHandlerId = "manual:manual";

  @state()
  private _availablePaymentHandlerIds: string[] = [];

  @state()
  private _selectedProducts: UcpFlowSelectedProduct[] = [];

  @state()
  private _buyerEmail = "buyer@example.com";

  @state()
  private _buyerPhone = "+14155550100";

  @state()
  private _buyerGivenName = "Alex";

  @state()
  private _buyerFamilyName = "Taylor";

  @state()
  private _buyerAddressLine1 = "1 Test Street";

  @state()
  private _buyerAddressLine2 = "";

  @state()
  private _buyerLocality = "New York";

  @state()
  private _buyerAdministrativeArea = "NY";

  @state()
  private _buyerPostalCode = "10001";

  @state()
  private _buyerCountryCode = "US";

  @state()
  private _discountCodesInput = "";

  @state()
  private _sessionId: string | null = null;

  @state()
  private _sessionStatus: string | null = null;

  @state()
  private _orderId: string | null = null;

  @state()
  private _fulfillmentGroups: UcpFlowFulfillmentGroup[] = [];

  @state()
  private _selectedFulfillmentOptionIds: Record<string, string> = {};

  @state()
  private _transcripts: UcpFlowStepResultDto[] = [];

  @state()
  private _activeStep: string | null = null;

  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void this._loadDiagnostics();
  }

  private async _loadDiagnostics(): Promise<void> {
    this._isLoadingDiagnostics = true;
    this._diagnosticsError = null;

    const { data, error } = await MerchelloApi.getUcpFlowDiagnostics();
    if (error || !data) {
      this._diagnosticsError = error?.message ?? "Unable to load UCP flow diagnostics.";
      this._isLoadingDiagnostics = false;
      return;
    }

    this._diagnostics = data;
    if (!this._agentId) {
      this._agentId = data.simulatedAgentId ?? "";
    }
    this._isLoadingDiagnostics = false;
  }

  private _handleModeChange(event: Event): void {
    const value = this._readInputValue(event);
    this._modeRequested = value === "strict" ? "strict" : "adapter";
  }

  private _handleTemplatePresetChange(event: Event): void {
    const value = this._readInputValue(event);
    if (value === "digital" || value === "incomplete" || value === "multi-item" || value === "physical") {
      this._templatePreset = value;
    } else {
      this._templatePreset = "physical";
    }
  }

  private _handleAgentIdChange(event: Event): void {
    this._agentId = this._readInputValue(event);
  }

  private _handlePaymentHandlerIdChange(event: Event): void {
    this._paymentHandlerId = this._readInputValue(event);
  }

  private _handleDryRunChange(event: Event): void {
    const checked = this._readChecked(event);
    this._dryRun = checked;
    if (checked) {
      this._realOrderConfirmed = false;
    }
  }

  private _handleRealOrderConfirmedChange(event: Event): void {
    this._realOrderConfirmed = this._readChecked(event);
  }

  private _handleDiscountCodesChange(event: Event): void {
    this._discountCodesInput = this._readInputValue(event);
  }

  private _handleBuyerEmailChange(event: Event): void {
    this._buyerEmail = this._readInputValue(event);
  }

  private _handleBuyerPhoneChange(event: Event): void {
    this._buyerPhone = this._readInputValue(event);
  }

  private _handleBuyerGivenNameChange(event: Event): void {
    this._buyerGivenName = this._readInputValue(event);
  }

  private _handleBuyerFamilyNameChange(event: Event): void {
    this._buyerFamilyName = this._readInputValue(event);
  }

  private _handleBuyerAddressLine1Change(event: Event): void {
    this._buyerAddressLine1 = this._readInputValue(event);
  }

  private _handleBuyerAddressLine2Change(event: Event): void {
    this._buyerAddressLine2 = this._readInputValue(event);
  }

  private _handleBuyerLocalityChange(event: Event): void {
    this._buyerLocality = this._readInputValue(event);
  }

  private _handleBuyerAdministrativeAreaChange(event: Event): void {
    this._buyerAdministrativeArea = this._readInputValue(event);
  }

  private _handleBuyerPostalCodeChange(event: Event): void {
    this._buyerPostalCode = this._readInputValue(event);
  }

  private _handleBuyerCountryCodeChange(event: Event): void {
    this._buyerCountryCode = this._readInputValue(event).toUpperCase();
  }

  private _readInputValue(event: Event): string {
    const target = event.target as { value?: string | null };
    return target.value?.toString() ?? "";
  }

  private _readChecked(event: Event): boolean {
    const target = event.target as { checked?: boolean };
    return target.checked === true;
  }

  private _isStrictModeBlocked(): boolean {
    return this._modeRequested === "strict" &&
      this._diagnostics != null &&
      !this._diagnostics.strictModeAvailable;
  }

  private _switchToAdapterMode(): void {
    this._modeRequested = "adapter";
  }

  private _startNewRun(): void {
    this._sessionId = null;
    this._sessionStatus = null;
    this._orderId = null;
    this._fulfillmentGroups = [];
    this._selectedFulfillmentOptionIds = {};
    this._availablePaymentHandlerIds = [];
    this._paymentHandlerId = "manual:manual";
    this._transcripts = [];
    this._activeStep = null;
    this._realOrderConfirmed = false;
  }

  private async _openProductPicker(): Promise<void> {
    if (!this.#modalManager) {
      return;
    }

    const shippingAddress = this._templatePreset === "digital"
      ? null
      : {
          countryCode: this._buyerCountryCode || "US",
          regionCode: this._buyerAdministrativeArea || undefined,
        };

    const modal = this.#modalManager.open(this, MERCHELLO_PRODUCT_PICKER_MODAL, {
      data: {
        config: {
          currencySymbol: "$",
          shippingAddress,
          excludeProductIds: this._selectedProducts.map((x) => x.productId),
        },
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (!result?.selections?.length) {
      return;
    }

    this._mergeSelectedProducts(result.selections);
  }

  private _mergeSelectedProducts(selections: ProductPickerSelection[]): void {
    const next = [...this._selectedProducts];

    for (const selection of selections) {
      const normalized = this._normalizeSelectedProduct(selection);
      if (normalized == null) {
        continue;
      }

      const existingIndex = next.findIndex((item) => item.key === normalized.key);
      if (existingIndex >= 0) {
        const existing = next[existingIndex];
        next[existingIndex] = {
          ...existing,
          quantity: existing.quantity + 1,
        };
      } else {
        next.push(normalized);
      }
    }

    this._selectedProducts = next;
  }

  private _normalizeSelectedProduct(selection: ProductPickerSelection): UcpFlowSelectedProduct | null {
    if (!selection.productId || !selection.name) {
      return null;
    }

    const addons = selection.selectedAddons ?? [];
    const addonKey = addons
      .map((addon) => `${addon.optionId}:${addon.valueId}`)
      .sort()
      .join("|");

    return {
      key: `${selection.productId}::${addonKey}`,
      productId: selection.productId,
      productRootId: selection.productRootId,
      name: selection.name,
      sku: selection.sku ?? null,
      price: Number.isFinite(selection.price) ? selection.price : 0,
      imageUrl: selection.imageUrl ?? null,
      quantity: 1,
      selectedAddons: addons,
    };
  }

  private _updateProductQuantity(productKey: string, event: Event): void {
    const rawValue = this._readInputValue(event);
    const parsed = Number(rawValue);
    const quantity = Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 1;

    this._selectedProducts = this._selectedProducts.map((item) =>
      item.key === productKey
        ? {
            ...item,
            quantity,
          }
        : item
    );
  }

  private _removeProduct(productKey: string): void {
    this._selectedProducts = this._selectedProducts.filter((item) => item.key !== productKey);
  }

  private _updateFulfillmentGroupSelection(groupId: string, event: Event): void {
    const selectedOptionId = this._readInputValue(event);
    this._selectedFulfillmentOptionIds = {
      ...this._selectedFulfillmentOptionIds,
      [groupId]: selectedOptionId,
    };
  }

  private async _executeManifestStep(): Promise<void> {
    const request: UcpTestManifestRequestDto = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
    };

    await this._executeStep("manifest", () => MerchelloApi.ucpTestManifest(request));
  }

  private async _executeCreateSessionStep(): Promise<void> {
    if (this._selectedProducts.length === 0) {
      this._notify("warning", "Select at least one product before creating a session.");
      return;
    }

    const payload: UcpFlowTestCreateSessionPayloadDto = {
      lineItems: this._buildLineItemsPayload(),
      currency: "USD",
      buyer: this._buildBuyerPayload(),
      discounts: this._buildDiscountPayload(),
      fulfillment: this._buildCreateFulfillmentPayload(),
    };

    const request: UcpTestCreateSessionRequestDto = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      request: payload,
    };

    await this._executeStep("create_session", () => MerchelloApi.ucpTestCreateSession(request));
  }

  private async _executeGetSessionStep(): Promise<void> {
    if (!this._sessionId) {
      this._notify("warning", "Create a new session first.");
      return;
    }

    const request: UcpTestGetSessionRequestDto = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      sessionId: this._sessionId,
    };

    await this._executeStep("get_session", () => MerchelloApi.ucpTestGetSession(request));
  }

  private async _executeUpdateSessionStep(): Promise<void> {
    if (!this._sessionId) {
      this._notify("warning", "Create a new session first.");
      return;
    }

    const payload: UcpFlowTestUpdateSessionPayloadDto = {
      lineItems: this._buildLineItemsPayload(),
      buyer: this._buildBuyerPayload(),
      discounts: this._buildDiscountPayload(),
      fulfillment: this._buildUpdateFulfillmentPayload(),
    };

    const request: UcpTestUpdateSessionRequestDto = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      sessionId: this._sessionId,
      request: payload,
    };

    await this._executeStep("update_session", () => MerchelloApi.ucpTestUpdateSession(request));
  }

  private async _executeCompleteSessionStep(): Promise<void> {
    if (!this._sessionId) {
      this._notify("warning", "Create a new session first.");
      return;
    }

    if (!this._dryRun && !this._realOrderConfirmed) {
      this._notify("warning", "Confirm real order creation before running complete.");
      return;
    }

    const payload: UcpFlowTestCompleteSessionPayloadDto = {
      paymentHandlerId: this._paymentHandlerId,
    };

    const request: UcpTestCompleteSessionRequestDto = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      sessionId: this._sessionId,
      dryRun: this._dryRun,
      request: payload,
    };

    await this._executeStep("complete_session", () => MerchelloApi.ucpTestCompleteSession(request));
  }

  private async _executeGetOrderStep(): Promise<void> {
    if (!this._orderId) {
      this._notify("warning", "No order ID is available yet.");
      return;
    }

    const request: UcpTestGetOrderRequestDto = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      orderId: this._orderId,
    };

    await this._executeStep("get_order", () => MerchelloApi.ucpTestGetOrder(request));
  }

  private async _executeCancelSessionStep(): Promise<void> {
    if (!this._sessionId) {
      this._notify("warning", "No session is active.");
      return;
    }

    const request: UcpTestCancelSessionRequestDto = {
      modeRequested: this._modeRequested,
      agentId: this._getAgentIdForRequest(),
      sessionId: this._sessionId,
    };

    await this._executeStep("cancel_session", () => MerchelloApi.ucpTestCancelSession(request));
  }

  private async _executeStep(
    stepName: string,
    runner: () => Promise<{ data?: UcpFlowStepResultDto; error?: Error }>
  ): Promise<void> {
    if (this._activeStep) {
      return;
    }

    this._activeStep = stepName;

    const { data, error } = await runner();
    if (error || !data) {
      this._notify("danger", error?.message ?? `Step ${stepName} failed.`);
      this._activeStep = null;
      return;
    }

    this._applyStepResult(data);
    this._activeStep = null;
  }

  private _applyStepResult(result: UcpFlowStepResultDto): void {
    this._transcripts = [...this._transcripts, result];

    if (result.sessionId) {
      this._sessionId = result.sessionId;
    }
    if (result.status) {
      this._sessionStatus = result.status;
    }
    if (result.orderId) {
      this._orderId = result.orderId;
    }

    this._syncPaymentHandlers(result.responseData);
    this._syncFulfillmentGroups(result.responseData);
  }

  private _syncPaymentHandlers(responseData: unknown): void {
    const root = this._asObject(responseData);
    if (!root) {
      return;
    }

    const ucp = this._asObject(root.ucp);
    const handlers = this._asArray(ucp?.payment_handlers);
    const ids = handlers
      .map((handler) => this._asObject(handler))
      .map((handler) => this._asString(handler?.handler_id))
      .filter((handlerId): handlerId is string => !!handlerId);

    if (ids.length === 0) {
      return;
    }

    this._availablePaymentHandlerIds = Array.from(new Set(ids));
    if (!this._availablePaymentHandlerIds.includes(this._paymentHandlerId)) {
      this._paymentHandlerId = this._availablePaymentHandlerIds[0];
    }
  }

  private _syncFulfillmentGroups(responseData: unknown): void {
    const root = this._asObject(responseData);
    if (!root) {
      return;
    }

    const fulfillment = this._asObject(root.fulfillment);
    if (!fulfillment) {
      return;
    }

    const methods = this._asArray(fulfillment.methods);
    const groups: UcpFlowFulfillmentGroup[] = [];

    for (const method of methods) {
      const methodObject = this._asObject(method);
      if (!methodObject) {
        continue;
      }

      for (const group of this._asArray(methodObject.groups)) {
        const groupObject = this._asObject(group);
        const groupId = this._asString(groupObject?.id);
        if (!groupObject || !groupId) {
          continue;
        }

        const optionItems = this._asArray(groupObject.options)
          .map((option) => this._asObject(option))
          .filter((option): option is Record<string, unknown> => option != null)
          .map((option) => {
            const totals = this._asArray(option.totals);
            const firstTotal = this._asObject(totals[0]);
            return {
              id: this._asString(option.id) ?? "",
              title: this._asString(option.title) ?? "Option",
              amount: this._asNumber(firstTotal?.amount),
              currency: this._asString(firstTotal?.currency),
            } satisfies UcpFlowFulfillmentOption;
          })
          .filter((option) => option.id.length > 0);

        groups.push({
          id: groupId,
          name: this._asString(groupObject.name) ?? groupId,
          selectedOptionId: this._asString(groupObject.selected_option_id),
          options: optionItems,
        });
      }
    }

    if (groups.length === 0) {
      return;
    }

    const selectedMap: Record<string, string> = { ...this._selectedFulfillmentOptionIds };
    for (const group of groups) {
      if (!selectedMap[group.id]) {
        if (group.selectedOptionId) {
          selectedMap[group.id] = group.selectedOptionId;
        } else if (group.options.length === 1) {
          selectedMap[group.id] = group.options[0].id;
        }
      }
    }

    this._fulfillmentGroups = groups;
    this._selectedFulfillmentOptionIds = selectedMap;
  }

  private _buildLineItemsPayload(): UcpFlowTestLineItemDto[] {
    const selected = [...this._selectedProducts];
    if (this._templatePreset === "multi-item" && selected.length === 1) {
      selected.push({
        ...selected[0],
        key: `${selected[0].key}::copy`,
      });
    }

    return selected.map((product, index) => ({
      id: `li-${index + 1}`,
      quantity: Math.max(1, product.quantity),
      item: {
        id: product.productId,
        title: product.name,
        price: this._toMinorUnits(product.price),
        imageUrl: product.imageUrl ?? undefined,
        options: product.selectedAddons.map((addon) => ({
          name: addon.optionName,
          value: addon.valueName,
        })),
      },
    }));
  }

  private _buildBuyerPayload(): UcpFlowTestBuyerInfoDto | undefined {
    if (this._templatePreset === "incomplete") {
      return {
        billingAddress: {
          countryCode: this._buyerCountryCode || "US",
        },
      };
    }

    const address = this._buildAddressPayload();
    if (this._templatePreset === "digital") {
      return {
        email: this._normalizeOrNull(this._buyerEmail) ?? "buyer@example.com",
        phone: this._normalizeOrNull(this._buyerPhone),
        billingAddress: address,
        shippingSameAsBilling: true,
      };
    }

    return {
      email: this._normalizeOrNull(this._buyerEmail) ?? "buyer@example.com",
      phone: this._normalizeOrNull(this._buyerPhone),
      billingAddress: address,
      shippingAddress: address,
      shippingSameAsBilling: true,
    };
  }

  private _buildAddressPayload(): UcpFlowTestAddressDto {
    return {
      givenName: this._normalizeOrNull(this._buyerGivenName) ?? "Alex",
      familyName: this._normalizeOrNull(this._buyerFamilyName) ?? "Taylor",
      addressLine1: this._normalizeOrNull(this._buyerAddressLine1) ?? "1 Test Street",
      addressLine2: this._normalizeOrNull(this._buyerAddressLine2),
      locality: this._normalizeOrNull(this._buyerLocality) ?? "New York",
      administrativeArea: this._normalizeOrNull(this._buyerAdministrativeArea) ?? "NY",
      postalCode: this._normalizeOrNull(this._buyerPostalCode) ?? "10001",
      countryCode: this._normalizeOrNull(this._buyerCountryCode) ?? "US",
      phone: this._normalizeOrNull(this._buyerPhone),
    };
  }

  private _buildDiscountPayload(): UcpFlowTestDiscountsDto | undefined {
    const codes = this._discountCodesInput
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);

    if (codes.length === 0) {
      return undefined;
    }

    return {
      codes,
    };
  }

  private _buildCreateFulfillmentPayload(): UcpFlowTestFulfillmentDto | undefined {
    if (this._templatePreset === "digital") {
      return undefined;
    }

    const method: UcpFlowTestFulfillmentMethodDto = {
      type: "shipping",
      destinations: [
        {
          type: "postal_address",
          address: this._buildAddressPayload(),
        },
      ],
    };

    return {
      methods: [method],
    };
  }

  private _buildUpdateFulfillmentPayload(): UcpFlowTestFulfillmentDto | undefined {
    if (this._templatePreset === "digital" && this._fulfillmentGroups.length === 0) {
      return undefined;
    }

    const groupSelections = this._buildFulfillmentGroupSelections();
    const methods: UcpFlowTestFulfillmentMethodDto[] = this._templatePreset === "digital"
      ? []
      : [
          {
            type: "shipping",
            destinations: [
              {
                type: "postal_address",
                address: this._buildAddressPayload(),
              },
            ],
            groups: groupSelections,
          },
        ];

    return {
      methods: methods.length > 0 ? methods : undefined,
      groups: groupSelections.length > 0 ? groupSelections : undefined,
    };
  }

  private _buildFulfillmentGroupSelections(): UcpFlowTestFulfillmentGroupSelectionDto[] {
    return Object.entries(this._selectedFulfillmentOptionIds)
      .map(([id, selectedOptionId]) => ({
        id,
        selectedOptionId,
      }))
      .filter((entry) => !!entry.id && !!entry.selectedOptionId);
  }

  private _toMinorUnits(amount: number): number {
    if (!Number.isFinite(amount)) {
      return 0;
    }

    return Math.round(amount * 100);
  }

  private _normalizeOrNull(value: string): string | null {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private _getAgentIdForRequest(): string | undefined {
    const normalized = this._agentId.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private _asObject(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return null;
  }

  private _asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private _asString(value: unknown): string | null {
    if (typeof value === "string") {
      const normalized = value.trim();
      return normalized.length > 0 ? normalized : null;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    return null;
  }

  private _asNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private _formatSnapshotBody(body: string | null | undefined): string {
    const normalized = body?.trim();
    if (!normalized) {
      return "(empty)";
    }

    try {
      return JSON.stringify(JSON.parse(normalized), null, 2);
    } catch {
      return normalized;
    }
  }

  private async _copyText(value: string, label: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this._notify("positive", `${label} copied.`);
    } catch {
      this._notify("warning", "Clipboard write failed.");
    }
  }

  private _notify(color: "positive" | "warning" | "danger", message: string): void {
    this.#notificationContext?.peek(color, {
      data: {
        headline: "UCP Flow Tester",
        message,
      },
    });
  }
  private _renderDiagnosticsPanel(): unknown {
    if (this._isLoadingDiagnostics) {
      return html`<div class="loading-row"><uui-loader></uui-loader><span>Loading diagnostics...</span></div>`;
    }

    if (this._diagnosticsError) {
      return html`
        <div class="error-banner">
          <span>${this._diagnosticsError}</span>
          <uui-button label="Retry diagnostics" look="secondary" @click=${this._loadDiagnostics}>Retry</uui-button>
        </div>
      `;
    }

    if (!this._diagnostics) {
      return nothing;
    }

    return html`
      <div class="diagnostics-grid">
        <div><span class="label">Protocol Version</span><span class="value">${this._diagnostics.protocolVersion}</span></div>
        <div><span class="label">Strict Mode</span><span class="value">${this._diagnostics.strictModeAvailable ? "Available" : "Blocked"}</span></div>
        <div><span class="label">Public Base URL</span><span class="value">${this._diagnostics.publicBaseUrl || "-"}</span></div>
        <div><span class="label">Effective Base URL</span><span class="value">${this._diagnostics.effectiveBaseUrl || "-"}</span></div>
        <div><span class="label">Require HTTPS</span><span class="value">${this._diagnostics.requireHttps ? "Yes" : "No"}</span></div>
        <div><span class="label">Minimum TLS</span><span class="value">${this._diagnostics.minimumTlsVersion}</span></div>
        <div><span class="label">Agent Profile URL</span><span class="value">${this._diagnostics.simulatedAgentProfileUrl || "-"}</span></div>
        <div><span class="label">Fallback Mode</span><span class="value">${this._diagnostics.strictFallbackMode}</span></div>
      </div>

      <div class="token-row">
        <span class="label">Capabilities</span>
        ${this._diagnostics.capabilities.length === 0
          ? html`<span class="value">None</span>`
          : this._diagnostics.capabilities.map((capability) => html`<uui-tag>${capability}</uui-tag>`)}
      </div>

      <div class="token-row">
        <span class="label">Extensions</span>
        ${this._diagnostics.extensions.length === 0
          ? html`<span class="value">None</span>`
          : this._diagnostics.extensions.map((extension) => html`<uui-tag>${extension}</uui-tag>`)}
      </div>
    `;
  }

  private _renderStrictBlockedBanner(): unknown {
    if (!this._isStrictModeBlocked()) {
      return nothing;
    }

    return html`
      <div class="warning-banner">
        <div>
          <strong>Strict mode is blocked.</strong>
          <div>${this._diagnostics?.strictModeBlockReason || "Strict mode is unavailable in this runtime."}</div>
        </div>
        <uui-button
          label="Switch to adapter mode"
          look="primary"
          color="positive"
          @click=${this._switchToAdapterMode}>
          Switch to Adapter
        </uui-button>
      </div>
    `;
  }

  private _renderSetupPanel(): unknown {
    return html`
      ${this._renderStrictBlockedBanner()}

      <div class="setup-grid">
        <umb-property-layout label="Execution Mode" description="Adapter executes the protocol adapter directly. Strict executes signed HTTP calls.">
          <uui-select slot="editor" label="Execution Mode" .value=${this._modeRequested} @change=${this._handleModeChange}>
            <option value="adapter">Adapter Mode</option>
            <option value="strict">Strict HTTP Mode</option>
          </uui-select>
        </umb-property-layout>

        <umb-property-layout label="Template" description="Guided setup presets for common UCP scenarios.">
          <uui-select slot="editor" label="Template" .value=${this._templatePreset} @change=${this._handleTemplatePresetChange}>
            <option value="physical">Physical Product</option>
            <option value="digital">Digital Product</option>
            <option value="incomplete">Incomplete Buyer</option>
            <option value="multi-item">Multi-item</option>
          </uui-select>
        </umb-property-layout>

        <umb-property-layout label="Agent ID" description="Used to build the simulated test agent profile URL.">
          <uui-input slot="editor" label="Agent ID" .value=${this._agentId} @input=${this._handleAgentIdChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Dry Run Complete" description="When enabled, complete returns a preview and does not create an order.">
          <uui-toggle slot="editor" label="Dry Run Complete" ?checked=${this._dryRun} @change=${this._handleDryRunChange}></uui-toggle>
        </umb-property-layout>

        <umb-property-layout label="Real Order Confirmation" description="Required before running complete with dry-run disabled.">
          <uui-toggle
            slot="editor"
            label="Real Order Confirmation"
            ?disabled=${this._dryRun}
            ?checked=${this._realOrderConfirmed}
            @change=${this._handleRealOrderConfirmedChange}>
          </uui-toggle>
        </umb-property-layout>

        <umb-property-layout label="Payment Handler ID" description="Used for complete session requests in real mode.">
          ${this._availablePaymentHandlerIds.length > 0
            ? html`
                <uui-select slot="editor" label="Payment Handler ID" .value=${this._paymentHandlerId} @change=${this._handlePaymentHandlerIdChange}>
                  ${this._availablePaymentHandlerIds.map((handlerId) => html`<option value=${handlerId}>${handlerId}</option>`)}
                </uui-select>
              `
            : html`
                <uui-input slot="editor" label="Payment Handler ID" .value=${this._paymentHandlerId} @input=${this._handlePaymentHandlerIdChange}></uui-input>
              `}
        </umb-property-layout>
      </div>

      <div class="section-toolbar">
        <uui-button label="Add products" look="primary" color="positive" @click=${this._openProductPicker}>Pick Products</uui-button>
        <uui-button label="Start a new run" look="secondary" @click=${this._startNewRun}>Start New Run</uui-button>
      </div>

      ${this._renderSelectedProducts()}
      ${this._renderBuyerAndDiscountSetup()}
      ${this._renderFulfillmentSelections()}
    `;
  }

  private _renderSelectedProducts(): unknown {
    if (this._selectedProducts.length === 0) {
      return html`<div class="empty-note">No products selected yet.</div>`;
    }

    return html`
      <div class="product-list">
        ${this._selectedProducts.map((product) => html`
          <div class="product-row">
            <div class="product-main">
              <strong>${product.name}</strong>
              <span>${product.sku || "No SKU"} · $${formatNumber(product.price, 2)}</span>
            </div>
            <uui-input
              class="qty-input"
              type="number"
              min="1"
              label="Quantity"
              .value=${String(product.quantity)}
              @input=${(event: Event) => this._updateProductQuantity(product.key, event)}>
            </uui-input>
            <uui-button
              look="secondary"
              color="danger"
              label="Remove product"
              @click=${() => this._removeProduct(product.key)}>
              Remove
            </uui-button>
          </div>
        `)}
      </div>
    `;
  }

  private _renderBuyerAndDiscountSetup(): unknown {
    return html`
      <div class="setup-grid">
        <umb-property-layout label="Buyer Email">
          <uui-input slot="editor" label="Buyer Email" .value=${this._buyerEmail} @input=${this._handleBuyerEmailChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Buyer Phone">
          <uui-input slot="editor" label="Buyer Phone" .value=${this._buyerPhone} @input=${this._handleBuyerPhoneChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Given Name">
          <uui-input slot="editor" label="Given Name" .value=${this._buyerGivenName} @input=${this._handleBuyerGivenNameChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Family Name">
          <uui-input slot="editor" label="Family Name" .value=${this._buyerFamilyName} @input=${this._handleBuyerFamilyNameChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Address Line 1">
          <uui-input slot="editor" label="Address Line 1" .value=${this._buyerAddressLine1} @input=${this._handleBuyerAddressLine1Change}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Address Line 2">
          <uui-input slot="editor" label="Address Line 2" .value=${this._buyerAddressLine2} @input=${this._handleBuyerAddressLine2Change}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Town/City">
          <uui-input slot="editor" label="Town/City" .value=${this._buyerLocality} @input=${this._handleBuyerLocalityChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Region">
          <uui-input slot="editor" label="Region" .value=${this._buyerAdministrativeArea} @input=${this._handleBuyerAdministrativeAreaChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Postal Code">
          <uui-input slot="editor" label="Postal Code" .value=${this._buyerPostalCode} @input=${this._handleBuyerPostalCodeChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Country Code">
          <uui-input slot="editor" label="Country Code" maxlength="2" .value=${this._buyerCountryCode} @input=${this._handleBuyerCountryCodeChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Discount Codes" description="Comma-separated promotional codes.">
          <uui-input slot="editor" label="Discount Codes" .value=${this._discountCodesInput} @input=${this._handleDiscountCodesChange}></uui-input>
        </umb-property-layout>
      </div>
    `;
  }

  private _renderFulfillmentSelections(): unknown {
    if (this._fulfillmentGroups.length === 0) {
      return html`<div class="empty-note">No fulfillment groups available yet. Run create/get/update first.</div>`;
    }

    return html`
      <div class="group-list">
        ${this._fulfillmentGroups.map((group) => html`
          <div class="group-row">
            <div class="group-main">
              <strong>${group.name}</strong>
              <span>${group.id}</span>
            </div>
            <uui-select
              label="Fulfillment option"
              .value=${this._selectedFulfillmentOptionIds[group.id] ?? ""}
              @change=${(event: Event) => this._updateFulfillmentGroupSelection(group.id, event)}>
              <option value="">Select option</option>
              ${group.options.map((option) => html`
                <option value=${option.id}>
                  ${option.title}${option.amount != null ? ` (${option.currency || ""} ${option.amount})` : ""}
                </option>
              `)}
            </uui-select>
          </div>
        `)}
      </div>
    `;
  }

  private _renderWizardSteps(): unknown {
    const sessionReady = !!this._sessionId;
    const orderReady = !!this._orderId;
    const completeDisabled = !sessionReady || (!this._dryRun && !this._realOrderConfirmed);

    return html`
      <div class="steps">
        ${this._renderStep("Manifest", "manifest", this._executeManifestStep, false)}
        ${this._renderStep("Create Session", "create_session", this._executeCreateSessionStep, this._selectedProducts.length === 0)}
        ${this._renderStep("Get Session", "get_session", this._executeGetSessionStep, !sessionReady)}
        ${this._renderStep("Update Session", "update_session", this._executeUpdateSessionStep, !sessionReady)}
        ${this._renderStep("Complete Session", "complete_session", this._executeCompleteSessionStep, completeDisabled)}
        ${this._renderStep("Get Order", "get_order", this._executeGetOrderStep, !orderReady)}
        ${this._renderStep("Cancel Session", "cancel_session", this._executeCancelSessionStep, !sessionReady)}
      </div>
    `;
  }

  private _renderStep(
    label: string,
    stepKey: string,
    action: () => Promise<void>,
    disabled: boolean
  ): unknown {
    const isRunning = this._activeStep === stepKey;
    return html`
      <div class="step-row">
        <div class="step-label">${label}</div>
        <uui-button
          look="primary"
          color="positive"
          label=${label}
          ?disabled=${disabled || !!this._activeStep}
          @click=${action}>
          ${isRunning ? "Running..." : label}
        </uui-button>
      </div>
    `;
  }

  private _renderRunState(): unknown {
    return html`
      <div class="runtime-state">
        <div><span class="label">Session ID</span><span class="value">${this._sessionId || "-"}</span></div>
        <div><span class="label">Session Status</span><span class="value">${this._sessionStatus || "-"}</span></div>
        <div><span class="label">Order ID</span><span class="value">${this._orderId || "-"}</span></div>
      </div>
    `;
  }

  private _renderTranscriptPanel(): unknown {
    if (this._transcripts.length === 0) {
      return html`<div class="empty-note">Run wizard steps to capture request/response transcripts.</div>`;
    }

    return html`
      <div class="transcripts">
        ${[...this._transcripts].reverse().map((entry) => {
          const requestBody = this._formatSnapshotBody(entry.request?.body);
          const responseBody = this._formatSnapshotBody(entry.response?.body);
          const requestHeaderJson = JSON.stringify(entry.request?.headers ?? {}, null, 2);
          const responseHeaderJson = JSON.stringify(entry.response?.headers ?? {}, null, 2);
          const modeLabel = `${entry.modeRequested} -> ${entry.modeExecuted}`;
          return html`
            <details class="transcript-item">
              <summary>
                <span class="summary-step">${entry.step}</span>
                <span class=${entry.success ? "badge positive" : "badge danger"}>${entry.success ? "Success" : "Failed"}</span>
                <span class="badge neutral">${modeLabel}</span>
                ${entry.fallbackApplied ? html`<span class="badge warning">Fallback</span>` : nothing}
                <span class="badge neutral">HTTP ${entry.response?.statusCode ?? "-"}</span>
              </summary>

              ${entry.fallbackReason ? html`<div class="fallback-reason">${entry.fallbackReason}</div>` : nothing}

              <div class="transcript-actions">
                <uui-button
                  look="secondary"
                  label="Copy Request"
                  @click=${() => this._copyText(`Headers:\n${requestHeaderJson}\n\nBody:\n${requestBody}`, "Request")}>
                  Copy Request
                </uui-button>
                <uui-button
                  look="secondary"
                  label="Copy Response"
                  @click=${() => this._copyText(`Headers:\n${responseHeaderJson}\n\nBody:\n${responseBody}`, "Response")}>
                  Copy Response
                </uui-button>
              </div>

              <div class="transcript-grid">
                <div>
                  <h5>Request</h5>
                  <div class="code-block">${requestHeaderJson}</div>
                  <div class="code-block">${requestBody}</div>
                </div>
                <div>
                  <h5>Response</h5>
                  <div class="code-block">${responseHeaderJson}</div>
                  <div class="code-block">${responseBody}</div>
                </div>
              </div>
            </details>
          `;
        })}
      </div>
    `;
  }

  override render() {
    return html`
      <uui-box headline="Runtime Diagnostics">
        ${this._renderDiagnosticsPanel()}
      </uui-box>

      <uui-box headline="Run Setup">
        ${this._renderSetupPanel()}
      </uui-box>

      <uui-box headline="Wizard Steps">
        ${this._renderRunState()}
        ${this._renderWizardSteps()}
      </uui-box>

      <uui-box headline="Step Transcript">
        ${this._renderTranscriptPanel()}
      </uui-box>
    `;
  }

  static override readonly styles = css`    :host {
      display: block;
      width: 100%;
    }

    .loading-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .diagnostics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-4);
    }

    .setup-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: var(--uui-size-space-3);
    }

    .runtime-state {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
    }

    .label {
      display: block;
      font-size: 0.8rem;
      color: var(--uui-color-text-alt);
      margin-bottom: 2px;
    }

    .value {
      display: block;
      font-size: 0.95rem;
      word-break: break-word;
    }

    .token-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .warning-banner,
    .error-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
      border-radius: 8px;
      border: 1px solid var(--uui-color-warning-standalone);
      padding: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
      background: color-mix(in srgb, var(--uui-color-warning-standalone) 12%, white);
    }

    .error-banner {
      border-color: var(--uui-color-danger-standalone);
      background: color-mix(in srgb, var(--uui-color-danger-standalone) 10%, white);
    }

    .section-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin: var(--uui-size-space-4) 0;
    }

    .product-list,
    .group-list {
      display: grid;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-4);
    }

    .product-row,
    .group-row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-divider);
      border-radius: 8px;
      padding: var(--uui-size-space-2);
      background: var(--uui-color-surface);
    }

    .group-row {
      grid-template-columns: 1fr minmax(220px, 320px);
    }

    .product-main,
    .group-main {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .product-main span,
    .group-main span {
      color: var(--uui-color-text-alt);
      font-size: 0.85rem;
    }

    .qty-input {
      width: 88px;
    }

    .steps {
      display: grid;
      gap: var(--uui-size-space-2);
    }

    .step-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--uui-size-space-2);
      align-items: center;
      border: 1px solid var(--uui-color-divider);
      border-radius: 8px;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
    }

    .step-label {
      font-weight: 600;
    }

    .empty-note {
      color: var(--uui-color-text-alt);
      padding: var(--uui-size-space-2) 0;
    }

    .transcripts {
      display: grid;
      gap: var(--uui-size-space-3);
    }

    .transcript-item {
      border: 1px solid var(--uui-color-divider);
      border-radius: 8px;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-surface);
    }

    .transcript-item summary {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      cursor: pointer;
      list-style: none;
    }

    .summary-step {
      font-weight: 600;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge.positive {
      color: #fff;
      background: var(--uui-color-positive-standalone);
    }

    .badge.danger {
      color: #fff;
      background: var(--uui-color-danger-standalone);
    }

    .badge.warning {
      color: #fff;
      background: var(--merchello-color-warning-status-background, #8a6500);
    }

    .badge.neutral {
      color: var(--uui-color-text);
      background: color-mix(in srgb, var(--uui-color-divider) 60%, white);
    }

    .fallback-reason {
      margin-top: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
      font-size: 0.85rem;
    }

    .transcript-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .transcript-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-3);
    }

    .transcript-grid h5 {
      margin: 0 0 var(--uui-size-space-1) 0;
      font-size: 0.9rem;
    }

    .code-block {
      white-space: pre-wrap;
      font-family: var(--uui-font-family-monospace, "Consolas", "Courier New", monospace);
      font-size: 0.75rem;
      line-height: 1.35;
      border: 1px solid var(--uui-color-divider);
      border-radius: 6px;
      padding: var(--uui-size-space-2);
      background: color-mix(in srgb, var(--uui-color-surface) 70%, #f4f7fa);
      max-height: 280px;
      overflow: auto;
      margin-bottom: var(--uui-size-space-2);
    }

    @media (max-width: 900px) {
      .product-row {
        grid-template-columns: 1fr;
      }

      .group-row {
        grid-template-columns: 1fr;
      }

      .step-row {
        grid-template-columns: 1fr;
      }

      .transcript-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
}

export default MerchelloUcpFlowTesterElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-ucp-flow-tester": MerchelloUcpFlowTesterElement;
  }
}