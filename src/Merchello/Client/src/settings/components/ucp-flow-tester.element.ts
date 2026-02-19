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

  private _renderReadOnlyProperty(labelKey: string, labelFallback: string, value: string): unknown {
    return html`
      <umb-property-layout orientation="vertical" .label=${this._t(labelKey, labelFallback)}>
        <span slot="editor" class="value">${value}</span>
      </umb-property-layout>
    `;
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
  private _renderDiagnosticsPanel(): unknown {
    if (this._isLoadingDiagnostics) {
      return html`<div class="loading-row"><uui-loader></uui-loader><span>${this._t("merchello_ucpFlowTesterLoadingDiagnostics", "Loading diagnostics...")}</span></div>`;
    }

    if (this._diagnosticsError) {
      return html`
        <div class="error-banner">
          <span>${this._diagnosticsError}</span>
          <uui-button
            .label=${this._t("merchello_ucpFlowTesterRetryDiagnostics", "Retry diagnostics")}
            look="secondary"
            @click=${this._loadDiagnostics}>
            ${this._t("general_retry", "Retry")}
          </uui-button>
        </div>
      `;
    }

    if (!this._diagnostics) {
      return nothing;
    }

    return html`
      <div class="diagnostics-grid">
        ${this._renderReadOnlyProperty(
          "merchello_ucpFlowTesterProtocolVersion",
          "Protocol Version",
          this._diagnostics.protocolVersion || "-"
        )}
        ${this._renderReadOnlyProperty(
          "merchello_ucpFlowTesterStrictMode",
          "Strict Mode",
          this._diagnostics.strictModeAvailable
            ? this._t("merchello_ucpFlowTesterStatusAvailable", "Available")
            : this._t("merchello_ucpFlowTesterStatusBlocked", "Blocked")
        )}
        ${this._renderReadOnlyProperty(
          "merchello_ucpFlowTesterPublicBaseUrl",
          "Public Base URL",
          this._diagnostics.publicBaseUrl || "-"
        )}
        ${this._renderReadOnlyProperty(
          "merchello_ucpFlowTesterEffectiveBaseUrl",
          "Effective Base URL",
          this._diagnostics.effectiveBaseUrl || "-"
        )}
        ${this._renderReadOnlyProperty(
          "merchello_ucpFlowTesterRequireHttps",
          "Require HTTPS",
          this._diagnostics.requireHttps ? this._t("general_yes", "Yes") : this._t("general_no", "No")
        )}
        ${this._renderReadOnlyProperty(
          "merchello_ucpFlowTesterMinimumTls",
          "Minimum TLS",
          this._diagnostics.minimumTlsVersion || "-"
        )}
        ${this._renderReadOnlyProperty(
          "merchello_ucpFlowTesterAgentProfileUrl",
          "Agent Profile URL",
          this._diagnostics.simulatedAgentProfileUrl || "-"
        )}
        ${this._renderReadOnlyProperty(
          "merchello_ucpFlowTesterFallbackMode",
          "Fallback Mode",
          this._diagnostics.strictFallbackMode || "-"
        )}
      </div>

      <div class="diagnostics-meta-grid">
        <umb-property-layout orientation="vertical" .label=${this._t("merchello_ucpFlowTesterCapabilities", "Capabilities")}>
          <div slot="editor" class="token-row">
            ${this._diagnostics.capabilities.length === 0
              ? html`<span class="value">${this._t("merchello_ucpFlowTesterNone", "None")}</span>`
              : this._diagnostics.capabilities.map((capability) => html`<uui-tag>${capability}</uui-tag>`)}
          </div>
        </umb-property-layout>

        <umb-property-layout orientation="vertical" .label=${this._t("merchello_ucpFlowTesterExtensions", "Extensions")}>
          <div slot="editor" class="token-row">
            ${this._diagnostics.extensions.length === 0
              ? html`<span class="value">${this._t("merchello_ucpFlowTesterNone", "None")}</span>`
              : this._diagnostics.extensions.map((extension) => html`<uui-tag>${extension}</uui-tag>`)}
          </div>
        </umb-property-layout>
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
          .label=${this._t("merchello_ucpFlowTesterSwitchToAdapter", "Switch to adapter mode")}
          look="primary"
          color="positive"
          @click=${this._switchToAdapterMode}>
          ${this._t("merchello_ucpFlowTesterSwitchToAdapterButton", "Switch to Adapter")}
        </uui-button>
      </div>
    `;
  }

  private _getExecutionModeOptions(): Array<{ name: string; value: string; selected: boolean }> {
    return [
      {
        name: this._t("merchello_ucpFlowTesterAdapterMode", "Adapter Mode"),
        value: "adapter",
        selected: this._modeRequested === "adapter",
      },
      {
        name: this._t("merchello_ucpFlowTesterStrictHttpMode", "Strict HTTP Mode"),
        value: "strict",
        selected: this._modeRequested === "strict",
      },
    ];
  }

  private _getTemplateOptions(): Array<{ name: string; value: string; selected: boolean }> {
    return [
      {
        name: this._t("merchello_ucpFlowTesterTemplatePhysical", "Physical Product"),
        value: "physical",
        selected: this._templatePreset === "physical",
      },
      {
        name: this._t("merchello_ucpFlowTesterTemplateDigital", "Digital Product"),
        value: "digital",
        selected: this._templatePreset === "digital",
      },
      {
        name: this._t("merchello_ucpFlowTesterTemplateIncompleteBuyer", "Incomplete Buyer"),
        value: "incomplete",
        selected: this._templatePreset === "incomplete",
      },
      {
        name: this._t("merchello_ucpFlowTesterTemplateMultiItem", "Multi-item"),
        value: "multi-item",
        selected: this._templatePreset === "multi-item",
      },
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
      {
        name: this._t("merchello_ucpFlowTesterSelectOption", "Select option"),
        value: "",
        selected: !this._selectedFulfillmentOptionIds[group.id],
      },
      ...group.options.map((option) => ({
        name: `${option.title}${option.amount != null ? ` (${option.currency || ""} ${option.amount})` : ""}`,
        value: option.id,
        selected: this._selectedFulfillmentOptionIds[group.id] === option.id,
      })),
    ];
  }

  private _renderSetupPanel(): unknown {
    return html`
      ${this._renderStrictBlockedBanner()}

      <div class="setup-grid">
        <umb-property-layout
          .label=${this._t("merchello_ucpFlowTesterExecutionModeLabel", "Execution Mode")}
          .description=${this._t("merchello_ucpFlowTesterExecutionModeDescription", "Adapter executes the protocol adapter directly. Strict executes signed HTTP calls.")}>
          <uui-select
            slot="editor"
            .label=${this._t("merchello_ucpFlowTesterExecutionModeLabel", "Execution Mode")}
            .options=${this._getExecutionModeOptions()}
            @change=${this._handleModeChange}>
          </uui-select>
        </umb-property-layout>

        <umb-property-layout
          .label=${this._t("merchello_ucpFlowTesterTemplateLabel", "Template")}
          .description=${this._t("merchello_ucpFlowTesterTemplateDescription", "Guided setup presets for common UCP scenarios.")}>
          <uui-select
            slot="editor"
            .label=${this._t("merchello_ucpFlowTesterTemplateLabel", "Template")}
            .options=${this._getTemplateOptions()}
            @change=${this._handleTemplatePresetChange}>
          </uui-select>
        </umb-property-layout>

        <umb-property-layout
          .label=${this._t("merchello_ucpFlowTesterAgentIdLabel", "Agent ID")}
          .description=${this._t("merchello_ucpFlowTesterAgentIdDescription", "Used to build the simulated test agent profile URL.")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterAgentIdLabel", "Agent ID")} .value=${this._agentId} @input=${this._handleAgentIdChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout
          .label=${this._t("merchello_ucpFlowTesterDryRunLabel", "Dry Run Complete")}
          .description=${this._t("merchello_ucpFlowTesterDryRunDescription", "When enabled, complete returns a preview and does not create an order.")}>
          <uui-toggle slot="editor" .label=${this._t("merchello_ucpFlowTesterDryRunLabel", "Dry Run Complete")} ?checked=${this._dryRun} @change=${this._handleDryRunChange}></uui-toggle>
        </umb-property-layout>

        <umb-property-layout
          .label=${this._t("merchello_ucpFlowTesterRealOrderConfirmationLabel", "Real Order Confirmation")}
          .description=${this._t("merchello_ucpFlowTesterRealOrderConfirmationDescription", "Required before running complete with dry-run disabled.")}>
          <uui-toggle
            slot="editor"
            .label=${this._t("merchello_ucpFlowTesterRealOrderConfirmationLabel", "Real Order Confirmation")}
            ?disabled=${this._dryRun}
            ?checked=${this._realOrderConfirmed}
            @change=${this._handleRealOrderConfirmedChange}>
          </uui-toggle>
        </umb-property-layout>

        <umb-property-layout
          .label=${this._t("merchello_ucpFlowTesterPaymentHandlerLabel", "Payment Handler ID")}
          .description=${this._t("merchello_ucpFlowTesterPaymentHandlerDescription", "Used for complete session requests in real mode.")}>
          ${this._availablePaymentHandlerIds.length > 0
            ? html`
                <uui-select
                  slot="editor"
                  .label=${this._t("merchello_ucpFlowTesterPaymentHandlerLabel", "Payment Handler ID")}
                  .options=${this._getPaymentHandlerOptions()}
                  @change=${this._handlePaymentHandlerIdChange}>
                </uui-select>
              `
            : html`
                <uui-input
                  slot="editor"
                  .label=${this._t("merchello_ucpFlowTesterPaymentHandlerLabel", "Payment Handler ID")}
                  .value=${this._paymentHandlerId}
                  @input=${this._handlePaymentHandlerIdChange}>
                </uui-input>
              `}
        </umb-property-layout>
      </div>

      <div class="section-toolbar">
        <uui-button
          .label=${this._t("merchello_ucpFlowTesterAddProducts", "Add products")}
          look="primary"
          color="positive"
          @click=${this._openProductPicker}>
          ${this._t("merchello_ucpFlowTesterPickProducts", "Pick Products")}
        </uui-button>
        <uui-button
          .label=${this._t("merchello_ucpFlowTesterStartNewRun", "Start a new run")}
          look="secondary"
          @click=${this._startNewRun}>
          ${this._t("merchello_ucpFlowTesterStartNewRunButton", "Start New Run")}
        </uui-button>
      </div>

      ${this._renderSelectedProducts()}
      ${this._renderBuyerAndDiscountSetup()}
      ${this._renderFulfillmentSelections()}
    `;
  }

  private _renderSelectedProducts(): unknown {
    if (this._selectedProducts.length === 0) {
      return html`<div class="empty-note">${this._t("merchello_ucpFlowTesterNoProductsSelected", "No products selected yet.")}</div>`;
    }

    return html`
      <div class="product-list">
        ${this._selectedProducts.map((product) => html`
          <div class="product-row">
            <div class="product-main">
              <strong>${product.name}</strong>
              <span>${product.sku || this._t("merchello_ucpFlowTesterNoSku", "No SKU")} · $${formatNumber(product.price, 2)}</span>
            </div>
            <uui-input
              class="qty-input"
              type="number"
              min="1"
              .label=${this._t("merchello_ucpFlowTesterQuantity", "Quantity")}
              .value=${String(product.quantity)}
              @input=${(event: Event) => this._updateProductQuantity(product.key, event)}>
            </uui-input>
            <uui-button
              look="secondary"
              color="danger"
              .label=${this._t("merchello_ucpFlowTesterRemoveProduct", "Remove product")}
              @click=${() => this._removeProduct(product.key)}>
              ${this._t("general_remove", "Remove")}
            </uui-button>
          </div>
        `)}
      </div>
    `;
  }

  private _renderBuyerAndDiscountSetup(): unknown {
    return html`
      <div class="setup-grid">
        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterBuyerEmail", "Buyer Email")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterBuyerEmail", "Buyer Email")} .value=${this._buyerEmail} @input=${this._handleBuyerEmailChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterBuyerPhone", "Buyer Phone")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterBuyerPhone", "Buyer Phone")} .value=${this._buyerPhone} @input=${this._handleBuyerPhoneChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterGivenName", "Given Name")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterGivenName", "Given Name")} .value=${this._buyerGivenName} @input=${this._handleBuyerGivenNameChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterFamilyName", "Family Name")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterFamilyName", "Family Name")} .value=${this._buyerFamilyName} @input=${this._handleBuyerFamilyNameChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterAddressLine1", "Address Line 1")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterAddressLine1", "Address Line 1")} .value=${this._buyerAddressLine1} @input=${this._handleBuyerAddressLine1Change}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterAddressLine2", "Address Line 2")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterAddressLine2", "Address Line 2")} .value=${this._buyerAddressLine2} @input=${this._handleBuyerAddressLine2Change}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterTownCity", "Town/City")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterTownCity", "Town/City")} .value=${this._buyerLocality} @input=${this._handleBuyerLocalityChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterRegion", "Region")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterRegion", "Region")} .value=${this._buyerAdministrativeArea} @input=${this._handleBuyerAdministrativeAreaChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterPostalCode", "Postal Code")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterPostalCode", "Postal Code")} .value=${this._buyerPostalCode} @input=${this._handleBuyerPostalCodeChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout .label=${this._t("merchello_ucpFlowTesterCountryCode", "Country Code")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterCountryCode", "Country Code")} maxlength="2" .value=${this._buyerCountryCode} @input=${this._handleBuyerCountryCodeChange}></uui-input>
        </umb-property-layout>

        <umb-property-layout
          .label=${this._t("merchello_ucpFlowTesterDiscountCodes", "Discount Codes")}
          .description=${this._t("merchello_ucpFlowTesterDiscountCodesDescription", "Comma-separated promotional codes.")}>
          <uui-input slot="editor" .label=${this._t("merchello_ucpFlowTesterDiscountCodes", "Discount Codes")} .value=${this._discountCodesInput} @input=${this._handleDiscountCodesChange}></uui-input>
        </umb-property-layout>
      </div>
    `;
  }

  private _renderFulfillmentSelections(): unknown {
    if (this._fulfillmentGroups.length === 0) {
      return html`<div class="empty-note">${this._t("merchello_ucpFlowTesterNoFulfillmentGroups", "No fulfillment groups available yet. Run create/get/update first.")}</div>`;
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
              .label=${this._t("merchello_ucpFlowTesterFulfillmentOption", "Fulfillment option")}
              .options=${this._getFulfillmentGroupOptions(group)}
              @change=${(event: Event) => this._updateFulfillmentGroupSelection(group.id, event)}>
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
        ${this._renderStep(this._t("merchello_ucpFlowTesterStepManifest", "Manifest"), "manifest", this._executeManifestStep, false)}
        ${this._renderStep(this._t("merchello_ucpFlowTesterStepCreateSession", "Create Session"), "create_session", this._executeCreateSessionStep, this._selectedProducts.length === 0)}
        ${this._renderStep(this._t("merchello_ucpFlowTesterStepGetSession", "Get Session"), "get_session", this._executeGetSessionStep, !sessionReady)}
        ${this._renderStep(this._t("merchello_ucpFlowTesterStepUpdateSession", "Update Session"), "update_session", this._executeUpdateSessionStep, !sessionReady)}
        ${this._renderStep(this._t("merchello_ucpFlowTesterStepCompleteSession", "Complete Session"), "complete_session", this._executeCompleteSessionStep, completeDisabled)}
        ${this._renderStep(this._t("merchello_ucpFlowTesterStepGetOrder", "Get Order"), "get_order", this._executeGetOrderStep, !orderReady)}
        ${this._renderStep(this._t("merchello_ucpFlowTesterStepCancelSession", "Cancel Session"), "cancel_session", this._executeCancelSessionStep, !sessionReady)}
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
          .label=${label}
          ?disabled=${disabled || !!this._activeStep}
          @click=${action}>
          ${isRunning ? this._t("merchello_ucpFlowTesterRunning", "Running...") : label}
        </uui-button>
      </div>
    `;
  }

  private _renderRunState(): unknown {
    return html`
      <div class="runtime-state">
        ${this._renderReadOnlyProperty("merchello_ucpFlowTesterSessionId", "Session ID", this._sessionId || "-")}
        ${this._renderReadOnlyProperty("merchello_ucpFlowTesterSessionStatus", "Session Status", this._sessionStatus || "-")}
        ${this._renderReadOnlyProperty("merchello_ucpFlowTesterOrderId", "Order ID", this._orderId || "-")}
      </div>
    `;
  }

  private _renderTranscriptPanel(): unknown {
    if (this._transcripts.length === 0) {
      return html`<div class="empty-note">${this._t("merchello_ucpFlowTesterNoTranscripts", "Run wizard steps to capture request/response transcripts.")}</div>`;
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
                <span class=${entry.success ? "badge positive" : "badge danger"}>${entry.success ? this._t("general_success", "Success") : this._t("general_failed", "Failed")}</span>
                <span class="badge neutral">${modeLabel}</span>
                ${entry.fallbackApplied ? html`<span class="badge warning">${this._t("merchello_ucpFlowTesterFallback", "Fallback")}</span>` : nothing}
                <span class="badge neutral">${this._t("merchello_ucpFlowTesterHttpPrefix", "HTTP")} ${entry.response?.statusCode ?? "-"}</span>
              </summary>

              ${entry.fallbackReason ? html`<div class="fallback-reason">${entry.fallbackReason}</div>` : nothing}

              <div class="transcript-actions">
                <uui-button
                  look="secondary"
                  .label=${this._t("merchello_ucpFlowTesterCopyRequest", "Copy Request")}
                  @click=${() => this._copyText(`Headers:\n${requestHeaderJson}\n\nBody:\n${requestBody}`, this._t("merchello_ucpFlowTesterRequest", "Request"))}>
                  ${this._t("merchello_ucpFlowTesterCopyRequest", "Copy Request")}
                </uui-button>
                <uui-button
                  look="secondary"
                  .label=${this._t("merchello_ucpFlowTesterCopyResponse", "Copy Response")}
                  @click=${() => this._copyText(`Headers:\n${responseHeaderJson}\n\nBody:\n${responseBody}`, this._t("merchello_ucpFlowTesterResponse", "Response"))}>
                  ${this._t("merchello_ucpFlowTesterCopyResponse", "Copy Response")}
                </uui-button>
              </div>

              <div class="transcript-grid">
                <div>
                  <h5>${this._t("merchello_ucpFlowTesterRequest", "Request")}</h5>
                  <div class="code-block">${requestHeaderJson}</div>
                  <div class="code-block">${requestBody}</div>
                </div>
                <div>
                  <h5>${this._t("merchello_ucpFlowTesterResponse", "Response")}</h5>
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
      <uui-box .headline=${this._t("merchello_ucpFlowTesterRuntimeDiagnostics", "Runtime Diagnostics")}>
        ${this._renderDiagnosticsPanel()}
      </uui-box>

      <uui-box .headline=${this._t("merchello_ucpFlowTesterRunSetup", "Run Setup")}>
        ${this._renderSetupPanel()}
      </uui-box>

      <uui-box .headline=${this._t("merchello_ucpFlowTesterWizardSteps", "Wizard Steps")}>
        ${this._renderRunState()}
        ${this._renderWizardSteps()}
      </uui-box>

      <uui-box .headline=${this._t("merchello_ucpFlowTesterStepTranscript", "Step Transcript")}>
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

    .diagnostics-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-2);
    }

    .setup-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: var(--uui-size-space-3);
    }

    .setup-grid uui-input,
    .setup-grid uui-select,
    .setup-grid uui-toggle {
      width: 100%;
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

    .group-row uui-select {
      width: 100%;
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
