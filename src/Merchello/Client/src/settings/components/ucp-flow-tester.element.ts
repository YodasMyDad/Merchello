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
type UcpStepStatus = "idle" | "running" | "success" | "error";

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

interface UcpStepDefinition {
  key: string;
  label: string;
  desc: string;
  disabled: boolean;
  action: () => Promise<void>;
}

@customElement("merchello-ucp-flow-tester")
export class MerchelloUcpFlowTesterElement extends UmbElementMixin(LitElement) {
  @state() private _isLoadingDiagnostics = true;
  @state() private _diagnosticsError: string | null = null;
  @state() private _diagnostics: UcpFlowDiagnosticsDto | null = null;
  @state() private _modeRequested: UcpFlowMode = "adapter";
  @state() private _templatePreset: UcpFlowTemplatePreset = "physical";
  @state() private _agentId = "";
  @state() private _dryRun = true;
  @state() private _realOrderConfirmed = false;
  @state() private _paymentHandlerId = "manual:manual";
  @state() private _availablePaymentHandlerIds: string[] = [];
  @state() private _selectedProducts: UcpFlowSelectedProduct[] = [];
  @state() private _buyerEmail = "buyer@example.com";
  @state() private _buyerPhone = "+14155550100";
  @state() private _buyerGivenName = "Alex";
  @state() private _buyerFamilyName = "Taylor";
  @state() private _buyerAddressLine1 = "1 Test Street";
  @state() private _buyerAddressLine2 = "";
  @state() private _buyerLocality = "New York";
  @state() private _buyerAdministrativeArea = "NY";
  @state() private _buyerPostalCode = "10001";
  @state() private _buyerCountryCode = "US";
  @state() private _discountCodesInput = "";
  @state() private _sessionId: string | null = null;
  @state() private _sessionStatus: string | null = null;
  @state() private _orderId: string | null = null;
  @state() private _fulfillmentGroups: UcpFlowFulfillmentGroup[] = [];
  @state() private _selectedFulfillmentOptionIds: Record<string, string> = {};
  @state() private _transcripts: UcpFlowStepResultDto[] = [];
  @state() private _activeStep: string | null = null;
  @state() private _expandedStep: string | null = null;
  @state() private _openSections: Set<string> = new Set(["scenario", "products"]);

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

  // ─── Business Logic ───────────────────────────────────────────────────────

  private async _loadDiagnostics(): Promise<void> {
    this._isLoadingDiagnostics = true;
    this._diagnosticsError = null;

    const { data, error } = await MerchelloApi.getUcpFlowDiagnostics();
    if (error || !data) {
      this._diagnosticsError = error?.message ?? this._t("merchello_ucpFlowTesterDiagnosticsLoadFailed", "Unable to load UCP flow diagnostics.");
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

  private _t(key: string, fallback: string): string {
    const localize = (this as { localize?: { termOrDefault?: (termKey: string, defaultValue: string) => string } }).localize;
    if (localize?.termOrDefault) {
      return localize.termOrDefault(key, fallback);
    }
    return fallback;
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
    this._expandedStep = null;
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
      item.key === productKey ? { ...item, quantity } : item
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
      this._notify("warning", this._t("merchello_ucpFlowTesterSelectProductWarning", "Select at least one product before creating a session."));
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
      this._notify("warning", this._t("merchello_ucpFlowTesterCreateSessionFirstWarning", "Create a new session first."));
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
      this._notify("warning", this._t("merchello_ucpFlowTesterCreateSessionFirstWarning", "Create a new session first."));
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
      this._notify("warning", this._t("merchello_ucpFlowTesterCreateSessionFirstWarning", "Create a new session first."));
      return;
    }

    if (!this._dryRun && !this._realOrderConfirmed) {
      this._notify("warning", this._t("merchello_ucpFlowTesterConfirmRealOrderWarning", "Confirm real order creation before running complete."));
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
      this._notify("warning", this._t("merchello_ucpFlowTesterNoOrderIdWarning", "No order ID is available yet."));
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
      this._notify("warning", this._t("merchello_ucpFlowTesterNoActiveSessionWarning", "No session is active."));
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
    try {
      const { data, error } = await runner();
      if (error || !data) {
        this._notify("danger", error?.message ?? this._t("merchello_ucpFlowTesterStepFailed", `Step ${stepName} failed.`));
        return;
      }

      this._applyStepResult(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : this._t("merchello_ucpFlowTesterStepFailed", `Step ${stepName} failed.`);
      this._notify("danger", message);
    } finally {
      this._activeStep = null;
    }
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
    this._expandedStep = result.step ?? null;
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
              title: this._asString(option.title) ?? this._t("merchello_ucpFlowTesterOptionLabel", "Option"),
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

    return { codes };
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

    return { methods: [method] };
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
      .map(([id, selectedOptionId]) => ({ id, selectedOptionId }))
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
      return this._t("merchello_ucpFlowTesterEmptySnapshot", "(empty)");
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
      this._notify("positive", this._t("merchello_ucpFlowTesterCopied", `${label} copied.`));
    } catch {
      this._notify("warning", this._t("merchello_ucpFlowTesterClipboardFailed", "Clipboard write failed."));
    }
  }

  private _notify(color: "positive" | "warning" | "danger", message: string): void {
    this.#notificationContext?.peek(color, {
      data: {
        headline: this._t("merchello_ucpFlowTesterHeadline", "UCP Flow Tester"),
        message,
      },
    });
  }

  // ─── UX Helpers ───────────────────────────────────────────────────────────

  private _getStepTranscript(stepKey: string): UcpFlowStepResultDto | null {
    for (let i = this._transcripts.length - 1; i >= 0; i--) {
      if (this._transcripts[i].step === stepKey) {
        return this._transcripts[i];
      }
    }
    return null;
  }

  private _getStepStatus(stepKey: string): UcpStepStatus {
    if (this._activeStep === stepKey) return "running";
    const transcript = this._getStepTranscript(stepKey);
    if (!transcript) return "idle";
    return transcript.success ? "success" : "error";
  }

  private _toggleSection(key: string): void {
    const next = new Set(this._openSections);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this._openSections = next;
  }

  private _toggleStep(stepKey: string): void {
    this._expandedStep = this._expandedStep === stepKey ? null : stepKey;
  }

  // ─── Option Helpers ───────────────────────────────────────────────────────

  private _getExecutionModeOptions(): Array<{ name: string; value: string; selected: boolean }> {
    return [
      { name: this._t("merchello_ucpFlowTesterAdapterMode", "Adapter Mode"), value: "adapter", selected: this._modeRequested === "adapter" },
      { name: this._t("merchello_ucpFlowTesterStrictHttpMode", "Strict HTTP Mode"), value: "strict", selected: this._modeRequested === "strict" },
    ];
  }

  private _getTemplateOptions(): Array<{ name: string; value: string; selected: boolean }> {
    return [
      { name: this._t("merchello_ucpFlowTesterTemplatePhysical", "Physical Product"), value: "physical", selected: this._templatePreset === "physical" },
      { name: this._t("merchello_ucpFlowTesterTemplateDigital", "Digital Product"), value: "digital", selected: this._templatePreset === "digital" },
      { name: this._t("merchello_ucpFlowTesterTemplateIncompleteBuyer", "Incomplete Buyer"), value: "incomplete", selected: this._templatePreset === "incomplete" },
      { name: this._t("merchello_ucpFlowTesterTemplateMultiItem", "Multi-item"), value: "multi-item", selected: this._templatePreset === "multi-item" },
    ];
  }

  private _getPaymentHandlerOptions(): Array<{ name: string; value: string; selected: boolean }> {
    return this._availablePaymentHandlerIds.map((handlerId) => ({
      name: handlerId,
      value: handlerId,
      selected: handlerId === this._paymentHandlerId,
    }));
  }

  private _getFulfillmentGroupOptions(group: UcpFlowFulfillmentGroup): Array<{ name: string; value: string; selected: boolean }> {
    return [
      { name: this._t("merchello_ucpFlowTesterSelectOption", "Select option"), value: "", selected: !this._selectedFulfillmentOptionIds[group.id] },
      ...group.options.map((option) => ({
        name: `${option.title}${option.amount != null ? ` (${option.currency || ""} ${option.amount})` : ""}`,
        value: option.id,
        selected: this._selectedFulfillmentOptionIds[group.id] === option.id,
      })),
    ];
  }

  // ─── Render: Diagnostics Bar ──────────────────────────────────────────────

  private _renderDiagnosticsBar(): unknown {
    if (this._isLoadingDiagnostics) {
      return html`
        <div class="diagnostics-bar">
          <div class="loading-row">
            <uui-loader></uui-loader>
            <span>${this._t("merchello_ucpFlowTesterLoadingDiagnostics", "Loading diagnostics...")}</span>
          </div>
        </div>
      `;
    }

    if (this._diagnosticsError) {
      return html`
        <div class="diagnostics-bar diagnostics-bar--error">
          <span>${this._diagnosticsError}</span>
          <uui-button look="secondary" .label=${this._t("general_retry", "Retry")} @click=${this._loadDiagnostics}>
            ${this._t("general_retry", "Retry")}
          </uui-button>
        </div>
      `;
    }

    if (!this._diagnostics) return nothing;

    const d = this._diagnostics;
    return html`
      <div class="diagnostics-bar">
        <span class="diag-chip diag-chip--neutral">Protocol ${d.protocolVersion || "–"}</span>
        <span class="diag-chip ${d.strictModeAvailable ? "diag-chip--positive" : "diag-chip--warning"}">
          Strict: ${d.strictModeAvailable ? "Available" : "Blocked"}
        </span>
        <span class="diag-chip ${d.requireHttps ? "diag-chip--positive" : "diag-chip--warning"}">
          HTTPS: ${d.requireHttps ? "Required" : "Optional"}
        </span>
        <span class="diag-chip diag-chip--neutral">TLS ${d.minimumTlsVersion || "–"}</span>
        <span class="diag-chip diag-chip--neutral">${d.capabilities.length} Capabilities</span>
        <span class="diag-chip diag-chip--neutral">${d.extensions.length} Extensions</span>
        ${d.publicBaseUrl ? html`<span class="diag-chip diag-chip--neutral diag-chip--url" title="${d.publicBaseUrl}">URL: ${d.publicBaseUrl}</span>` : nothing}
      </div>
    `;
  }

  // ─── Render: Setup Sidebar ────────────────────────────────────────────────

  private _renderSetupSidebar(): unknown {
    const productBadge = this._selectedProducts.length > 0
      ? html`<span class="section-badge">${this._selectedProducts.length}</span>`
      : nothing;

    return html`
      <div class="setup-sidebar">
        ${this._renderAccordion("scenario", "Scenario", nothing, this._renderScenarioSection())}
        ${this._renderAccordion("products", "Products", productBadge, this._renderProductsSection())}
        ${this._renderAccordion("buyer", "Buyer Info", nothing, this._renderBuyerInfoSection())}
        ${this._renderAccordion("advanced", "Advanced", nothing, this._renderAdvancedSection())}
      </div>
    `;
  }

  private _renderAccordion(key: string, title: string, badge: unknown, body: unknown): unknown {
    const isOpen = this._openSections.has(key);
    return html`
      <div class="accordion-section">
        <div class="accordion-header" @click=${() => this._toggleSection(key)}>
          <span class="accordion-chevron ${isOpen ? "accordion-chevron--open" : ""}">›</span>
          <span class="accordion-title">${title}</span>
          ${badge}
        </div>
        ${isOpen ? html`<div class="accordion-body">${body}</div>` : nothing}
      </div>
    `;
  }

  private _renderScenarioSection(): unknown {
    return html`
      ${this._renderStrictBlockedBanner()}
      <div class="field-group">
        <label class="field-label">Execution Mode</label>
        <uui-select
          .label=${"Execution Mode"}
          .options=${this._getExecutionModeOptions()}
          @change=${this._handleModeChange}>
        </uui-select>
        <span class="field-hint">Adapter executes the protocol adapter directly. Strict executes signed HTTP calls.</span>
      </div>
      <div class="field-group">
        <label class="field-label">Template</label>
        <uui-select
          .label=${"Template"}
          .options=${this._getTemplateOptions()}
          @change=${this._handleTemplatePresetChange}>
        </uui-select>
        <span class="field-hint">Guided setup presets for common UCP scenarios.</span>
      </div>
      <div class="field-group">
        <label class="field-label">Agent ID</label>
        <uui-input
          .label=${"Agent ID"}
          .value=${this._agentId}
          @input=${this._handleAgentIdChange}>
        </uui-input>
        <span class="field-hint">Used to build the simulated test agent profile URL.</span>
      </div>
    `;
  }

  private _renderProductsSection(): unknown {
    return html`
      <uui-button
        look="primary"
        color="positive"
        .label=${"Pick Products"}
        @click=${this._openProductPicker}>
        Pick Products
      </uui-button>
      ${this._selectedProducts.length === 0
        ? html`<div class="empty-note">No products selected yet.</div>`
        : html`
          <div class="product-list">
            ${this._selectedProducts.map((product) => html`
              <div class="product-row">
                <div class="product-main">
                  <strong>${product.name}</strong>
                  <span>${product.sku || "No SKU"} · $${formatNumber(product.price, 2)}</span>
                </div>
                <div class="product-qty">
                  <uui-input
                    type="number"
                    min="1"
                    .label=${"Qty"}
                    .value=${String(product.quantity)}
                    @input=${(e: Event) => this._updateProductQuantity(product.key, e)}>
                  </uui-input>
                </div>
                <uui-button
                  look="secondary"
                  color="danger"
                  .label=${"Remove"}
                  @click=${() => this._removeProduct(product.key)}>
                  ×
                </uui-button>
              </div>
            `)}
          </div>
        `}
    `;
  }

  private _renderBuyerInfoSection(): unknown {
    return html`
      <div class="buyer-grid buyer-grid--2col">
        <div class="field-group">
          <label class="field-label">Given Name</label>
          <uui-input .label=${"Given Name"} .value=${this._buyerGivenName} @input=${this._handleBuyerGivenNameChange}></uui-input>
        </div>
        <div class="field-group">
          <label class="field-label">Family Name</label>
          <uui-input .label=${"Family Name"} .value=${this._buyerFamilyName} @input=${this._handleBuyerFamilyNameChange}></uui-input>
        </div>
      </div>
      <div class="buyer-grid buyer-grid--2col">
        <div class="field-group">
          <label class="field-label">Email</label>
          <uui-input type="email" .label=${"Email"} .value=${this._buyerEmail} @input=${this._handleBuyerEmailChange}></uui-input>
        </div>
        <div class="field-group">
          <label class="field-label">Phone</label>
          <uui-input type="tel" .label=${"Phone"} .value=${this._buyerPhone} @input=${this._handleBuyerPhoneChange}></uui-input>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Address Line 1</label>
        <uui-input .label=${"Address Line 1"} .value=${this._buyerAddressLine1} @input=${this._handleBuyerAddressLine1Change}></uui-input>
      </div>
      <div class="field-group">
        <label class="field-label">Address Line 2</label>
        <uui-input .label=${"Address Line 2"} .value=${this._buyerAddressLine2} @input=${this._handleBuyerAddressLine2Change}></uui-input>
      </div>
      <div class="buyer-grid buyer-grid--3col">
        <div class="field-group">
          <label class="field-label">City</label>
          <uui-input .label=${"City"} .value=${this._buyerLocality} @input=${this._handleBuyerLocalityChange}></uui-input>
        </div>
        <div class="field-group">
          <label class="field-label">Region</label>
          <uui-input .label=${"Region"} .value=${this._buyerAdministrativeArea} @input=${this._handleBuyerAdministrativeAreaChange}></uui-input>
        </div>
        <div class="field-group">
          <label class="field-label">Postal Code</label>
          <uui-input .label=${"Postal Code"} .value=${this._buyerPostalCode} @input=${this._handleBuyerPostalCodeChange}></uui-input>
        </div>
      </div>
      <div class="field-group field-group--short">
        <label class="field-label">Country Code</label>
        <uui-input maxlength="2" .label=${"Country Code"} .value=${this._buyerCountryCode} @input=${this._handleBuyerCountryCodeChange}></uui-input>
      </div>
    `;
  }

  private _renderAdvancedSection(): unknown {
    return html`
      <div class="toggle-row">
        <div class="toggle-info">
          <span class="toggle-label">Dry Run</span>
          <span class="field-hint">Returns a preview without creating a real order.</span>
        </div>
        <uui-toggle .label=${"Dry Run"} ?checked=${this._dryRun} @change=${this._handleDryRunChange}></uui-toggle>
      </div>
      <div class="toggle-row ${this._dryRun ? "toggle-row--disabled" : ""}">
        <div class="toggle-info">
          <span class="toggle-label">Confirm Real Order</span>
          <span class="field-hint">Required before completing with dry run disabled.</span>
        </div>
        <uui-toggle
          .label=${"Confirm Real Order"}
          ?disabled=${this._dryRun}
          ?checked=${this._realOrderConfirmed}
          @change=${this._handleRealOrderConfirmedChange}>
        </uui-toggle>
      </div>
      <div class="field-group">
        <label class="field-label">Payment Handler</label>
        ${this._availablePaymentHandlerIds.length > 0
          ? html`<uui-select .label=${"Payment Handler"} .options=${this._getPaymentHandlerOptions()} @change=${this._handlePaymentHandlerIdChange}></uui-select>`
          : html`<uui-input .label=${"Payment Handler"} .value=${this._paymentHandlerId} @input=${this._handlePaymentHandlerIdChange}></uui-input>`}
      </div>
      <div class="field-group">
        <label class="field-label">Discount Codes</label>
        <uui-input
          .label=${"Discount Codes"}
          .value=${this._discountCodesInput}
          @input=${this._handleDiscountCodesChange}
          placeholder="code1, code2">
        </uui-input>
        <span class="field-hint">Comma-separated promotional codes.</span>
      </div>
    `;
  }

  // ─── Render: Flow Panel ───────────────────────────────────────────────────

  private _renderFlowPanel(): unknown {
    return html`
      <div class="flow-panel">
        ${this._renderSessionState()}
        <div class="flow-toolbar">
          <uui-button look="secondary" .label=${"Start New Run"} @click=${this._startNewRun}>
            Start New Run
          </uui-button>
        </div>
        ${this._renderStepTimeline()}
      </div>
    `;
  }

  private _renderSessionState(): unknown {
    const sessionDisplay = this._sessionId ? `${this._sessionId.substring(0, 12)}…` : "–";
    const orderDisplay = this._orderId ? `${this._orderId.substring(0, 12)}…` : "–";
    const statusCss = !this._sessionStatus ? "neutral"
      : this._sessionStatus.includes("ready") ? "positive"
      : this._sessionStatus.includes("cancel") ? "warning"
      : "neutral";

    return html`
      <div class="session-state">
        <div
          class="session-chip ${this._sessionId ? "session-chip--active" : ""}"
          title="${this._sessionId ?? ""}"
          @click=${this._sessionId ? () => void this._copyText(this._sessionId!, "Session ID") : nothing}>
          <span class="session-chip-label">Session</span>
          <span class="session-chip-value">${sessionDisplay}</span>
        </div>
        <div class="session-chip session-chip--status-${statusCss}">
          <span class="session-chip-label">Status</span>
          <span class="session-chip-value">${this._sessionStatus || "–"}</span>
        </div>
        <div
          class="session-chip ${this._orderId ? "session-chip--active" : ""}"
          title="${this._orderId ?? ""}"
          @click=${this._orderId ? () => void this._copyText(this._orderId!, "Order ID") : nothing}>
          <span class="session-chip-label">Order</span>
          <span class="session-chip-value">${orderDisplay}</span>
        </div>
      </div>
    `;
  }

  private _renderStepTimeline(): unknown {
    const completeDisabled = !this._sessionId || (!this._dryRun && !this._realOrderConfirmed);

    const steps: UcpStepDefinition[] = [
      { key: "manifest",         label: "Manifest",         desc: "Fetch the manifest to verify protocol configuration and capabilities",  disabled: false,                               action: () => this._executeManifestStep() },
      { key: "create_session",   label: "Create Session",   desc: "Initialize a checkout session with the selected products and buyer info", disabled: this._selectedProducts.length === 0, action: () => this._executeCreateSessionStep() },
      { key: "get_session",      label: "Get Session",      desc: "Retrieve the current session state and available shipping options",       disabled: !this._sessionId,                    action: () => this._executeGetSessionStep() },
      { key: "update_session",   label: "Update Session",   desc: "Apply a shipping selection and confirm buyer information",                disabled: !this._sessionId,                    action: () => this._executeUpdateSessionStep() },
      { key: "complete_session", label: "Complete Session", desc: "Process payment and finalize the order",                                 disabled: completeDisabled,                    action: () => this._executeCompleteSessionStep() },
      { key: "get_order",        label: "Get Order",        desc: "Retrieve the created order details after successful completion",          disabled: !this._orderId,                      action: () => this._executeGetOrderStep() },
      { key: "cancel_session",   label: "Cancel Session",   desc: "Cancel the current session without placing an order",                    disabled: !this._sessionId,                    action: () => this._executeCancelSessionStep() },
    ];

    return html`
      <div class="step-timeline">
        ${steps.map((step, index) => this._renderStepCard(step, index))}
      </div>
    `;
  }

  private _renderStepCard(step: UcpStepDefinition, index: number): unknown {
    const status = this._getStepStatus(step.key);
    const isExpanded = this._expandedStep === step.key;
    const hasTranscript = this._getStepTranscript(step.key) !== null;
    const isClickable = hasTranscript;

    const stepIcon = status === "running"
      ? html`<uui-loader style="--uui-loader-default-stroke-color:#fff"></uui-loader>`
      : status === "success" ? "✓"
      : status === "error" ? "✕"
      : index + 1;

    return html`
      <div
        class="step-card step-card--${status} ${isClickable ? "step-card--clickable" : ""}"
        @click=${isClickable ? () => this._toggleStep(step.key) : nothing}>
        <div class="step-card-header">
          <div class="step-number step-number--${status}">${stepIcon}</div>
          <div class="step-info">
            <span class="step-name">${step.label}</span>
            <span class="step-desc">${step.desc}</span>
            ${step.key === "update_session" && this._fulfillmentGroups.length > 0
              ? this._renderFulfillmentSelections()
              : nothing}
          </div>
          <div class="step-actions" @click=${(e: Event) => e.stopPropagation()}>
            ${hasTranscript
              ? html`<span class="step-expand-hint">${isExpanded ? "▲" : "▼"}</span>`
              : nothing}
            <uui-button
              look="secondary"
              .label=${step.label}
              ?disabled=${step.disabled || !!this._activeStep}
              @click=${() => void step.action()}>
              ${status === "running" ? "Running…" : "Run"}
            </uui-button>
          </div>
        </div>
        ${isExpanded ? this._renderInlineTranscript(step.key) : nothing}
      </div>
    `;
  }

  private _renderFulfillmentSelections(): unknown {
    if (this._fulfillmentGroups.length === 0) {
      return nothing;
    }

    return html`
      <div class="fulfillment-groups">
        ${this._fulfillmentGroups.map((group) => html`
          <div class="fulfillment-row">
            <span class="fulfillment-name">${group.name}</span>
            <uui-select
              .label=${group.name}
              .options=${this._getFulfillmentGroupOptions(group)}
              @change=${(e: Event) => this._updateFulfillmentGroupSelection(group.id, e)}>
            </uui-select>
          </div>
        `)}
      </div>
    `;
  }

  private _renderInlineTranscript(stepKey: string): unknown {
    const entry = this._getStepTranscript(stepKey);
    if (!entry) {
      return html`<div class="transcript-inline"><div class="empty-note">No data for this step yet.</div></div>`;
    }

    const requestBody = this._formatSnapshotBody(entry.request?.body);
    const responseBody = this._formatSnapshotBody(entry.response?.body);
    const requestHeaderJson = JSON.stringify(entry.request?.headers ?? {}, null, 2);
    const responseHeaderJson = JSON.stringify(entry.response?.headers ?? {}, null, 2);
    const modeLabel = `${entry.modeRequested} → ${entry.modeExecuted}`;

    return html`
      <div class="transcript-inline">
        <div class="transcript-meta">
          <span class="badge ${entry.success ? "positive" : "danger"}">${entry.success ? "Success" : "Failed"}</span>
          <span class="badge neutral">${modeLabel}</span>
          ${entry.fallbackApplied ? html`<span class="badge warning">Fallback</span>` : nothing}
          <span class="badge neutral">HTTP ${entry.response?.statusCode ?? "–"}</span>
        </div>
        ${entry.fallbackReason ? html`<div class="fallback-reason">${entry.fallbackReason}</div>` : nothing}
        <div class="transcript-copy-row">
          <uui-button
            look="secondary"
            .label=${"Copy Request"}
            @click=${() => void this._copyText(`Headers:\n${requestHeaderJson}\n\nBody:\n${requestBody}`, "Request")}>
            Copy Request
          </uui-button>
          <uui-button
            look="secondary"
            .label=${"Copy Response"}
            @click=${() => void this._copyText(`Headers:\n${responseHeaderJson}\n\nBody:\n${responseBody}`, "Response")}>
            Copy Response
          </uui-button>
        </div>
        <div class="transcript-grid">
          <div>
            <div class="transcript-col-header">Request</div>
            <div class="code-block">${requestHeaderJson}</div>
            <div class="code-block">${requestBody}</div>
          </div>
          <div>
            <div class="transcript-col-header">Response</div>
            <div class="code-block">${responseHeaderJson}</div>
            <div class="code-block">${responseBody}</div>
          </div>
        </div>
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
          <strong>${this._t("merchello_ucpFlowTesterStrictBlockedTitle", "Strict mode is blocked.")}</strong>
          <div>${this._diagnostics?.strictModeBlockReason || this._t("merchello_ucpFlowTesterStrictUnavailable", "Strict mode is unavailable in this runtime.")}</div>
        </div>
        <uui-button
          look="primary"
          color="positive"
          .label=${this._t("merchello_ucpFlowTesterSwitchToAdapter", "Switch to adapter mode")}
          @click=${this._switchToAdapterMode}>
          ${this._t("merchello_ucpFlowTesterSwitchToAdapterButton", "Switch to Adapter")}
        </uui-button>
      </div>
    `;
  }

  // ─── Main Render ──────────────────────────────────────────────────────────

  override render() {
    return html`
      ${this._renderDiagnosticsBar()}
      <div class="tester-layout">
        ${this._renderSetupSidebar()}
        ${this._renderFlowPanel()}
      </div>
    `;
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

  static override readonly styles = css`
    :host {
      display: block;
      width: 100%;
    }

    /* ── Diagnostics Bar ── */

    .diagnostics-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-divider);
      border-radius: 8px;
      margin-bottom: var(--uui-size-space-4);
    }

    .diagnostics-bar--error {
      border-color: var(--uui-color-danger-standalone);
      background: color-mix(in srgb, var(--uui-color-danger-standalone) 8%, white);
    }

    .diag-chip {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 500;
      border: 1px solid transparent;
      white-space: nowrap;
    }

    .diag-chip--neutral {
      background: color-mix(in srgb, var(--uui-color-divider) 50%, transparent);
      color: var(--uui-color-text);
      border-color: var(--uui-color-divider);
    }

    .diag-chip--positive {
      background: color-mix(in srgb, var(--uui-color-positive-standalone) 12%, white);
      color: var(--uui-color-positive-standalone);
      border-color: color-mix(in srgb, var(--uui-color-positive-standalone) 40%, transparent);
    }

    .diag-chip--warning {
      background: color-mix(in srgb, var(--uui-color-warning-standalone) 15%, white);
      color: #8a5c00;
      border-color: color-mix(in srgb, var(--uui-color-warning-standalone) 50%, transparent);
    }

    .diag-chip--url {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .loading-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.85rem;
      color: var(--uui-color-text-alt);
    }

    /* ── Two-Column Layout ── */

    .tester-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: var(--uui-size-space-5);
      align-items: start;
    }

    /* ── Setup Sidebar ── */

    .setup-sidebar {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      position: sticky;
      top: var(--uui-size-space-4);
    }

    .accordion-section {
      border: 1px solid var(--uui-color-divider);
      border-radius: 8px;
      overflow: hidden;
      background: var(--uui-color-surface);
    }

    .accordion-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      cursor: pointer;
      user-select: none;
      font-weight: 600;
      font-size: 0.85rem;
    }

    .accordion-header:hover {
      background: color-mix(in srgb, var(--uui-color-focus) 5%, var(--uui-color-surface));
    }

    .accordion-chevron {
      display: inline-block;
      font-size: 1rem;
      color: var(--uui-color-text-alt);
      transition: transform 0.15s ease;
      transform: rotate(0deg);
      width: 16px;
      text-align: center;
    }

    .accordion-chevron--open {
      transform: rotate(90deg);
    }

    .accordion-title {
      flex: 1;
    }

    .accordion-body {
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-divider);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .section-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
      background: var(--uui-color-positive-standalone);
      color: #fff;
    }

    /* ── Field Groups ── */

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-group--short uui-input {
      width: 80px;
    }

    .field-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .field-hint {
      font-size: 0.73rem;
      color: var(--uui-color-text-alt);
      line-height: 1.35;
    }

    .field-group uui-input,
    .field-group uui-select {
      width: 100%;
    }

    /* ── Buyer Grid ── */

    .buyer-grid {
      display: grid;
      gap: var(--uui-size-space-2);
    }

    .buyer-grid--2col {
      grid-template-columns: 1fr 1fr;
    }

    .buyer-grid--3col {
      grid-template-columns: 1fr 1fr 1fr;
    }

    /* ── Toggle Rows ── */

    .toggle-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-2) 0;
      border-bottom: 1px solid var(--uui-color-divider);
    }

    .toggle-row:last-of-type {
      border-bottom: none;
    }

    .toggle-row--disabled {
      opacity: 0.5;
    }

    .toggle-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .toggle-label {
      font-size: 0.85rem;
      font-weight: 600;
    }

    /* ── Products ── */

    .product-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .product-row {
      display: grid;
      grid-template-columns: 1fr 64px auto;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-divider);
      border-radius: 6px;
      background: var(--uui-color-surface);
    }

    .product-main {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .product-main strong {
      font-size: 0.85rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .product-main span {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .product-qty uui-input {
      width: 100%;
    }

    /* ── Warning Banner ── */

    .warning-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
      border-radius: 6px;
      border: 1px solid var(--uui-color-warning-standalone);
      padding: var(--uui-size-space-3);
      background: color-mix(in srgb, var(--uui-color-warning-standalone) 12%, white);
      font-size: 0.85rem;
    }

    .empty-note {
      color: var(--uui-color-text-alt);
      font-size: 0.85rem;
      padding: var(--uui-size-space-2) 0;
    }

    /* ── Flow Panel ── */

    .flow-panel {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .flow-toolbar {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    /* ── Session State ── */

    .session-state {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .session-chip {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border: 1px solid var(--uui-color-divider);
      border-radius: 8px;
      background: var(--uui-color-surface);
      min-width: 130px;
      flex: 1;
    }

    .session-chip--active {
      border-color: var(--uui-color-positive-standalone);
      background: color-mix(in srgb, var(--uui-color-positive-standalone) 6%, white);
      cursor: pointer;
    }

    .session-chip--active:hover {
      background: color-mix(in srgb, var(--uui-color-positive-standalone) 12%, white);
    }

    .session-chip--status-positive {
      border-color: var(--uui-color-positive-standalone);
    }

    .session-chip--status-warning {
      border-color: var(--uui-color-warning-standalone);
    }

    .session-chip-label {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--uui-color-text-alt);
    }

    .session-chip-value {
      font-size: 0.82rem;
      font-weight: 500;
      font-family: var(--uui-font-family-monospace, monospace);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Step Timeline ── */

    .step-timeline {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .step-card {
      border: 1px solid var(--uui-color-divider);
      border-left: 3px solid var(--uui-color-divider);
      border-radius: 8px;
      background: var(--uui-color-surface);
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .step-card--clickable {
      cursor: pointer;
    }

    .step-card--running {
      border-left-color: var(--uui-color-focus, #1a73e8);
      background: color-mix(in srgb, var(--uui-color-focus, #1a73e8) 4%, white);
    }

    .step-card--success {
      border-left-color: var(--uui-color-positive-standalone);
      background: color-mix(in srgb, var(--uui-color-positive-standalone) 4%, white);
    }

    .step-card--success.step-card--clickable:hover {
      background: color-mix(in srgb, var(--uui-color-positive-standalone) 8%, white);
    }

    .step-card--error {
      border-left-color: var(--uui-color-danger-standalone);
      background: color-mix(in srgb, var(--uui-color-danger-standalone) 4%, white);
    }

    .step-card--error.step-card--clickable:hover {
      background: color-mix(in srgb, var(--uui-color-danger-standalone) 8%, white);
    }

    .step-card-header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
    }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.82rem;
      font-weight: 700;
      flex-shrink: 0;
      color: #fff;
      transition: background 0.15s ease;
    }

    .step-number--idle {
      background: var(--uui-color-disabled, #ccc);
      color: var(--uui-color-text-alt);
    }

    .step-number--running {
      background: var(--uui-color-focus, #1a73e8);
      animation: pulse 1.2s ease-in-out infinite;
    }

    .step-number--success {
      background: var(--uui-color-positive-standalone);
    }

    .step-number--error {
      background: var(--uui-color-danger-standalone);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }

    .step-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .step-name {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .step-desc {
      font-size: 0.77rem;
      color: var(--uui-color-text-alt);
      line-height: 1.35;
    }

    .step-actions {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      flex-shrink: 0;
    }

    .step-expand-hint {
      font-size: 0.7rem;
      color: var(--uui-color-text-alt);
    }

    /* ── Fulfillment Groups (inside step card) ── */

    .fulfillment-groups {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-2);
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-divider);
    }

    .fulfillment-row {
      display: grid;
      grid-template-columns: 1fr minmax(180px, 260px);
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .fulfillment-name {
      font-size: 0.82rem;
      font-weight: 500;
    }

    .fulfillment-row uui-select {
      width: 100%;
    }

    /* ── Inline Transcript ── */

    .transcript-inline {
      border-top: 1px solid var(--uui-color-divider);
      padding: var(--uui-size-space-3);
    }

    .transcript-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .transcript-copy-row {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
      margin-bottom: var(--uui-size-space-2);
    }

    .transcript-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-3);
    }

    .transcript-col-header {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-1);
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

    .fallback-reason {
      margin-top: var(--uui-size-space-1);
      margin-bottom: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
      font-size: 0.82rem;
    }

    /* ── Badges ── */

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.72rem;
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

    .value {
      display: block;
      font-size: 0.95rem;
      word-break: break-word;
    }

    /* ── Responsive ── */

    @media (max-width: 960px) {
      .tester-layout {
        grid-template-columns: 1fr;
      }

      .setup-sidebar {
        position: static;
      }

      .transcript-grid {
        grid-template-columns: 1fr;
      }

      .buyer-grid--2col,
      .buyer-grid--3col {
        grid-template-columns: 1fr;
      }

      .fulfillment-row {
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
