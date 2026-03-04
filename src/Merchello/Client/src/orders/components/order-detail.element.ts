import { LitElement, html, css, nothing, unsafeHTML } from "@umbraco-cms/backoffice/external/lit";
import type { TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import type { UmbRoute, UmbRouterSlotChangeEvent, UmbRouterSlotInitEvent } from "@umbraco-cms/backoffice/router";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { UMB_CURRENT_USER_CONTEXT, type UmbCurrentUserModel } from "@umbraco-cms/backoffice/current-user";
import type { OrderDetailDto, AddressDto, FulfillmentOrderDto, InvoiceNoteDto, LineItemDto } from "@orders/types/order.types.js";
import type { MerchelloOrdersWorkspaceContext } from "@orders/contexts/orders-workspace.context.js";
import { MERCHELLO_FULFILLMENT_MODAL } from "@orders/modals/fulfillment-modal.token.js";
import { MERCHELLO_EDIT_ORDER_MODAL } from "@orders/modals/edit-order-modal.token.js";
import { MERCHELLO_CUSTOMER_ORDERS_MODAL } from "@orders/modals/customer-orders-modal.token.js";
import { MERCHELLO_CANCEL_INVOICE_MODAL } from "@orders/modals/cancel-invoice-modal.token.js";
import { MERCHELLO_CUSTOMER_EDIT_MODAL } from "@customers/modals/customer-edit-modal.token.js";
import { formatCurrency, formatDateTime } from "@shared/utils/formatting.js";
import { MerchelloApi, type CountryDto } from "@api/merchello-api.js";
import { getOrdersListHref } from "@shared/utils/navigation.js";

// Import the shipments view component
import "@orders/components/shipments-view.element.js";

// Import the payment panel component
import "@orders/components/payment-panel.element.js";

// Import the payment link panel component
import "@orders/components/payment-link-panel.element.js";

// Import shared components
import "@shared/components/line-item-identity.element.js";

@customElement("merchello-order-detail")
export class MerchelloOrderDetailElement extends UmbElementMixin(LitElement) {
  @state() private _order: OrderDetailDto | null = null;
  @state() private _isLoading = true;

  // Tab routing state
  @state() private _routes: UmbRoute[] = [];
  @state() private _routerPath?: string;
  @state() private _activePath = "";
  @state() private _newNoteText: string = "";
  @state() private _isVisibleToCustomer: boolean = false;
  @state() private _isPostingNote: boolean = false;
  @state() private _noteError: string | null = null;
  @state() private _currentUser: UmbCurrentUserModel | undefined;

  // Inline editing state
  @state() private _editingSection: 'contact' | 'shipping' | 'billing' | null = null;
  @state() private _editFormData: Partial<AddressDto> = {};
  @state() private _isSavingAddress: boolean = false;
  @state() private _validationErrors: Record<string, string> = {};
  @state() private _countries: CountryDto[] = [];

  // Purchase order editing state
  @state() private _isEditingPurchaseOrder: boolean = false;
  @state() private _purchaseOrderValue: string = "";
  @state() private _isSavingPurchaseOrder: boolean = false;

  #workspaceContext?: MerchelloOrdersWorkspaceContext;
  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloOrdersWorkspaceContext;
      if (this.#workspaceContext) {
        this.observe(this.#workspaceContext.order, (order) => {
          this._order = order ?? null;
          this._isLoading = !order;
        }, '_order');
      }
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (context) => {
      this.observe(context?.currentUser, (currentUser) => {
        this._currentUser = currentUser;
      }, '_currentUser');
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._createRoutes();
    this._loadCountries();
  }

  private _createRoutes(): void {
    const stubComponent = (): HTMLElement => document.createElement("div");
    this._routes = [
      { path: "tab/details", component: stubComponent },
      { path: "tab/shipments", component: stubComponent },
      { path: "tab/payments", component: stubComponent },
      { path: "", redirectTo: "tab/details" },
      { path: "**", redirectTo: "tab/details" },
    ];
  }

  private _getActiveTab(): "details" | "shipments" | "payments" {
    if (this._activePath.includes("tab/shipments")) return "shipments";
    if (this._activePath.includes("tab/payments")) return "payments";
    return "details";
  }

  private _onRouterInit(event: UmbRouterSlotInitEvent): void {
    this._routerPath = event.target.absoluteRouterPath;
  }

  private _onRouterChange(event: UmbRouterSlotChangeEvent): void {
    this._activePath = event.target.localActiveViewPath || "";
  }

  private _getTabHref(tabName: "details" | "shipments" | "payments"): string | undefined {
    if (!this._routerPath) return undefined;
    return `${this._routerPath}/tab/${tabName}`;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadCountries(): Promise<void> {
    const { data } = await MerchelloApi.getCountries();
    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;
    if (data) {
      this._countries = data;
    }
  }

  private _getGravatarUrl(email: string | undefined, size: number = 40): string | null {
    if (!email) return null;
    // Simple hash function for Gravatar (not cryptographically secure, just for avatar)
    const hash = this._simpleHash(email.toLowerCase().trim());
    return `https://www.gravatar.com/avatar/${hash}?d=mp&s=${size}`;
  }

  private _simpleHash(str: string): string {
    // Simple hash using cyrb53 algorithm - sufficient for Gravatar
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return hash.toString(16).padStart(32, '0');
  }

  private async _openFulfillmentModal(): Promise<void> {
    if (!this._order || !this.#modalManager) return;

    const orderId = this._order.id;
    const hasOutstandingBalance = this._order.balanceDue > 0;
    const modal = this.#modalManager.open(this, MERCHELLO_FULFILLMENT_MODAL, {
      data: {
        invoiceId: orderId,
        hasOutstandingBalance,
        paymentStatusDisplay: this._order.paymentStatusDisplay,
        balanceDue: this._order.balanceDue,
        currencyCode: this._order.currencyCode,
        currencySymbol: this._order.currencySymbol,
      },
    });

    // Wait for modal to close (submit or reject)
    await modal.onSubmit().catch(() => undefined);

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    // Always refresh the order data when modal closes to ensure status is up to date
    this.#workspaceContext?.load(orderId);
  }

  private async _releaseSupplierDirectOrder(fulfillmentOrder: FulfillmentOrderDto): Promise<void> {
    if (!this._order || !this.#modalManager) return;

    const confirmModal = this.#modalManager.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Release to Supplier",
        content:
          "This will submit this order to Supplier Direct immediately. If no shipment exists yet, a Preparing shipment will be created automatically.",
        confirmLabel: "Release",
      },
    });

    try {
      await confirmModal.onSubmit();
    } catch {
      return;
    }

    const { data, error } = await MerchelloApi.releaseOrderFulfillment(fulfillmentOrder.id);

    if (!this.#isConnected) return;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Release failed",
          message: error.message,
        },
      });
      return;
    }

    const message = data?.message?.trim() || "Order released to supplier.";
    this.#notificationContext?.peek(data?.alreadyReleased ? "warning" : "positive", {
      data: {
        headline: data?.alreadyReleased ? "Already Released" : "Released to Supplier",
        message,
      },
    });

    this.#workspaceContext?.load(this._order.id);
  }

  private async _openEditOrderModal(): Promise<void> {
    if (!this._order || !this.#modalManager) return;

    const orderId = this._order.id;
    const modal = this.#modalManager.open(this, MERCHELLO_EDIT_ORDER_MODAL, {
      data: { invoiceId: orderId },
    });

    // Wait for modal to close (submit or reject)
    await modal.onSubmit().catch(() => undefined);

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    // Refresh the order data when modal closes
    this.#workspaceContext?.load(orderId);
  }

  private async _openCancelInvoiceModal(): Promise<void> {
    if (!this._order || !this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_CANCEL_INVOICE_MODAL, {
      data: {
        invoiceId: this._order.id,
        invoiceNumber: this._order.invoiceNumber,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    if (result?.cancelled) {
      // Show success notification
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Invoice Cancelled",
          message: result.cancelledOrderCount
            ? `${result.cancelledOrderCount} order(s) cancelled and stock released.`
            : "Invoice has been cancelled.",
        },
      });

      // Refresh the order data
      this.#workspaceContext?.load(this._order.id);
    }
  }

  private async _openCustomerOrdersModal(): Promise<void> {
    if (!this._order || !this.#modalManager) return;

    const email = this._order.billingAddress?.email;
    if (!email) return;

    this.#modalManager.open(this, MERCHELLO_CUSTOMER_ORDERS_MODAL, {
      data: {
        email,
        customerName: this._order.billingAddress?.name || "Customer",
      },
    });
  }

  private async _openCustomerEditModal(): Promise<void> {
    if (!this._order?.customerId || !this.#modalManager) return;

    const { data: customer, error } = await MerchelloApi.getCustomer(this._order.customerId);
    if (error || !customer) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error", message: "Could not load customer details" }
      });
      return;
    }

    const modal = this.#modalManager.open(this, MERCHELLO_CUSTOMER_EDIT_MODAL, {
      data: { customer },
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (result?.isUpdated) {
      this.#notificationContext?.peek("positive", {
        data: { headline: "Customer updated", message: "Customer details have been saved" }
      });
    }
  }

  private _formatAddress(address: AddressDto | null): string[] {
    if (!address) return ["No address"];
    const lines: string[] = [];
    if (address.name) lines.push(address.name);
    if (address.company) lines.push(address.company);
    if (address.addressOne) lines.push(address.addressOne);
    if (address.addressTwo) lines.push(address.addressTwo);
    const cityState = [address.townCity, address.countyState].filter(Boolean).join(", ");
    if (cityState) lines.push(cityState);
    if (address.postalCode) lines.push(address.postalCode);
    if (address.country) lines.push(address.country);
    if (address.phone) lines.push(address.phone);
    return lines;
  }

  private _areAddressesEquivalent(addressA: AddressDto | null, addressB: AddressDto | null): boolean {
    if (!addressA || !addressB) return false;
    const fields: Array<keyof AddressDto> = [
      "name",
      "company",
      "addressOne",
      "addressTwo",
      "townCity",
      "countyState",
      "postalCode",
      "countryCode",
      "country",
      "phone",
      "email",
    ];

    return fields.every((field) => (addressA[field] ?? "") === (addressB[field] ?? ""));
  }

  private _renderMarkdown(text: string): unknown {
    marked.setOptions({ breaks: true, gfm: true });
    const parsed = marked.parse(text) as string;
    const sanitized = DOMPurify.sanitize(parsed);
    return unsafeHTML(sanitized);
  }

  private _getGoogleMapsUrl(address: AddressDto | null): string {
    if (!address) return '';
    const parts = [address.townCity, address.postalCode, address.country].filter(Boolean);
    if (parts.length === 0) return '';
    const query = encodeURIComponent(parts.join(', '));
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  private _startEditing(section: 'contact' | 'shipping' | 'billing'): void {
    if (!this._order) return;

    if (section === 'contact') {
      this._editFormData = { email: this._order.billingAddress?.email || '' };
    } else if (section === 'shipping') {
      this._editFormData = this._order.shippingAddress ? { ...this._order.shippingAddress } : {};
    } else if (section === 'billing') {
      this._editFormData = this._order.billingAddress ? { ...this._order.billingAddress } : {};
    }
    this._editingSection = section;
    this._validationErrors = {};
  }

  private _cancelEditing(): void {
    this._editingSection = null;
    this._editFormData = {};
    this._validationErrors = {};
  }

  private _validateEmail(email: string | null | undefined): boolean {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private _validateAddress(): boolean {
    const errors: Record<string, string> = {};
    const data = this._editFormData;

    if (this._editingSection === 'contact') {
      if (data.email && !this._validateEmail(data.email)) {
        errors.email = 'Please enter a valid email address';
      }
    } else {
      // Address validation for shipping/billing
      if (!data.name?.trim()) {
        errors.name = 'Name is required';
      }
      if (!data.addressOne?.trim()) {
        errors.addressOne = 'Address is required';
      }
      if (!data.townCity?.trim()) {
        errors.townCity = 'Town/City is required';
      }
      if (!data.postalCode?.trim()) {
        errors.postalCode = 'Postal code is required';
      }
      if (!data.countryCode) {
        errors.countryCode = 'Country is required';
      }
    }

    this._validationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _saveEditing(): Promise<void> {
    if (!this._order || !this._editingSection) return;

    if (!this._validateAddress()) {
      return;
    }

    this._isSavingAddress = true;

    let result: { data?: AddressDto; error?: Error };

    if (this._editingSection === 'contact') {
      // Update only email on billing address
      const updatedAddress: AddressDto = {
        ...this._order.billingAddress,
        email: this._editFormData.email || null,
      } as AddressDto;
      result = await MerchelloApi.updateBillingAddress(this._order.id, updatedAddress);
    } else if (this._editingSection === 'shipping') {
      // Merge form data with existing address to ensure complete data is sent
      const completeAddress: AddressDto = {
        ...this._order.shippingAddress,
        ...this._editFormData
      } as AddressDto;
      result = await MerchelloApi.updateShippingAddress(this._order.id, completeAddress);
    } else {
      // Merge form data with existing billing address
      const completeAddress: AddressDto = {
        ...this._order.billingAddress,
        ...this._editFormData
      } as AddressDto;
      result = await MerchelloApi.updateBillingAddress(this._order.id, completeAddress);
    }

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    this._isSavingAddress = false;

    if (result.error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to save", message: result.error.message || "Could not save address changes" }
      });
      return;
    }

    // Show success notification
    this.#notificationContext?.peek("positive", {
      data: { headline: "Address updated", message: "Changes have been saved successfully" }
    });

    // Reload order data and close edit mode
    this._editingSection = null;
    this._editFormData = {};
    this._validationErrors = {};
    this.#workspaceContext?.load(this._order.id);
  }

  private _startEditingPurchaseOrder(): void {
    if (!this._order) return;
    this._purchaseOrderValue = this._order.purchaseOrder || "";
    this._isEditingPurchaseOrder = true;
  }

  private _cancelEditingPurchaseOrder(): void {
    this._isEditingPurchaseOrder = false;
    this._purchaseOrderValue = "";
  }

  private async _savePurchaseOrder(): Promise<void> {
    if (!this._order) return;

    this._isSavingPurchaseOrder = true;

    const { error } = await MerchelloApi.updatePurchaseOrder(
      this._order.id,
      this._purchaseOrderValue.trim() || null
    );

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    this._isSavingPurchaseOrder = false;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to save", message: error.message || "Could not save purchase order" }
      });
      return;
    }

    // Show success notification
    this.#notificationContext?.peek("positive", {
      data: { headline: "Purchase order updated", message: "Changes have been saved successfully" }
    });

    // Reload order data and close edit mode
    this._isEditingPurchaseOrder = false;
    this._purchaseOrderValue = "";
    this.#workspaceContext?.load(this._order.id);
  }

  private _updateFormField(field: keyof AddressDto, value: string): void {
    this._editFormData = { ...this._editFormData, [field]: value || null };
    // Clear validation error for this field when user types
    if (this._validationErrors[field]) {
      const { [field]: _, ...rest } = this._validationErrors;
      this._validationErrors = rest;
    }
  }

  private _renderInput(field: keyof AddressDto, label: string, placeholder: string, type: string = 'text'): TemplateResult {
    const hasError = !!this._validationErrors[field];
    return html`
      <div class="form-field ${hasError ? 'has-error' : ''}">
        <uui-input
          type=${type}
          label=${label}
          placeholder=${placeholder}
          .value=${(this._editFormData[field] as string) || ''}
          @input=${(e: Event) => this._updateFormField(field, (e.target as HTMLInputElement).value)}
        ></uui-input>
        ${hasError ? html`<span class="field-error">${this._validationErrors[field]}</span>` : nothing}
      </div>
    `;
  }

  private _getCountryOptions(): Array<{ name: string; value: string; selected: boolean }> {
    return [
      { name: "Select country...", value: "", selected: !this._editFormData.countryCode },
      ...this._countries.map(c => ({
        name: c.name,
        value: c.code,
        selected: this._editFormData.countryCode === c.code
      }))
    ];
  }

  private _renderCountrySelect(): TemplateResult {
    const hasError = !!this._validationErrors.countryCode;
    return html`
      <div class="form-field ${hasError ? 'has-error' : ''}">
        <uui-select
          label="Country"
          placeholder="Select country"
          .options=${this._getCountryOptions()}
          @change=${(e: Event) => {
            const select = e.target as HTMLSelectElement;
            const selectedCountry = this._countries.find(c => c.code === select.value);
            this._editFormData = {
              ...this._editFormData,
              countryCode: select.value || null,
              country: selectedCountry?.name || null
            };
            if (this._validationErrors.countryCode) {
              const { countryCode: _, ...rest } = this._validationErrors;
              this._validationErrors = rest;
            }
          }}
        ></uui-select>
        ${hasError ? html`<span class="field-error">${this._validationErrors.countryCode}</span>` : nothing}
      </div>
    `;
  }

  private _renderFulfillmentCard(fulfillmentOrder: FulfillmentOrderDto): unknown {
    const canFulfill = this._order?.canFulfill ?? false;
    const currencyCode = this._order?.currencyCode;
    const currencySymbol = this._order?.currencySymbol;
    const lineItemRows = this._getFulfillmentLineItemRows(fulfillmentOrder.lineItems ?? []);

    return html`
      <div class="card fulfillment-card">
        <div class="fulfillment-header">
          <span class="fulfillment-status-badge ${fulfillmentOrder.statusCssClass}">
            <uui-icon name="icon-box"></uui-icon>
            ${fulfillmentOrder.statusLabel}
          </span>
          ${fulfillmentOrder.fulfilmentProviderName ? html`
            <span class="fulfillment-provider-badge">
              <uui-icon name="icon-server"></uui-icon>
              ${fulfillmentOrder.fulfilmentProviderName}
              ${fulfillmentOrder.fulfilmentProviderReference ? html`
                <span class="fulfillment-provider-ref">#${fulfillmentOrder.fulfilmentProviderReference}</span>
              ` : nothing}
            </span>
          ` : nothing}
        </div>
        ${fulfillmentOrder.fulfilmentErrorMessage ? html`
          <div class="fulfillment-error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${fulfillmentOrder.fulfilmentErrorMessage}</span>
            ${fulfillmentOrder.fulfilmentRetryCount > 0 ? html`
              <span class="fulfillment-retry-count">(${fulfillmentOrder.fulfilmentRetryCount} retries)</span>
            ` : nothing}
          </div>
        ` : nothing}
        <div class="fulfillment-shipping-method">
            <uui-icon name="icon-truck"></uui-icon>
          <div class="fulfillment-shipping-details">
            <span class="fulfillment-shipping-name">${fulfillmentOrder.deliveryMethod}</span>
            <span class="fulfillment-shipping-cost ${fulfillmentOrder.shippingCost === 0 ? 'free-shipping' : ''}">${fulfillmentOrder.shippingCost === 0 ? 'FREE' : formatCurrency(fulfillmentOrder.shippingCost, currencyCode, currencySymbol)}</span>
          </div>
        </div>
        <div class="fulfillment-line-items">
          ${lineItemRows.map((lineItemRow) =>
            this._renderFulfillmentLineItem(
              lineItemRow.item,
              lineItemRow.isChild,
              currencyCode,
              currencySymbol
            ))}
        </div>
        <div class="fulfillment-footer">
          <div class="fulfillment-actions">
            ${fulfillmentOrder.canReleaseSupplierDirect
              ? html`
                  <uui-button
                    look="secondary"
                    label="Release to Supplier"
                    @click=${() => this._releaseSupplierDirectOrder(fulfillmentOrder)}
                  >
                    Release to Supplier
                  </uui-button>
                `
              : nothing}
            <uui-button
              look="${canFulfill ? 'primary' : 'secondary'}"
              label="${canFulfill ? 'Fulfill' : 'Fulfilled'}"
              ?disabled=${!canFulfill}
              @click=${canFulfill ? this._openFulfillmentModal : nothing}
            >
              ${canFulfill ? "Fulfill" : "Fulfilled"}
            </uui-button>
          </div>
        </div>
      </div>
    `;
  }

  private _isAddonLineItem(lineItem: LineItemDto): boolean {
    return lineItem.isAddon || lineItem.lineItemType === "Addon" || Boolean(lineItem.parentLineItemId) || Boolean(lineItem.parentLineItemSku);
  }

  private _isCustomLineItem(lineItem: LineItemDto): boolean {
    return lineItem.lineItemType === "Custom";
  }

  private _getFulfillmentLineItemRows(lineItems: LineItemDto[]): Array<{ item: LineItemDto; isChild: boolean }> {
    const addonItems = lineItems.filter((lineItem) => this._isAddonLineItem(lineItem));
    const parentItems = lineItems.filter((lineItem) => !this._isAddonLineItem(lineItem));

    const addonsByParentId = new Map<string, LineItemDto[]>();
    const addonsByParentSku = new Map<string, LineItemDto[]>();
    addonItems.forEach((addon) => {
      const parentId = addon.parentLineItemId?.trim();
      if (parentId) {
        const currentItemsById = addonsByParentId.get(parentId);
        if (currentItemsById) {
          currentItemsById.push(addon);
        } else {
          addonsByParentId.set(parentId, [addon]);
        }
        return;
      }

      const parentSku = addon.parentLineItemSku?.trim();
      if (!parentSku) return;

      const currentItems = addonsByParentSku.get(parentSku);
      if (currentItems) {
        currentItems.push(addon);
      } else {
        addonsByParentSku.set(parentSku, [addon]);
      }
    });

    const rows: Array<{ item: LineItemDto; isChild: boolean }> = [];
    const renderedAddonIds = new Set<string>();

    parentItems.forEach((parent) => {
      rows.push({ item: parent, isChild: false });

      const inlineChildren = (parent.childLineItems ?? []).filter((child) => this._isAddonLineItem(child));
      const parentId = parent.id?.trim();
      const parentSku = parent.sku?.trim();
      const childrenById = parentId ? (addonsByParentId.get(parentId) ?? []) : [];
      const childrenBySku = parentSku ? (addonsByParentSku.get(parentSku) ?? []) : [];
      const children = [...inlineChildren, ...childrenById, ...childrenBySku]
        .filter((child, index, allChildren) => allChildren.findIndex((x) => x.id === child.id) === index);

      children.forEach((child) => {
        rows.push({ item: child, isChild: true });
        renderedAddonIds.add(child.id);
      });
    });

    addonItems.forEach((addon) => {
      if (!renderedAddonIds.has(addon.id)) {
        rows.push({ item: addon, isChild: false });
      }
    });

    return rows;
  }

  private _resolveFulfillmentMediaKey(lineItem: LineItemDto, isChild: boolean): string | null {
    if (isChild || this._isAddonLineItem(lineItem) || this._isCustomLineItem(lineItem)) {
      return null;
    }

    const mediaKey = lineItem.imageUrl?.trim();
    return mediaKey ? mediaKey : null;
  }

  private _renderFulfillmentLineItem(
    lineItem: LineItemDto,
    isChild: boolean,
    currencyCode: string | undefined,
    currencySymbol: string | undefined
  ): unknown {
    const isAddon = isChild || this._isAddonLineItem(lineItem);
    const mediaKey = this._resolveFulfillmentMediaKey(lineItem, isChild);
    const selectedOptions = isAddon ? [] : (lineItem.selectedOptions ?? []);
    const lineItemName = isAddon
      ? lineItem.name || lineItem.productRootName || "Add-on"
      : lineItem.productRootName || lineItem.name || "Unknown item";
    const amountPrefix = isAddon ? "+" : "";

    return html`
      <div class="fulfillment-line-item ${isAddon ? "is-addon" : ""}">
        <div class="fulfillment-item-main">
          ${isAddon ? html`
            <div class="addon-indicator">
              <span class="addon-connector"></span>
              <span class="addon-badge">Add-on</span>
            </div>
          ` : nothing}
          <merchello-line-item-identity
            .mediaKey=${mediaKey ?? null}
            name=${lineItemName}
            .selectedOptions=${selectedOptions}
            sku=${lineItem.sku || ""}
            size="large">
          </merchello-line-item-identity>
        </div>
        <div class="fulfillment-item-pricing">
          <span class="fulfillment-item-price">${amountPrefix}${formatCurrency(lineItem.amount, currencyCode, currencySymbol)}</span>
          <span class="fulfillment-item-multiply">x</span>
          <span class="fulfillment-item-qty">${lineItem.quantity}</span>
        </div>
        <div class="fulfillment-item-total">${amountPrefix}${formatCurrency(lineItem.calculatedTotal, currencyCode, currencySymbol)}</div>
      </div>
    `;
  }

  private _getDateGroupLabel(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";

    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  private _formatTimeOnly(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  private _groupNotesByDate(notes: InvoiceNoteDto[]): Map<string, InvoiceNoteDto[]> {
    const groups = new Map<string, InvoiceNoteDto[]>();
    
    const sortedNotes = [...notes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (const note of sortedNotes) {
      const date = new Date(note.date);
      const groupKey = this._getDateGroupLabel(date);
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(note);
    }
    
    return groups;
  }

  private _handlePaymentChange(): void {
    // Reload order data when payment changes
    if (this._order) {
      this.#workspaceContext?.load(this._order.id);
    }
  }

  private async _handlePostNote(): Promise<void> {
    if (!this._order || !this._newNoteText.trim()) return;

    this._isPostingNote = true;
    this._noteError = null;

    const { error } = await MerchelloApi.addInvoiceNote(this._order.id, {
      text: this._newNoteText.trim(),
      isVisibleToCustomer: this._isVisibleToCustomer,
    });

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    this._isPostingNote = false;

    if (error) {
      this._noteError = error.message || "Failed to post note";
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to post note", message: error.message || "Could not save the note" }
      });
      return;
    }

    // Show success notification
    this.#notificationContext?.peek("positive", {
      data: { headline: "Note added", message: "Your note has been posted" }
    });

    // Clear form and reload order
    this._newNoteText = "";
    this._isVisibleToCustomer = false;
    this.#workspaceContext?.load(this._order.id);
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderNotFoundState(): unknown {
    return html`<div class="error">Order not found</div>`;
  }

  /**
   * Renders a source badge for non-web orders (UCP, API, POS, etc.)
   */
  private _renderSourceBadge(order: OrderDetailDto): unknown {
    // Don't show badge for standard web orders
    if (!order.source || order.source.type === "web") {
      return nothing;
    }

    const sourceLabel = order.source.displayName || order.source.sourceName || order.source.type.toUpperCase();
    const sourceClass = `source-${order.source.type}`;

    return html`<span class="badge source ${sourceClass}" title="${this._getSourceTooltip(order)}">${sourceLabel}</span>`;
  }

  /**
   * Gets tooltip text for source badge showing full details
   */
  private _getSourceTooltip(order: OrderDetailDto): string {
    if (!order.source) return "";

    const parts: string[] = [];
    parts.push(`Source: ${order.source.displayName || order.source.type}`);

    if (order.source.sourceId) {
      parts.push(`ID: ${order.source.sourceId}`);
    }
    if (order.source.protocolVersion) {
      parts.push(`Version: ${order.source.protocolVersion}`);
    }

    return parts.join("\n");
  }

  override render() {
    if (this._isLoading) {
      return this._renderLoadingState();
    }

    if (!this._order) {
      return this._renderNotFoundState();
    }

    const order = this._order;
    const activeTab = this._getActiveTab();

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Back button -->
        <uui-button slot="header" compact href=${getOrdersListHref()} label="Back to orders" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <!-- Header with order info -->
        <div id="header" slot="header">
          <umb-icon name="icon-receipt"></umb-icon>
          <div class="header-title">
            <h1>${order.invoiceNumber || "Order"}</h1>
            <span class="order-meta">${formatDateTime(order.dateCreated)} from ${order.channel}</span>
          </div>
          <span class="badge ${order.paymentStatusCssClass}">${order.paymentStatusDisplay}</span>
          <span class="badge ${order.fulfillmentStatusCssClass}">${order.fulfillmentStatus}</span>
          ${order.isCancelled ? html`<span class="badge cancelled">Cancelled</span>` : nothing}
          ${this._renderSourceBadge(order)}
        </div>

        <!-- Inner layout with tabs -->
        <umb-body-layout header-fit-height header-no-padding>
          <!-- Tabs in header slot -->
          <uui-tab-group slot="header">
            <uui-tab
              label="Details"
              href=${this._getTabHref("details") ?? nothing}
              ?active=${activeTab === "details"}
            >
              Details
            </uui-tab>
            <uui-tab
              label="Shipments"
              href=${this._getTabHref("shipments") ?? nothing}
              ?active=${activeTab === "shipments"}
            >
              Shipments
            </uui-tab>
            <uui-tab
              label="Payments"
              href=${this._getTabHref("payments") ?? nothing}
              ?active=${activeTab === "payments"}
            >
              Payments
            </uui-tab>
          </uui-tab-group>

          <!-- Hidden router slot for URL tracking -->
          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}
          ></umb-router-slot>

          <!-- Tab Content -->
          <div class="tab-content">
        ${activeTab === "shipments"
          ? html`<merchello-shipments-view></merchello-shipments-view>`
          : activeTab === "payments"
          ? html`
              <div class="payments-content">
                <merchello-payment-link-panel
                  invoiceId=${order.id}
                ></merchello-payment-link-panel>
                <merchello-payment-panel
                  invoiceId=${order.id}
                  @payment-recorded=${this._handlePaymentChange}
                  @refund-processed=${this._handlePaymentChange}
                ></merchello-payment-panel>
              </div>
            `
          : html`
        <!-- Main Content -->
        <div class="order-content">
          <!-- Left Column -->
          <div class="main-column">
            <!-- Fulfillment Cards -->
            ${order.orders.map((fo) => this._renderFulfillmentCard(fo))}

            <!-- Payment Summary -->
            <div class="card payment-card">
              <div class="card-header">
                <uui-checkbox checked disabled label="Payment status" aria-label="Payment status"></uui-checkbox>
                <span>${order.paymentStatusDisplay}</span>
              </div>
              <div class="payment-summary">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span>${order.itemCount} items</span>
                  <span>${formatCurrency(order.subTotal, order.currencyCode, order.currencySymbol)}</span>
                </div>
                ${order.discountTotal > 0 ? html`
                  <div class="summary-row discount">
                    <span>Discounts</span>
                    <span></span>
                    <span>-${formatCurrency(order.discountTotal, order.currencyCode, order.currencySymbol)}</span>
                  </div>
                  ${order.discounts?.map(d => html`
                    <div class="summary-row discount-detail">
                      <span>${d.name || "Discount"} (-${formatCurrency(d.amount, order.currencyCode, order.currencySymbol)})</span>
                      <span></span>
                      <span></span>
                    </div>
                  `)}
                ` : nothing}
                <div class="summary-row">
                  <span>Shipping</span>
                  <span>${order.orders[0]?.deliveryMethod || "Standard"}</span>
                  <span class="${order.shippingCost === 0 ? 'free-shipping' : ''}">${order.shippingCost === 0 ? 'FREE' : formatCurrency(order.shippingCost, order.currencyCode, order.currencySymbol)}</span>
                </div>
                ${order.tax > 0 ? html`
                  <div class="summary-row">
                    <span>Tax</span>
                    <span></span>
                    <span>${formatCurrency(order.tax, order.currencyCode, order.currencySymbol)}</span>
                  </div>
                ` : nothing}
                <div class="summary-row total">
                  <span>Total</span>
                  <span></span>
                  <span>${formatCurrency(order.total, order.currencyCode, order.currencySymbol)}</span>
                </div>
                ${order.totalInStoreCurrency != null && order.storeCurrencyCode !== order.currencyCode ? html`
                  <div class="summary-row">
                    <span>Total (Store)</span>
                    <span></span>
                    <span>${formatCurrency(order.totalInStoreCurrency, order.storeCurrencyCode, order.storeCurrencySymbol)}</span>
                  </div>
                ` : nothing}
                <div class="summary-row ${order.balanceStatusCssClass}">
                  <span>Paid</span>
                  <span></span>
                  <span>${formatCurrency(order.amountPaid, order.currencyCode, order.currencySymbol)}</span>
                </div>
                ${order.amountPaidInStoreCurrency != null && order.storeCurrencyCode !== order.currencyCode ? html`
                  <div class="summary-row">
                    <span>Paid (Store)</span>
                    <span></span>
                    <span>${formatCurrency(order.amountPaidInStoreCurrency, order.storeCurrencyCode, order.storeCurrencySymbol)}</span>
                  </div>
                ` : nothing}
                ${order.creditDue > 0 ? html`
                  <div class="summary-row balance ${order.balanceStatusCssClass}">
                    <span>${order.balanceStatusLabel}</span>
                    <span></span>
                    <span>${formatCurrency(order.creditDue, order.currencyCode, order.currencySymbol)}</span>
                  </div>
                ` : order.balanceStatusLabel ? html`
                  <div class="summary-row balance ${order.balanceStatusCssClass}">
                    <span>${order.balanceStatusLabel}</span>
                    <span></span>
                    <span>${formatCurrency(Math.abs(order.balanceDue), order.currencyCode, order.currencySymbol)}</span>
                  </div>
                ` : nothing}
                ${order.creditDue > 0 && order.creditDueInStoreCurrency != null && order.storeCurrencyCode !== order.currencyCode ? html`
                  <div class="summary-row">
                    <span>${order.balanceStatusLabel} (Store)</span>
                    <span></span>
                    <span>${formatCurrency(order.creditDueInStoreCurrency ?? 0, order.storeCurrencyCode, order.storeCurrencySymbol)}</span>
                  </div>
                ` : order.balanceDueInStoreCurrency != null && order.storeCurrencyCode !== order.currencyCode && order.balanceStatusLabel ? html`
                  <div class="summary-row">
                    <span>${order.balanceStatusLabel} (Store)</span>
                    <span></span>
                    <span>${formatCurrency(Math.abs(order.balanceDueInStoreCurrency ?? 0), order.storeCurrencyCode, order.storeCurrencySymbol)}</span>
                  </div>
                ` : nothing}
              </div>
            </div>

            <!-- Timeline -->
            <div class="card timeline-card">
              <h3>Timeline</h3>
              <div class="timeline-comment-box">
                <div class="timeline-avatar">
                  ${this._currentUser?.email
                    ? html`<img src="${this._getGravatarUrl(this._currentUser.email)}" alt="Avatar" />`
                    : html`<uui-icon name="icon-user"></uui-icon>`}
                </div>
                <div class="timeline-input-wrapper">
                  <uui-textarea
                    label="Comment"
                    placeholder="Leave a comment..."
                    .value=${this._newNoteText}
                    @input=${(e: Event) => {
                      this._newNoteText = (e.target as HTMLTextAreaElement).value;
                      this._noteError = null;
                    }}
                  ></uui-textarea>
                  <div class="timeline-toolbar">
                    <uui-button
                      look="primary"
                      label="Post"
                      ?disabled=${!this._newNoteText.trim() || this._isPostingNote}
                      @click=${this._handlePostNote}
                    >
                      ${this._isPostingNote ? "Posting..." : "Post"}
                    </uui-button>
                  </div>
                  ${this._noteError ? html`<div class="note-error">${this._noteError}</div>` : nothing}
                </div>
              </div>
              <div class="timeline-visibility-note">
                <uui-checkbox
                  label="Visible to customer"
                  ?checked=${this._isVisibleToCustomer}
                  @change=${(e: CustomEvent) => this._isVisibleToCustomer = (e.target as HTMLInputElement).checked}
                >
                  Visible to customer
                </uui-checkbox>
                <span class="visibility-hint">
                  ${this._isVisibleToCustomer ? "Customers can see this new comment." : "Only staff can see this new comment."}
                </span>
              </div>
              <div class="timeline-events-container">
                ${order.notes.length === 0
                  ? html`<div class="no-notes">No timeline events yet</div>`
                  : Array.from(this._groupNotesByDate(order.notes).entries()).map(
                      ([dateGroup, notes]) => html`
                        <div class="timeline-date-group">
                          <div class="timeline-date-header">${dateGroup}</div>
                          <div class="timeline-events">
                            ${notes.map(
                              (note) => html`
                                <div class="timeline-event ${note.isVisibleToCustomer ? 'customer-visible' : ''}">
                                  <div class="timeline-event-dot"></div>
                                  <div class="timeline-event-content">
                                    ${note.isVisibleToCustomer ? html`<span class="customer-badge">Customer visible</span>` : nothing}
                                    <div class="event-text markdown-content">${this._renderMarkdown(note.text)}</div>
                                    ${note.author ? html`<span class="event-author">by ${note.author}</span>` : nothing}
                                  </div>
                                  <div class="timeline-event-time">${this._formatTimeOnly(note.date)}</div>
                                </div>
                              `
                            )}
                          </div>
                        </div>
                      `
                    )}
              </div>
            </div>
          </div>

          <!-- Right Column (Sidebar) -->
          <div class="sidebar">
            <!-- Purchase Order -->
            <div class="card sidebar-card">
              <div class="card-header-with-action">
                <h3>Purchase Order</h3>
                ${!this._isEditingPurchaseOrder ? html`
                  <uui-button look="secondary" compact label="Edit purchase order" @click=${this._startEditingPurchaseOrder}>
                    <uui-icon name="icon-edit"></uui-icon>
                  </uui-button>
                ` : nothing}
              </div>
              ${this._isEditingPurchaseOrder ? html`
                <div class="edit-form">
                  <uui-input
                    type="text"
                    label="Purchase Order"
                    placeholder="Enter PO number..."
                    .value=${this._purchaseOrderValue}
                    @input=${(e: Event) => this._purchaseOrderValue = (e.target as HTMLInputElement).value}
                  ></uui-input>
                  <div class="edit-actions">
                    <uui-button look="secondary" label="Cancel" @click=${this._cancelEditingPurchaseOrder} ?disabled=${this._isSavingPurchaseOrder}>Cancel</uui-button>
                    <uui-button look="primary" label="Save" @click=${this._savePurchaseOrder} ?disabled=${this._isSavingPurchaseOrder}>
                      ${this._isSavingPurchaseOrder ? 'Saving...' : 'Save'}
                    </uui-button>
                  </div>
                </div>
              ` : html`
                <div class="purchase-order-value">
                  ${order.purchaseOrder
                    ? html`<span>${order.purchaseOrder}</span>`
                    : html`<span class="muted">No PO number</span>`
                  }
                </div>
              `}
            </div>

            <!-- Credit Limit Warning -->
            ${order.creditLimitExceeded ? html`
              <div class="credit-limit-warning">
                <uui-icon name="icon-alert"></uui-icon>
                Customer has exceeded their credit limit
              </div>
            ` : nothing}

            <!-- Customer -->
            <div class="card sidebar-card">
              <h3>Customer</h3>
              <div class="customer-info">
                <button type="button" class="customer-name-link" @click=${this._openCustomerEditModal}>${order.billingAddress?.name || "Unknown"}</button>
                ${order.billingAddress?.email
                  ? html`<button type="button" class="customer-orders-link" @click=${this._openCustomerOrdersModal}>${order.customerOrderCount} ${order.customerOrderCount === 1 ? 'order' : 'orders'}</button>`
                  : html`<div class="muted">${order.customerOrderCount} ${order.customerOrderCount === 1 ? 'order' : 'orders'}</div>`
                }
              </div>
              <div class="section">
                <div class="section-header">
                  <span class="section-title">Contact information</span>
                  ${this._editingSection !== 'contact' ? html`
                    <uui-button look="secondary" compact label="Edit contact" @click=${() => this._startEditing('contact')}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </uui-button>
                  ` : nothing}
                </div>
                ${this._editingSection === 'contact' ? html`
                  <div class="edit-form">
                    ${this._renderInput('email', 'Email', 'Email address', 'email')}
                    <div class="edit-actions">
                      <uui-button look="secondary" label="Cancel" @click=${this._cancelEditing} ?disabled=${this._isSavingAddress}>Cancel</uui-button>
                      <uui-button look="primary" label="Save" @click=${this._saveEditing} ?disabled=${this._isSavingAddress}>
                        ${this._isSavingAddress ? 'Saving...' : 'Save'}
                      </uui-button>
                    </div>
                  </div>
                ` : html`
                  ${order.billingAddress?.email
                    ? html`<a href="mailto:${order.billingAddress.email}">${order.billingAddress.email}</a>`
                    : html`<span class="muted">No email</span>`}
                `}
              </div>
              <div class="section">
                <div class="section-header">
                  <span class="section-title">Shipping address</span>
                  ${this._editingSection !== 'shipping' ? html`
                    <uui-button look="secondary" compact label="Edit shipping address" @click=${() => this._startEditing('shipping')}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </uui-button>
                  ` : nothing}
                </div>
                ${this._editingSection === 'shipping' ? html`
                  <div class="edit-form">
                    ${this._renderInput('name', 'Name', 'Name')}
                    ${this._renderInput('company', 'Company', 'Company')}
                    ${this._renderInput('addressOne', 'Address Line 1', 'Address Line 1')}
                    ${this._renderInput('addressTwo', 'Address Line 2', 'Address Line 2')}
                    ${this._renderInput('townCity', 'Town/City', 'Town/City')}
                    ${this._renderInput('countyState', 'County/State', 'County/State')}
                    ${this._renderInput('postalCode', 'Postal Code', 'Postal Code')}
                    ${this._renderCountrySelect()}
                    ${this._renderInput('phone', 'Phone', 'Phone', 'tel')}
                    <div class="edit-actions">
                      <uui-button look="secondary" label="Cancel" @click=${this._cancelEditing} ?disabled=${this._isSavingAddress}>Cancel</uui-button>
                      <uui-button look="primary" label="Save" @click=${this._saveEditing} ?disabled=${this._isSavingAddress}>
                        ${this._isSavingAddress ? 'Saving...' : 'Save'}
                      </uui-button>
                    </div>
                  </div>
                ` : html`
                  <div class="address">
                    ${this._formatAddress(order.shippingAddress).map((line) => html`<div>${line}</div>`)}
                  </div>
                  ${this._getGoogleMapsUrl(order.shippingAddress)
                    ? html`<a href=${this._getGoogleMapsUrl(order.shippingAddress)} target="_blank" rel="noopener noreferrer" class="view-map">View map</a>`
                    : nothing}
                `}
              </div>
              <div class="section">
                <div class="section-header">
                  <span class="section-title">Billing address</span>
                  ${this._editingSection !== 'billing' ? html`
                    <uui-button look="secondary" compact label="Edit billing address" @click=${() => this._startEditing('billing')}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </uui-button>
                  ` : nothing}
                </div>
                ${this._editingSection === 'billing' ? html`
                  <div class="edit-form">
                    ${this._renderInput('name', 'Name', 'Name')}
                    ${this._renderInput('company', 'Company', 'Company')}
                    ${this._renderInput('addressOne', 'Address Line 1', 'Address Line 1')}
                    ${this._renderInput('addressTwo', 'Address Line 2', 'Address Line 2')}
                    ${this._renderInput('townCity', 'Town/City', 'Town/City')}
                    ${this._renderInput('countyState', 'County/State', 'County/State')}
                    ${this._renderInput('postalCode', 'Postal Code', 'Postal Code')}
                    ${this._renderCountrySelect()}
                    ${this._renderInput('phone', 'Phone', 'Phone', 'tel')}
                    <div class="edit-actions">
                      <uui-button look="secondary" label="Cancel" @click=${this._cancelEditing} ?disabled=${this._isSavingAddress}>Cancel</uui-button>
                      <uui-button look="primary" label="Save" @click=${this._saveEditing} ?disabled=${this._isSavingAddress}>
                        ${this._isSavingAddress ? 'Saving...' : 'Save'}
                      </uui-button>
                    </div>
                  </div>
                ` : html`
                  ${this._areAddressesEquivalent(order.billingAddress, order.shippingAddress)
                    ? html`<span class="muted">Same as shipping address</span>`
                    : html`
                        <div class="address">
                          ${this._formatAddress(order.billingAddress).map((line) => html`<div>${line}</div>`)}
                        </div>
                      `}
                `}
              </div>
            </div>
          </div>
        </div>
        `}
          </div>
        </umb-body-layout>

        <!-- Footer -->
        <umb-footer-layout slot="footer">
          ${!this._order?.isCancelled ? html`
            <uui-button slot="actions" look="secondary" color="danger" label="Cancel Invoice" @click=${this._openCancelInvoiceModal}>
              Cancel Invoice
            </uui-button>
          ` : ''}
          <uui-button slot="actions" look="primary" label="Edit Order" @click=${this._openEditOrderModal}>
            Edit Order
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      --uui-tab-background: var(--uui-color-surface);
    }

    /* Hide router slot - used only for URL tracking */
    umb-router-slot {
      display: none;
    }

    /* Header styling */
    .back-button {
      margin-right: var(--uui-size-space-2);
    }

    #header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      flex: 1;
      padding: var(--uui-size-space-4) 0;
    }

    #header umb-icon {
      font-size: 24px;
      color: var(--uui-color-text-alt);
    }

    .header-title {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .header-title h1 {
      margin: 0;
      font-size: var(--uui-type-h5-size);
      font-weight: 700;
    }

    .order-meta {
      color: var(--uui-color-text-alt);
      font-size: 0.75rem;
    }

    /* Tab styling */
    uui-tab-group {
      --uui-tab-divider: var(--uui-color-border);
      width: 100%;
    }

    /* Tab content */
    .tab-content {
      padding: var(--uui-size-layout-1);
    }

    .payments-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-layout-1);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-layout-2);
    }

    .error {
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .badge.paid {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .badge.unpaid {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .badge.partial,
    .badge.awaiting {
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .badge.refunded,
    .badge.partially-refunded {
      background: var(--uui-color-text-alt);
      color: var(--uui-color-surface);
    }

    .badge.fulfilled {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .badge.unfulfilled,
    .badge.partially-fulfilled {
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .badge.cancelled {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    /* Source badges for non-web orders */
    .badge.source {
      background: var(--uui-color-current-standalone);
      color: var(--uui-color-current-contrast);
    }

    .badge.source-ucp {
      background: var(--uui-color-current-standalone);
      color: var(--uui-color-current-contrast);
    }

    .badge.source-api {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .badge.source-pos {
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .badge.source-manual {
      background: var(--uui-color-border-standalone);
      color: var(--uui-color-text);
    }

    .order-content {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
      gap: var(--uui-size-space-4);
    }

    @media (max-width: 1024px) {
      .order-content {
        grid-template-columns: 1fr;
      }
    }

    .main-column {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      min-width: 0;
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .card {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      margin-bottom: 0;
    }

    .card h3 {
      margin: 0 0 var(--uui-size-space-3);
      font-size: 0.9375rem;
      font-weight: 600;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-3);
    }

    .card-header-with-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-3);
    }

    .card-header-with-action h3 {
      margin: 0;
    }

    .card-footer {
      margin-top: var(--uui-size-space-3);
      padding-top: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }

    .sidebar-card > h3 {
      margin-bottom: var(--uui-size-space-3);
      padding-bottom: var(--uui-size-space-3);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .credit-limit-warning {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-4);
      background-color: var(--uui-color-warning-standalone);
      color: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
      font-weight: 600;
    }

    .sidebar-card .card-header-with-action {
      margin-bottom: var(--uui-size-space-3);
      padding-bottom: var(--uui-size-space-3);
      border-bottom: 1px solid var(--uui-color-border);
    }

    /* Fulfillment Card - Shopify-like styling */
    .fulfillment-card {
      padding: 0;
      overflow: hidden;
    }

    .fulfillment-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .fulfillment-status-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8125rem;
      font-weight: 600;
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .fulfillment-status-badge uui-icon {
      font-size: 1rem;
    }

    .fulfillment-status-badge.shipped {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .fulfillment-status-badge.cancelled {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .fulfillment-provider-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text);
      margin-left: var(--uui-size-space-2);
    }

    .fulfillment-provider-badge uui-icon {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .fulfillment-provider-ref {
      color: var(--uui-color-text-alt);
      font-family: var(--uui-font-family-monospace, monospace);
    }

    .fulfillment-error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      font-size: 0.875rem;
    }

    .fulfillment-error uui-icon {
      flex-shrink: 0;
    }

    .fulfillment-retry-count {
      opacity: 0.8;
      font-size: 0.75rem;
    }

    .fulfillment-shipping-method {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
      font-size: 0.875rem;
      color: var(--uui-color-text);
    }

    .fulfillment-shipping-method uui-icon {
      color: var(--uui-color-text-alt);
    }

    .fulfillment-shipping-details {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex: 1;
      gap: var(--uui-size-space-2);
    }

    .fulfillment-shipping-name {
      flex: 1;
    }

    .fulfillment-shipping-cost {
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .free-shipping {
      color: var(--uui-color-positive);
    }

    .fulfillment-line-items {
      display: flex;
      flex-direction: column;
    }

    .fulfillment-line-item {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: var(--uui-size-space-4);
      align-items: center;
      padding: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .fulfillment-item-main {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      min-width: 0;
    }

    .fulfillment-line-item.is-addon {
      background: var(--uui-color-surface-alt);
      padding-top: var(--uui-size-space-3);
      padding-bottom: var(--uui-size-space-3);
    }

    .fulfillment-line-item.is-addon .fulfillment-item-main {
      padding-left: var(--uui-size-space-2);
    }

    .fulfillment-line-item:last-child {
      border-bottom: none;
    }

    .fulfillment-line-item merchello-line-item-identity {
      min-width: 0;
    }

    .addon-indicator {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      flex-shrink: 0;
    }

    .addon-connector {
      width: 14px;
      height: 1px;
      background: var(--uui-color-border-emphasis);
    }

    .addon-badge {
      display: inline-flex;
      align-items: center;
      height: 18px;
      padding: 0 8px;
      border-radius: 999px;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      color: var(--uui-color-text-alt);
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      text-transform: uppercase;
      line-height: 1;
    }

    .fulfillment-item-pricing {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      white-space: nowrap;
    }

    .fulfillment-item-multiply {
      color: var(--uui-color-text-alt);
    }

    .fulfillment-item-qty {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 6px;
      background: var(--uui-color-surface-alt);
      border-radius: 4px;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .fulfillment-item-total {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--uui-color-text);
      text-align: right;
      white-space: nowrap;
    }

    .fulfillment-footer {
      padding: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
      background: var(--uui-color-surface);
    }

    .fulfillment-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-3);
    }

    .fulfillment-actions uui-button-group {
      display: flex;
    }

    /* Legacy styles for backward compatibility */
    .status-badge {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .status-badge.shipped {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .shipping-method {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .line-items {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .line-item {
      display: grid;
      grid-template-columns: 50px 1fr auto auto;
      gap: var(--uui-size-space-3);
      align-items: center;
    }

    .item-image img,
    .placeholder-image {
      width: 50px;
      height: 50px;
      border-radius: var(--uui-border-radius);
      object-fit: cover;
    }

    .placeholder-image {
      background: var(--uui-color-surface-alt);
    }

    .item-name {
      font-weight: 500;
    }

    .item-sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .item-price,
    .item-total {
      font-size: 0.875rem;
    }

    .payment-summary {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .summary-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
    }

    .summary-row > span:nth-child(2) {
      text-align: right;
      color: var(--uui-color-text-alt);
    }

    .summary-row > span:last-child {
      text-align: right;
      min-width: 80px;
    }

    .summary-row.total {
      font-weight: 600;
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
    }

    .summary-row.discount {
      color: var(--uui-color-positive);
    }

    .summary-row.discount-detail {
      color: var(--uui-color-positive);
      padding-left: var(--uui-size-space-5);
      font-size: 0.8125rem;
    }

    .summary-row.discount-detail > span:first-child {
      color: var(--uui-color-text-alt);
    }

    .summary-row.underpaid {
      color: var(--uui-color-danger);
    }

    .summary-row.overpaid {
      color: var(--uui-color-warning);
    }

    .summary-row.balance {
      font-weight: 600;
      padding-top: var(--uui-size-space-2);
      border-top: 1px dashed var(--uui-color-border);
    }

    /* Timeline - Shopify-like styling */
    .timeline-card {
      padding: var(--uui-size-space-4);
    }

    .timeline-comment-box {
      display: flex;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
    }

    .timeline-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--uui-color-surface-alt);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--uui-color-text-alt);
      overflow: hidden;
    }

    .timeline-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .timeline-avatar uui-icon {
      font-size: 1.25rem;
    }

    .timeline-input-wrapper {
      flex: 1;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
    }

    .timeline-input-wrapper uui-textarea {
      --uui-textarea-border-color: transparent;
      --uui-textarea-border-color-focus: transparent;
    }

    .timeline-input-wrapper textarea {
      width: 100%;
      padding: var(--uui-size-space-3);
      border: none;
      box-sizing: border-box;
      resize: none;
      font-family: inherit;
      font-size: 0.875rem;
      min-height: 60px;
    }

    .timeline-input-wrapper textarea:focus {
      outline: none;
    }

    .timeline-toolbar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border-top: 1px solid var(--uui-color-border);
    }

    .note-error {
      color: var(--uui-color-danger);
      font-size: 0.875rem;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
    }

    .timeline-visibility-note {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-4);
      padding-left: 52px; /* Align with input (40px avatar + 12px gap) */
      gap: var(--uui-size-space-2);
    }

    .customer-visible-checkbox {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.8125rem;
      color: var(--uui-color-text);
      cursor: pointer;
    }

    .customer-visible-checkbox input {
      cursor: pointer;
    }

    .visibility-hint {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .timeline-events-container {
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-4);
    }

    .timeline-date-group {
      margin-bottom: var(--uui-size-space-4);
    }

    .timeline-date-header {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-3);
    }

    .timeline-events {
      position: relative;
      padding-left: var(--uui-size-space-5);
    }

    .timeline-events::before {
      content: '';
      position: absolute;
      left: 5px;
      top: 8px;
      bottom: 8px;
      width: 1px;
      background: var(--uui-color-border);
    }

    .timeline-event {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-2) 0;
      position: relative;
    }

    .timeline-event-dot {
      position: absolute;
      left: calc(-1 * var(--uui-size-space-5) + 2px);
      top: 10px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--uui-color-text-alt);
    }

    .timeline-event.customer-visible .timeline-event-dot {
      background: var(--uui-color-current);
    }

    .timeline-event-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .customer-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 500;
      color: var(--uui-color-current-contrast);
      background: var(--uui-color-current-standalone);
      padding: 2px 8px;
      border-radius: 10px;
      width: fit-content;
    }

    .event-text {
      font-size: 0.875rem;
      color: var(--uui-color-text);
      line-height: 1.5;
    }

    .event-author {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .timeline-event-time {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      white-space: nowrap;
    }

    .no-notes {
      color: var(--uui-color-text-alt);
      font-style: italic;
      padding: var(--uui-size-space-2);
    }

    .muted {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .purchase-order-value {
      font-size: 0.875rem;
    }

    .customer-info {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
      padding-bottom: var(--uui-size-space-1);
    }

    .customer-name {
      color: var(--uui-color-text);
      font-weight: 500;
    }

    .customer-name-link {
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      font-weight: 600;
      font-size: inherit;
      font-family: inherit;
      color: var(--uui-color-interactive);
      cursor: pointer;
      text-align: left;
    }

    .customer-name-link:hover {
      text-decoration: underline;
      color: var(--uui-color-interactive-emphasis);
    }

    .customer-orders-link {
      display: inline-block;
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      font-family: inherit;
      text-decoration: none;
      cursor: pointer;
      text-align: left;
    }

    .customer-orders-link:hover {
      color: var(--uui-color-interactive);
      text-decoration: underline;
    }

    .section {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-3);
      font-weight: 500;
      font-size: 0.875rem;
    }

    .section-title {
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .address {
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .address > div + div {
      margin-top: 2px;
    }

    .view-map {
      display: inline-block;
      margin-top: var(--uui-size-space-2);
      color: var(--uui-color-interactive);
      font-size: 0.875rem;
    }

    .edit-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: var(--uui-size-space-1);
      color: var(--uui-color-text-alt);
    }

    .edit-btn:hover {
      color: var(--uui-color-interactive);
    }

    .edit-form {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
    }

    .edit-form uui-input,
    .edit-form uui-select {
      width: 100%;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-field.has-error uui-input,
    .form-field.has-error uui-select {
      --uui-input-border-color: #dc3545;
    }

    .field-error {
      color: #dc3545;
      font-size: 0.75rem;
    }

    .edit-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
      margin-top: var(--uui-size-space-2);
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
    }

    /* Markdown content styles for timeline notes */
    .markdown-content {
      line-height: 1.5;
    }

    .markdown-content p {
      margin: 0 0 var(--uui-size-space-2) 0;
    }

    .markdown-content p:last-child {
      margin-bottom: 0;
    }

    .markdown-content ul,
    .markdown-content ol {
      margin: var(--uui-size-space-2) 0;
      padding-left: var(--uui-size-space-5);
    }

    .markdown-content li {
      margin: var(--uui-size-space-1) 0;
    }

    .markdown-content code {
      background: var(--uui-color-surface-alt);
      padding: 1px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.875em;
    }

    .markdown-content pre {
      background: var(--uui-color-surface-alt);
      padding: var(--uui-size-space-2);
      border-radius: var(--uui-border-radius);
      overflow-x: auto;
      margin: var(--uui-size-space-2) 0;
    }

    .markdown-content pre code {
      background: none;
      padding: 0;
    }

    .markdown-content a {
      color: var(--uui-color-interactive);
    }

    .markdown-content strong {
      font-weight: 600;
    }

    .markdown-content blockquote {
      border-left: 3px solid var(--uui-color-border-emphasis);
      margin: var(--uui-size-space-2) 0;
      padding-left: var(--uui-size-space-3);
      color: var(--uui-color-text-alt);
    }

    @media (max-width: 768px) {
      .timeline-visibility-note {
        align-items: flex-start;
        flex-direction: column;
        padding-left: 0;
      }
    }
  `;
}

export default MerchelloOrderDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-order-detail": MerchelloOrderDetailElement;
  }
}

