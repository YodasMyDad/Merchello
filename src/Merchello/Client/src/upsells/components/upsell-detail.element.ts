import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { UmbRoute, UmbRouterSlotChangeEvent, UmbRouterSlotInitEvent } from "@umbraco-cms/backoffice/router";
import type { MerchelloUpsellsWorkspaceContext } from "@upsells/contexts/upsells-workspace.context.js";
import type {
  UpsellDetailDto,
  CreateUpsellDto,
  UpdateUpsellDto,
  UpsellTriggerRuleDto,
  UpsellRecommendationRuleDto,
  UpsellEligibilityRuleDto,
  UpsellPerformanceDto,
} from "@upsells/types/upsell.types.js";
import {
  UpsellStatus,
  UpsellDisplayLocation,
  UpsellSortBy,
  CheckoutUpsellMode,
} from "@upsells/types/upsell.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatCurrency, formatNumber, formatPercent } from "@shared/utils/formatting.js";
import {
  navigateToUpsellsList,
  getUpsellsListHref,
  replaceToUpsellDetail,
} from "@shared/utils/navigation.js";
import "./trigger-rule-builder.element.js";
import "./recommendation-rule-builder.element.js";
import "./eligibility-rule-builder.element.js";

@customElement("merchello-upsell-detail")
export class MerchelloUpsellDetailElement extends UmbElementMixin(LitElement) {
  @state() private _upsell?: UpsellDetailDto;
  @state() private _isNew = true;
  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _validationErrors: Map<string, string> = new Map();
  @state() private _triggerRules: UpsellTriggerRuleDto[] = [];
  @state() private _recommendationRules: UpsellRecommendationRuleDto[] = [];
  @state() private _eligibilityRules: UpsellEligibilityRuleDto[] = [];

  @state() private _performance?: UpsellPerformanceDto;
  @state() private _performanceLoading = false;
  @state() private _performanceError?: string;

  @state() private _routes: UmbRoute[] = [];
  @state() private _routerPath?: string;
  @state() private _activePath = "";

  #workspaceContext?: MerchelloUpsellsWorkspaceContext;
  #notificationContext?: UmbNotificationContext;
  #modalManager?: UmbModalManagerContext;

  constructor() {
    super();
    this._initRoutes();

    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloUpsellsWorkspaceContext;
      if (!this.#workspaceContext) return;
      this._isNew = this.#workspaceContext.isNew;

      this.observe(this.#workspaceContext.upsell, (upsell) => {
        this._upsell = upsell;
        this._triggerRules = upsell?.triggerRules ?? [];
        this._recommendationRules = upsell?.recommendationRules ?? [];
        this._eligibilityRules = upsell?.eligibilityRules ?? [];
        this._isLoading = false;
      }, '_upsell');

      this.observe(this.#workspaceContext.isLoading, (isLoading) => {
        this._isLoading = isLoading;
      }, '_isLoading');

      this.observe(this.#workspaceContext.isSaving, (isSaving) => {
        this._isSaving = isSaving;
      }, '_isSaving');
    });

    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });

    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  private _initRoutes(): void {
    const stubComponent = (): HTMLElement => document.createElement("div");

    this._routes = [
      { path: "tab/details", component: stubComponent },
      { path: "tab/rules", component: stubComponent },
      { path: "tab/display", component: stubComponent },
      { path: "tab/eligibility", component: stubComponent },
      { path: "tab/schedule", component: stubComponent },
      { path: "tab/performance", component: stubComponent },
      { path: "", redirectTo: "tab/details" },
    ];
  }

  private _getActiveTab(): string {
    if (this._activePath.includes("tab/rules")) return "rules";
    if (this._activePath.includes("tab/display")) return "display";
    if (this._activePath.includes("tab/eligibility")) return "eligibility";
    if (this._activePath.includes("tab/schedule")) return "schedule";
    if (this._activePath.includes("tab/performance")) return "performance";
    return "details";
  }

  private _onRouterInit(event: UmbRouterSlotInitEvent): void {
    this._routerPath = event.target.absoluteRouterPath;
  }

  private _onRouterChange(event: UmbRouterSlotChangeEvent): void {
    this._activePath = event.target.localActiveViewPath || "";
  }

  private _getHeadline(): string {
    if (this._isNew) return "Create upsell";
    return this._upsell?.name ?? "Edit upsell";
  }

  private _handleInputChange(field: keyof UpsellDetailDto, value: unknown): void {
    if (!this._upsell) return;
    const updated = { ...this._upsell, [field]: value };
    this.#workspaceContext?.updateUpsell(updated);
    this._validationErrors.delete(field);
    this.requestUpdate();
  }

  private _validate(): boolean {
    this._validationErrors.clear();

    if (!this._upsell?.name?.trim()) {
      this._validationErrors.set("name", "Name is required");
    }
    if (!this._upsell?.heading?.trim()) {
      this._validationErrors.set("heading", "Heading is required");
    }

    this.requestUpdate();
    return this._validationErrors.size === 0;
  }

  private async _handleSave(): Promise<void> {
    if (!this._upsell || !this._validate()) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation failed", message: "Please fix the errors before saving" },
      });
      return;
    }

    this.#workspaceContext?.setIsSaving(true);

    if (this._isNew) {
      const createDto: CreateUpsellDto = {
        name: this._upsell.name,
        description: this._upsell.description,
        heading: this._upsell.heading,
        message: this._upsell.message,
        displayLocation: this._upsell.displayLocation,
        checkoutMode: this._upsell.checkoutMode,
        sortBy: this._upsell.sortBy,
        maxProducts: this._upsell.maxProducts,
        suppressIfInCart: this._upsell.suppressIfInCart,
        priority: this._upsell.priority,
        startsAt: this._upsell.startsAt,
        endsAt: this._upsell.endsAt,
        timezone: this._upsell.timezone,
        triggerRules: this._triggerRules.map((r) => ({
          triggerType: r.triggerType,
          triggerIds: r.triggerIds,
          extractFilterIds: r.extractFilterIds,
        })),
        recommendationRules: this._recommendationRules.map((r) => ({
          recommendationType: r.recommendationType,
          recommendationIds: r.recommendationIds,
          matchTriggerFilters: r.matchTriggerFilters,
          matchFilterIds: r.matchFilterIds,
        })),
        eligibilityRules: this._eligibilityRules.map((r) => ({
          eligibilityType: r.eligibilityType,
          eligibilityIds: r.eligibilityIds,
        })),
      };

      const { data, error } = await MerchelloApi.createUpsell(createDto);
      this.#workspaceContext?.setIsSaving(false);

      if (error) {
        this.#notificationContext?.peek("danger", {
          data: { headline: "Failed to create upsell", message: error.message },
        });
        return;
      }

      if (data) {
        this.#workspaceContext?.updateUpsell(data);
        this._isNew = false;
        this.#notificationContext?.peek("positive", {
          data: { headline: "Upsell created", message: `${data.name} has been created` },
        });
        replaceToUpsellDetail(data.id);
      }
    } else {
      const updateDto: UpdateUpsellDto = {
        name: this._upsell.name,
        description: this._upsell.description,
        heading: this._upsell.heading,
        message: this._upsell.message,
        displayLocation: this._upsell.displayLocation,
        checkoutMode: this._upsell.checkoutMode,
        sortBy: this._upsell.sortBy,
        maxProducts: this._upsell.maxProducts,
        suppressIfInCart: this._upsell.suppressIfInCart,
        priority: this._upsell.priority,
        startsAt: this._upsell.startsAt,
        endsAt: this._upsell.endsAt,
        timezone: this._upsell.timezone,
        triggerRules: this._triggerRules.map((r) => ({
          triggerType: r.triggerType,
          triggerIds: r.triggerIds,
          extractFilterIds: r.extractFilterIds,
        })),
        recommendationRules: this._recommendationRules.map((r) => ({
          recommendationType: r.recommendationType,
          recommendationIds: r.recommendationIds,
          matchTriggerFilters: r.matchTriggerFilters,
          matchFilterIds: r.matchFilterIds,
        })),
        eligibilityRules: this._eligibilityRules.map((r) => ({
          eligibilityType: r.eligibilityType,
          eligibilityIds: r.eligibilityIds,
        })),
      };

      const { data, error } = await MerchelloApi.updateUpsell(this._upsell.id, updateDto);
      this.#workspaceContext?.setIsSaving(false);

      if (error) {
        this.#notificationContext?.peek("danger", {
          data: { headline: "Failed to update upsell", message: error.message },
        });
        return;
      }

      if (data) {
        this.#workspaceContext?.updateUpsell(data);
        this.#notificationContext?.peek("positive", {
          data: { headline: "Upsell saved", message: `${data.name} has been updated` },
        });
      }
    }
  }

  private async _handleDelete(): Promise<void> {
    if (!this._upsell?.id) return;

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Upsell",
        content: `Are you sure you want to delete "${this._upsell.name}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return;
    }

    const { error } = await MerchelloApi.deleteUpsell(this._upsell.id);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete upsell", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Upsell deleted", message: `${this._upsell.name} has been deleted` },
    });
    navigateToUpsellsList();
  }

  private async _handleActivate(): Promise<void> {
    if (!this._upsell?.id) return;

    const { data, error } = await MerchelloApi.activateUpsell(this._upsell.id);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to activate upsell", message: error.message },
      });
      return;
    }

    if (data) {
      this.#workspaceContext?.updateUpsell(data);
      this.#notificationContext?.peek("positive", {
        data: { headline: "Upsell activated", message: `${data.name} is now active` },
      });
    }
  }

  private async _handleDeactivate(): Promise<void> {
    if (!this._upsell?.id) return;

    const { data, error } = await MerchelloApi.deactivateUpsell(this._upsell.id);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to deactivate upsell", message: error.message },
      });
      return;
    }

    if (data) {
      this.#workspaceContext?.updateUpsell(data);
      this.#notificationContext?.peek("positive", {
        data: { headline: "Upsell deactivated", message: `${data.name} has been disabled` },
      });
    }
  }

  private _handleTriggerRulesChange(e: CustomEvent<{ rules: UpsellTriggerRuleDto[] }>): void {
    this._triggerRules = e.detail.rules;
  }

  private _handleRecommendationRulesChange(e: CustomEvent<{ rules: UpsellRecommendationRuleDto[] }>): void {
    this._recommendationRules = e.detail.rules;
  }

  private _handleEligibilityRulesChange(e: CustomEvent<{ rules: UpsellEligibilityRuleDto[] }>): void {
    this._eligibilityRules = e.detail.rules;
  }

  // ============================================
  // Tab Renderers
  // ============================================

  private _renderDetailsTab(): unknown {
    return html`
      <uui-box headline="Basic Information">
        <div class="form-grid">
          <umb-property-layout
            label="Name"
            description="Internal name for this upsell rule"
            ?mandatory=${true}
            ?invalid=${this._validationErrors.has("name")}>
            <uui-input
              slot="editor"
              .value=${this._upsell?.name ?? ""}
              @input=${(e: Event) => this._handleInputChange("name", (e.target as HTMLInputElement).value)}
              label="Name"
              placeholder="e.g. Bed to Pillow Upsell"
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout label="Description" description="Internal notes about this upsell rule">
            <uui-textarea
              slot="editor"
              .value=${this._upsell?.description ?? ""}
              @input=${(e: Event) => this._handleInputChange("description", (e.target as HTMLTextAreaElement).value || null)}
              label="Description"
              placeholder="Optional internal description"
            ></uui-textarea>
          </umb-property-layout>
        </div>
      </uui-box>

      <uui-box headline="Customer-Facing Content">
        <div class="form-grid">
          <umb-property-layout
            label="Heading"
            description="Customer-facing heading shown with recommendations"
            ?mandatory=${true}
            ?invalid=${this._validationErrors.has("heading")}>
            <uui-input
              slot="editor"
              .value=${this._upsell?.heading ?? ""}
              @input=${(e: Event) => this._handleInputChange("heading", (e.target as HTMLInputElement).value)}
              label="Heading"
              placeholder="e.g. Complete your bedroom"
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout label="Message" description="Optional customer-facing message">
            <uui-textarea
              slot="editor"
              .value=${this._upsell?.message ?? ""}
              @input=${(e: Event) => this._handleInputChange("message", (e.target as HTMLTextAreaElement).value || null)}
              label="Message"
              placeholder="e.g. Don't forget your pillows!"
            ></uui-textarea>
          </umb-property-layout>

          <umb-property-layout label="Priority" description="Lower number = higher priority (default 1000)">
            <uui-input
              slot="editor"
              type="number"
              .value=${String(this._upsell?.priority ?? 1000)}
              @input=${(e: Event) => this._handleInputChange("priority", parseInt((e.target as HTMLInputElement).value) || 1000)}
              label="Priority"
            ></uui-input>
          </umb-property-layout>
        </div>
      </uui-box>
    `;
  }

  private _renderRulesTab(): unknown {
    return html`
      <uui-box headline="WHEN basket contains (Trigger Rules)">
        <p class="rule-description">Define what must be in the customer's basket for this upsell to activate. Multiple triggers use OR logic.</p>
        <merchello-upsell-trigger-rule-builder
          .rules=${this._triggerRules}
          @rules-change=${this._handleTriggerRulesChange}
        ></merchello-upsell-trigger-rule-builder>
      </uui-box>

      <uui-box headline="THEN recommend (Recommendation Rules)">
        <p class="rule-description">Define which products to recommend when triggers match. Products from all rules form a combined pool.</p>
        <merchello-upsell-recommendation-rule-builder
          .rules=${this._recommendationRules}
          @rules-change=${this._handleRecommendationRulesChange}
        ></merchello-upsell-recommendation-rule-builder>
      </uui-box>
    `;
  }

  private _renderDisplayTab(): unknown {
    const loc = this._upsell?.displayLocation ?? UpsellDisplayLocation.Checkout;

    return html`
      <uui-box headline="Display Locations">
        <p class="rule-description">Choose where this upsell should appear.</p>
        <div class="checkbox-group">
          <uui-checkbox
            label="Checkout"
            .checked=${!!(loc & UpsellDisplayLocation.Checkout)}
            @change=${(e: Event) => this._toggleDisplayLocation(UpsellDisplayLocation.Checkout, (e.target as HTMLInputElement).checked)}
          >Checkout</uui-checkbox>
          <uui-checkbox
            label="Basket"
            .checked=${!!(loc & UpsellDisplayLocation.Basket)}
            @change=${(e: Event) => this._toggleDisplayLocation(UpsellDisplayLocation.Basket, (e.target as HTMLInputElement).checked)}
          >Basket</uui-checkbox>
          <uui-checkbox
            label="Product Page"
            .checked=${!!(loc & UpsellDisplayLocation.ProductPage)}
            @change=${(e: Event) => this._toggleDisplayLocation(UpsellDisplayLocation.ProductPage, (e.target as HTMLInputElement).checked)}
          >Product Page</uui-checkbox>
          <uui-checkbox
            label="Email"
            .checked=${!!(loc & UpsellDisplayLocation.Email)}
            @change=${(e: Event) => this._toggleDisplayLocation(UpsellDisplayLocation.Email, (e.target as HTMLInputElement).checked)}
          >Email</uui-checkbox>
          <uui-checkbox
            label="Confirmation"
            .checked=${!!(loc & UpsellDisplayLocation.Confirmation)}
            @change=${(e: Event) => this._toggleDisplayLocation(UpsellDisplayLocation.Confirmation, (e.target as HTMLInputElement).checked)}
          >Confirmation</uui-checkbox>
        </div>
      </uui-box>

      ${(loc & UpsellDisplayLocation.Checkout)
        ? html`
          <uui-box headline="Checkout Mode">
            <umb-property-layout label="Display mode" description="How the upsell appears during checkout">
              <uui-select
                slot="editor"
                label="Checkout mode"
                .options=${[
                  { name: "Inline", value: CheckoutUpsellMode.Inline, selected: this._upsell?.checkoutMode === CheckoutUpsellMode.Inline },
                  { name: "Interstitial", value: CheckoutUpsellMode.Interstitial, selected: this._upsell?.checkoutMode === CheckoutUpsellMode.Interstitial },
                  { name: "Order Bump", value: CheckoutUpsellMode.OrderBump, selected: this._upsell?.checkoutMode === CheckoutUpsellMode.OrderBump },
                  { name: "Post-Purchase", value: CheckoutUpsellMode.PostPurchase, selected: this._upsell?.checkoutMode === CheckoutUpsellMode.PostPurchase },
                ]}
                @change=${(e: Event) => this._handleInputChange("checkoutMode", (e.target as HTMLSelectElement).value)}
              ></uui-select>
            </umb-property-layout>
          </uui-box>
        `
        : nothing}

      <uui-box headline="Product Display">
        <div class="form-grid">
          <umb-property-layout label="Sort by" description="How recommended products are ordered">
            <uui-select
              slot="editor"
              label="Sort by"
              .options=${[
                { name: "Best Seller", value: UpsellSortBy.BestSeller, selected: this._upsell?.sortBy === UpsellSortBy.BestSeller },
                { name: "Price: Low to High", value: UpsellSortBy.PriceLowToHigh, selected: this._upsell?.sortBy === UpsellSortBy.PriceLowToHigh },
                { name: "Price: High to Low", value: UpsellSortBy.PriceHighToLow, selected: this._upsell?.sortBy === UpsellSortBy.PriceHighToLow },
                { name: "Name", value: UpsellSortBy.Name, selected: this._upsell?.sortBy === UpsellSortBy.Name },
                { name: "Date Added", value: UpsellSortBy.DateAdded, selected: this._upsell?.sortBy === UpsellSortBy.DateAdded },
                { name: "Random", value: UpsellSortBy.Random, selected: this._upsell?.sortBy === UpsellSortBy.Random },
              ]}
              @change=${(e: Event) => this._handleInputChange("sortBy", (e.target as HTMLSelectElement).value)}
            ></uui-select>
          </umb-property-layout>

          <umb-property-layout label="Max products" description="Maximum products to show (default 4)">
            <uui-input
              slot="editor"
              type="number"
              .value=${String(this._upsell?.maxProducts ?? 4)}
              @input=${(e: Event) => this._handleInputChange("maxProducts", parseInt((e.target as HTMLInputElement).value) || 4)}
              label="Max products"
              min="1"
              max="20"
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout label="Suppress if in cart" description="Don't show products already in the basket">
            <uui-toggle
              slot="editor"
              .checked=${this._upsell?.suppressIfInCart ?? true}
              @change=${(e: Event) => this._handleInputChange("suppressIfInCart", (e.target as HTMLInputElement).checked)}
              label="Suppress if in cart"
            ></uui-toggle>
          </umb-property-layout>
        </div>
      </uui-box>
    `;
  }

  private _toggleDisplayLocation(flag: number, checked: boolean): void {
    const current = this._upsell?.displayLocation ?? 0;
    const newValue = checked ? (current | flag) : (current & ~flag);
    this._handleInputChange("displayLocation", newValue);
  }

  private _renderEligibilityTab(): unknown {
    return html`
      <uui-box headline="Eligibility">
        <p class="rule-description">Choose who can see this upsell.</p>
        <merchello-upsell-eligibility-rule-builder
          .rules=${this._eligibilityRules}
          @rules-change=${this._handleEligibilityRulesChange}
        ></merchello-upsell-eligibility-rule-builder>
      </uui-box>
    `;
  }

  private _renderScheduleTab(): unknown {
    return html`
      <uui-box headline="Schedule">
        <div class="form-grid">
          <umb-property-layout label="Starts at" description="When this upsell becomes active">
            <uui-input
              slot="editor"
              type="datetime-local"
              .value=${this._upsell?.startsAt ? this._upsell.startsAt.substring(0, 16) : ""}
              @input=${(e: Event) => {
                const val = (e.target as HTMLInputElement).value;
                this._handleInputChange("startsAt", val ? new Date(val).toISOString() : null);
              }}
              label="Starts at"
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout label="Ends at" description="When this upsell expires (optional)">
            <uui-input
              slot="editor"
              type="datetime-local"
              .value=${this._upsell?.endsAt ? this._upsell.endsAt.substring(0, 16) : ""}
              @input=${(e: Event) => {
                const val = (e.target as HTMLInputElement).value;
                this._handleInputChange("endsAt", val ? new Date(val).toISOString() : null);
              }}
              label="Ends at"
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout label="Timezone" description="Timezone for display purposes">
            <uui-input
              slot="editor"
              .value=${this._upsell?.timezone ?? ""}
              @input=${(e: Event) => this._handleInputChange("timezone", (e.target as HTMLInputElement).value || null)}
              label="Timezone"
              placeholder="e.g. Europe/London"
            ></uui-input>
          </umb-property-layout>
        </div>
      </uui-box>
    `;
  }

  private async _loadPerformance(): Promise<void> {
    if (!this._upsell?.id || this._performanceLoading) return;
    this._performanceLoading = true;
    this._performanceError = undefined;

    const { data, error } = await MerchelloApi.getUpsellPerformance(this._upsell.id);
    this._performanceLoading = false;

    if (error) {
      this._performanceError = error.message;
      return;
    }
    this._performance = data ?? undefined;
  }

  private _renderPerformanceTab(): unknown {
    // Load data on first view
    if (!this._performance && !this._performanceLoading && !this._performanceError && this._upsell?.id) {
      this._loadPerformance();
    }

    if (this._performanceLoading) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    if (this._performanceError) {
      return html`
        <uui-box headline="Performance">
          <p style="color: var(--uui-color-danger)">${this._performanceError}</p>
          <uui-button look="secondary" label="Retry" @click=${this._loadPerformance}>Retry</uui-button>
        </uui-box>
      `;
    }

    const p = this._performance;
    if (!p || (p.totalImpressions === 0 && p.totalClicks === 0 && p.totalConversions === 0)) {
      return html`
        <uui-box headline="Performance">
          <p class="rule-description">No analytics data recorded yet. Performance metrics will appear here once the upsell has been active and customers have interacted with it.</p>
        </uui-box>
      `;
    }

    return html`
      <div class="perf-stats-grid">
        <uui-box headline="Impressions">
          <div class="stat-value">${formatNumber(p.totalImpressions)}</div>
          <div class="stat-label">Total views</div>
        </uui-box>
        <uui-box headline="Clicks">
          <div class="stat-value">${formatNumber(p.totalClicks)}</div>
          <div class="stat-label">CTR: ${formatPercent(p.clickThroughRate)}</div>
        </uui-box>
        <uui-box headline="Conversions">
          <div class="stat-value">${formatNumber(p.totalConversions)}</div>
          <div class="stat-label">Rate: ${formatPercent(p.conversionRate)}</div>
        </uui-box>
        <uui-box headline="Revenue">
          <div class="stat-value">${formatCurrency(p.totalRevenue)}</div>
          <div class="stat-label">Avg: ${formatCurrency(p.averageOrderValue)}</div>
        </uui-box>
      </div>

      <uui-box headline="Additional Metrics">
        <div class="metrics-list">
          <div class="metric-row">
            <span class="metric-label">Unique customers</span>
            <span class="metric-value">${formatNumber(p.uniqueCustomersCount)}</span>
          </div>
          ${p.firstImpression ? html`
            <div class="metric-row">
              <span class="metric-label">First impression</span>
              <span class="metric-value">${new Date(p.firstImpression).toLocaleDateString()}</span>
            </div>
          ` : nothing}
          ${p.lastConversion ? html`
            <div class="metric-row">
              <span class="metric-label">Last conversion</span>
              <span class="metric-value">${new Date(p.lastConversion).toLocaleDateString()}</span>
            </div>
          ` : nothing}
        </div>
      </uui-box>

      ${p.eventsByDate.length > 0 ? html`
        <uui-box headline="Daily Breakdown">
          <div class="events-table-wrapper">
            <table class="events-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>Conversions</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${p.eventsByDate.map(
                  (row) => html`
                    <tr>
                      <td>${new Date(row.date).toLocaleDateString()}</td>
                      <td>${formatNumber(row.impressions)}</td>
                      <td>${formatNumber(row.clicks)}</td>
                      <td>${formatNumber(row.conversions)}</td>
                      <td>${formatCurrency(row.revenue)}</td>
                    </tr>
                  `
                )}
              </tbody>
            </table>
          </div>
        </uui-box>
      ` : nothing}
    `;
  }

  private _renderTabs(): unknown {
    const activeTab = this._getActiveTab();

    return html`
      <uui-tab-group slot="header">
        <uui-tab label="Details" href="${this._routerPath}/tab/details" ?active=${activeTab === "details"}>Details</uui-tab>
        <uui-tab label="Rules" href="${this._routerPath}/tab/rules" ?active=${activeTab === "rules"}>Rules</uui-tab>
        <uui-tab label="Display" href="${this._routerPath}/tab/display" ?active=${activeTab === "display"}>Display</uui-tab>
        <uui-tab label="Eligibility" href="${this._routerPath}/tab/eligibility" ?active=${activeTab === "eligibility"}>Eligibility</uui-tab>
        <uui-tab label="Schedule" href="${this._routerPath}/tab/schedule" ?active=${activeTab === "schedule"}>Schedule</uui-tab>
        ${!this._isNew
          ? html`<uui-tab label="Performance" href="${this._routerPath}/tab/performance" ?active=${activeTab === "performance"}>Performance</uui-tab>`
          : nothing}
      </uui-tab-group>
    `;
  }

  private _renderActiveTabContent(): unknown {
    const activeTab = this._getActiveTab();

    return html`
      ${activeTab === "details" ? this._renderDetailsTab() : nothing}
      ${activeTab === "rules" ? this._renderRulesTab() : nothing}
      ${activeTab === "display" ? this._renderDisplayTab() : nothing}
      ${activeTab === "eligibility" ? this._renderEligibilityTab() : nothing}
      ${activeTab === "schedule" ? this._renderScheduleTab() : nothing}
      ${activeTab === "performance" && !this._isNew ? this._renderPerformanceTab() : nothing}
    `;
  }

  override render() {
    if (this._isLoading) {
      return html`
        <umb-body-layout>
          <div class="loading"><uui-loader></uui-loader></div>
        </umb-body-layout>
      `;
    }

    const statusLabel = this._upsell?.statusLabel ?? "";
    const statusColor = this._upsell?.statusColor ?? "default";

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <uui-button slot="header" compact href=${getUpsellsListHref()} label="Back to Upsells" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <div id="header" slot="header">
          <umb-icon name="icon-trending-up"></umb-icon>
          <span class="headline">${this._getHeadline()}</span>
          ${!this._isNew && this._upsell
            ? html`<uui-tag look="secondary" color=${statusColor}>${statusLabel}</uui-tag>`
            : nothing}
        </div>

        ${!this._isNew
          ? html`
              <div slot="header" class="header-actions">
                ${this._upsell?.status === UpsellStatus.Active
                  ? html`<uui-button look="secondary" color="warning" label="Deactivate" @click=${this._handleDeactivate}>Deactivate</uui-button>`
                  : html`<uui-button look="secondary" color="positive" label="Activate" @click=${this._handleActivate}>Activate</uui-button>`}
                <uui-button look="secondary" color="danger" label="Delete" @click=${this._handleDelete}>Delete</uui-button>
              </div>
            `
          : nothing}

        <umb-body-layout header-fit-height header-no-padding>
          ${this._renderTabs()}

          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          <div class="detail-layout">
            <div class="main-content">
              <div class="tab-content">
                ${this._renderActiveTabContent()}
              </div>
            </div>
          </div>
        </umb-body-layout>

        <umb-footer-layout slot="footer">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            label=${this._isNew ? "Create" : "Save"}
            ?disabled=${this._isSaving}
            @click=${this._handleSave}
          >
            ${this._isSaving
              ? this._isNew ? "Creating..." : "Saving..."
              : this._isNew ? "Create" : "Save"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
      height: 100%;
      --uui-tab-background: var(--uui-color-surface);
    }

    .back-button {
      margin-right: var(--uui-size-space-2);
    }

    umb-router-slot {
      display: none;
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

    .headline {
      font-size: var(--uui-type-h4-size);
      font-weight: 700;
    }

    .header-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
      padding: var(--uui-size-space-4) 0;
    }

    .detail-layout {
      display: flex;
      gap: var(--uui-size-layout-1);
      padding: var(--uui-size-layout-1);
    }

    .main-content {
      flex: 1;
      min-width: 0;
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .checkbox-group {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-4);
    }

    .rule-description {
      color: var(--uui-color-text-alt);
      font-size: 0.9em;
      margin-top: 0;
      margin-bottom: var(--uui-size-space-4);
    }

    uui-input,
    uui-textarea,
    uui-select {
      width: 100%;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .perf-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--uui-size-layout-1);
    }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--uui-color-text);
      margin-bottom: var(--uui-size-space-1);
    }

    .stat-label {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .metrics-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-2) 0;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .metric-row:last-child {
      border-bottom: none;
    }

    .metric-label {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .metric-value {
      font-weight: 600;
    }

    .events-table-wrapper {
      overflow-x: auto;
    }

    .events-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--uui-type-small-size);
    }

    .events-table th,
    .events-table td {
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      text-align: left;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .events-table th {
      font-weight: 600;
      color: var(--uui-color-text-alt);
      white-space: nowrap;
    }

    .events-table tbody tr:hover {
      background: var(--uui-color-surface-alt);
    }
  `;
}

export default MerchelloUpsellDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-upsell-detail": MerchelloUpsellDetailElement;
  }
}
