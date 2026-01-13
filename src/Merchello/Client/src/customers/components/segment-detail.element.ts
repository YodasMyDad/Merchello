import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { UmbRoute, UmbRouterSlotInitEvent, UmbRouterSlotChangeEvent } from "@umbraco-cms/backoffice/router";
import type {
  CustomerSegmentDetailDto,
  CustomerSegmentType,
  SegmentMatchMode,
  SegmentCriteriaDto,
  CreateCustomerSegmentDto,
  UpdateCustomerSegmentDto,
} from "@customers/types/segment.types.js";
import type { MerchelloCustomersWorkspaceContext } from "../contexts/customers-workspace.context.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getSegmentsListHref, navigateToSegmentDetail } from "@shared/utils/navigation.js";
import "./segment-members-table.element.js";
import "./segment-criteria-builder.element.js";
import "./segment-preview.element.js";

// Stub component for router (actual content is rendered in tab methods)
function stubComponent(): HTMLElement {
  return document.createElement("div");
}

@customElement("merchello-segment-detail")
export class MerchelloSegmentDetailElement extends UmbElementMixin(LitElement) {
  @state() private _segment: CustomerSegmentDetailDto | undefined;
  @state() private _formData: Partial<CustomerSegmentDetailDto> = {};
  @state() private _isSaving = false;
  @state() private _activePath = "tab/details";
  @state() private _routerPath = "";
  @state() private _fieldErrors: Record<string, string> = {};
  @state() private _isNew = true;

  #workspaceContext?: MerchelloCustomersWorkspaceContext;
  #notificationContext?: UmbNotificationContext;

  private _routes: UmbRoute[] = [
    { path: "tab/details", component: stubComponent },
    { path: "tab/preview", component: stubComponent },
    { path: "", redirectTo: "tab/details" },
  ];

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloCustomersWorkspaceContext;
      if (!this.#workspaceContext) return;
      this._isNew = this.#workspaceContext.isNew;
      this.observe(this.#workspaceContext.segment, (segment) => {
        this._segment = segment;
        // Update isNew state reactively when segment changes
        this._isNew = this.#workspaceContext?.isNew ?? true;
        if (segment) {
          this._formData = { ...segment };
        }
      }, '_segment');
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  private _handleNameChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this._formData = { ...this._formData, name: input.value };
    this._clearFieldError("name");
  }

  private _handleDescriptionChange(e: Event): void {
    const textarea = e.target as HTMLTextAreaElement;
    this._formData = { ...this._formData, description: textarea.value || null };
  }

  private _handleTypeChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    const newType = select.value as CustomerSegmentType;
    this._formData = {
      ...this._formData,
      segmentType: newType,
      // Clear criteria if switching to manual
      criteria: newType === "Manual" ? null : this._formData.criteria,
    };
  }

  private _handleMatchModeChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this._formData = { ...this._formData, matchMode: select.value as SegmentMatchMode };
  }

  private _handleActiveChange(e: Event): void {
    const toggle = e.target as HTMLInputElement;
    this._formData = { ...this._formData, isActive: toggle.checked };
  }

  private _handleCriteriaChanged(e: CustomEvent<{ criteria: SegmentCriteriaDto[] }>): void {
    this._formData = { ...this._formData, criteria: e.detail.criteria };
  }

  private _onRouterInit(event: UmbRouterSlotInitEvent): void {
    this._routerPath = event.target.absoluteRouterPath ?? "";
  }

  private _onRouterChange(event: UmbRouterSlotChangeEvent): void {
    this._activePath = event.target.localActiveViewPath || "";
  }

  private _clearFieldError(field: string): void {
    if (this._fieldErrors[field]) {
      const { [field]: _, ...rest } = this._fieldErrors;
      this._fieldErrors = rest;
    }
  }

  private _validate(): boolean {
    const errors: Record<string, string> = {};

    if (!this._formData.name?.trim()) {
      errors.name = "Name is required";
    }

    if (this._formData.segmentType === "Automated") {
      if (!this._formData.criteria || this._formData.criteria.length === 0) {
        errors.criteria = "At least one criterion is required for automated segments";
      }
    }

    this._fieldErrors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _handleSave(): Promise<void> {
    if (!this._validate()) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation error", message: "Please fix the errors before saving." }
      });
      return;
    }

    this._isSaving = true;

    try {
      if (this._isNew) {
        const createDto: CreateCustomerSegmentDto = {
          name: this._formData.name!,
          description: this._formData.description,
          segmentType: this._formData.segmentType!,
          criteria: this._formData.criteria,
          matchMode: this._formData.matchMode,
        };

        const { data, error } = await MerchelloApi.createCustomerSegment(createDto);

        if (error) {
          this.#notificationContext?.peek("danger", {
            data: { headline: "Create failed", message: error.message }
          });
          return;
        }

        if (data) {
          this.#workspaceContext?.updateSegment(data);
          this.#notificationContext?.peek("positive", {
            data: { headline: "Segment created", message: `"${data.name}" has been created.` }
          });
          // Navigate to edit URL after create
          navigateToSegmentDetail(data.id);
        }
      } else {
        const updateDto: UpdateCustomerSegmentDto = {
          name: this._formData.name,
          description: this._formData.description,
          criteria: this._formData.criteria,
          matchMode: this._formData.matchMode,
          isActive: this._formData.isActive,
        };

        const { data, error } = await MerchelloApi.updateCustomerSegment(this._segment!.id, updateDto);

        if (error) {
          this.#notificationContext?.peek("danger", {
            data: { headline: "Update failed", message: error.message }
          });
          return;
        }

        if (data) {
          this.#workspaceContext?.updateSegment(data);
          this.#notificationContext?.peek("positive", {
            data: { headline: "Segment saved", message: "Changes have been saved." }
          });
        }
      }
    } finally {
      this._isSaving = false;
    }
  }

  private _hasDetailsErrors(): boolean {
    return !!this._fieldErrors.name || !!this._fieldErrors.criteria;
  }

  private _renderTabs() {
    const isAutomated = this._formData.segmentType === "Automated";

    return html`
      <uui-tab-group slot="header">
        <uui-tab
          label="Details"
          href="${this._routerPath}/tab/details"
          ?active=${this._activePath.includes("tab/details")}>
          Details
          ${this._hasDetailsErrors() ? html`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : nothing}
        </uui-tab>
        ${isAutomated && !this._isNew ? html`
          <uui-tab
            label="Preview"
            href="${this._routerPath}/tab/preview"
            ?active=${this._activePath.includes("tab/preview")}>
            Preview
          </uui-tab>
        ` : nothing}
      </uui-tab-group>
    `;
  }

  private _renderActiveTabContent() {
    if (this._activePath.includes("tab/preview")) {
      return this._renderPreviewTab();
    }
    return this._renderDetailsTab();
  }

  private _renderDetailsTab() {
    return html`
      <uui-box headline="Basic Information">
        <umb-property-layout label="Description" description="Optional description for this segment">
          <uui-textarea
            slot="editor"
            .value=${this._formData.description || ""}
            @input=${this._handleDescriptionChange}
            placeholder="Describe the purpose of this segment...">
          </uui-textarea>
        </umb-property-layout>

        <umb-property-layout
          label="Segment Type"
          description="Manual segments let you hand-pick specific customers (e.g., VIPs, beta testers). Automated segments automatically include customers based on criteria rules."
          ?mandatory=${this._isNew}>
          <uui-select
            slot="editor"
            .options=${[
              { name: "Manual", value: "Manual", selected: this._formData.segmentType === "Manual" },
              { name: "Automated", value: "Automated", selected: this._formData.segmentType === "Automated" },
            ]}
            @change=${this._handleTypeChange}
            ?disabled=${!this._isNew}>
          </uui-select>
        </umb-property-layout>

        ${this._formData.segmentType === "Manual" && this._isNew ? html`
          <div class="helper-text">
            After saving, you'll be able to add customers to this segment below.
          </div>
        ` : nothing}

        ${this._formData.segmentType === "Automated" ? html`
          <umb-property-layout
            label="Match Mode"
            description="How criteria rules are combined">
            <uui-select
              slot="editor"
              .options=${[
                { name: "All conditions (AND)", value: "All", selected: this._formData.matchMode === "All" },
                { name: "Any condition (OR)", value: "Any", selected: this._formData.matchMode === "Any" },
              ]}
              @change=${this._handleMatchModeChange}>
            </uui-select>
          </umb-property-layout>
        ` : nothing}
      </uui-box>

      ${this._formData.segmentType === "Automated" ? html`
        <merchello-segment-criteria-builder
          .criteria=${this._formData.criteria || []}
          .matchMode=${this._formData.matchMode || "All"}
          @criteria-changed=${this._handleCriteriaChanged}>
        </merchello-segment-criteria-builder>
        ${this._fieldErrors.criteria ? html`
          <div class="error-message">${this._fieldErrors.criteria}</div>
        ` : nothing}
      ` : nothing}

      ${this._formData.segmentType === "Manual" && !this._isNew && this._segment?.id ? html`
        <uui-box headline="Members (${this._segment?.memberCount ?? 0})">
          <merchello-segment-members-table
            .segmentId=${this._segment.id}
            @members-changed=${() => this.#workspaceContext?.reloadSegment()}>
          </merchello-segment-members-table>
        </uui-box>
      ` : nothing}

      <uui-box headline="Status">
        <umb-property-layout label="Active" description="Inactive segments are not evaluated for membership">
          <uui-toggle
            slot="editor"
            .checked=${this._formData.isActive ?? true}
            @change=${this._handleActiveChange}>
          </uui-toggle>
        </umb-property-layout>
      </uui-box>

      ${this._segment?.isSystemSegment ? html`
        <uui-box headline="System Segment">
          <p class="system-info">
            This is a system segment and cannot be deleted. Some settings may be restricted.
          </p>
        </uui-box>
      ` : nothing}
    `;
  }

  private _renderPreviewTab() {
    if (!this._segment?.id) {
      return html`<p>Save the segment first to preview matching customers.</p>`;
    }
    return html`
      <merchello-segment-preview .segmentId=${this._segment.id}></merchello-segment-preview>
    `;
  }

  override render() {
    if (!this._segment) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Back button -->
        <uui-button slot="header" compact href=${getSegmentsListHref()} label="Back to Segments" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <!-- Header: icon + name input -->
        <div id="header" slot="header">
          <umb-icon name="icon-filter"></umb-icon>
          <uui-input
            id="name-input"
            .value=${this._formData.name || ""}
            @input=${this._handleNameChange}
            placeholder="Enter segment name..."
            ?invalid=${!!this._fieldErrors.name}>
          </uui-input>
          ${this._segment.isSystemSegment ? html`<uui-tag look="secondary">System</uui-tag>` : nothing}
        </div>

        <!-- Inner layout with tabs -->
        <umb-body-layout header-fit-height header-no-padding>
          ${this._renderTabs()}

          <!-- Router slot for URL tracking (hidden) -->
          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          <!-- Tab content -->
          <div class="tab-content">
            ${this._renderActiveTabContent()}
          </div>
        </umb-body-layout>

        <!-- Footer -->
        <umb-footer-layout slot="footer">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}>
            ${this._isSaving ? "Saving..." : this._isNew ? "Create Segment" : "Save Changes"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    css`
      :host {
        display: block;
        height: 100%;
        --uui-tab-background: var(--uui-color-surface);
      }

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

      #name-input {
        flex: 1 1 auto;
        --uui-input-border-color: transparent;
        --uui-input-background-color: transparent;
        font-size: var(--uui-type-h5-size);
        font-weight: 700;
      }

      #name-input:hover,
      #name-input:focus-within {
        --uui-input-border-color: var(--uui-color-border);
        --uui-input-background-color: var(--uui-color-surface);
      }

      #name-input[invalid] {
        --uui-input-border-color: var(--uui-color-danger);
      }

      uui-tab-group {
        --uui-tab-divider: var(--uui-color-border);
        width: 100%;
      }

      uui-tab {
        overflow: visible;
      }

      uui-tab uui-badge {
        position: relative;
        top: -2px;
      }

      umb-router-slot {
        display: none;
      }

      .tab-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
        padding: var(--uui-size-layout-1);
      }

      uui-box {
        --uui-box-default-padding: var(--uui-size-space-5);
      }

      umb-property-layout uui-select {
        width: 100%;
      }

      .helper-text {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
        margin-top: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
      }

      .system-info {
        color: var(--uui-color-text-alt);
        margin: 0;
      }

      .error-message {
        color: var(--uui-color-danger);
        font-size: var(--uui-type-small-size);
        margin-top: var(--uui-size-space-2);
      }

      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
      }
    `,
  ];
}

export default MerchelloSegmentDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-segment-detail": MerchelloSegmentDetailElement;
  }
}
