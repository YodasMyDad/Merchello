import { LitElement, css, html, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { WarehouseListDto } from "@warehouses/types/warehouses.types.js";
import {
  getSelectedWarehouseSetupSummary,
  getWarehouseSetupState,
} from "@products/utils/warehouse-setup.js";
import { getWarehouseDetailHref } from "@shared/utils/navigation.js";

export interface WarehouseSelectionChangeDetail {
  warehouseId: string;
  checked: boolean;
}

@customElement("merchello-product-warehouse-selector")
export class MerchelloProductWarehouseSelectorElement extends UmbElementMixin(LitElement) {
  @property({ type: Array }) warehouses: WarehouseListDto[] = [];
  @property({ type: Array }) selectedWarehouseIds: string[] = [];
  @property({ type: Boolean }) showConfigureLinks = false;

  private _isSelected(warehouseId: string): boolean {
    return this.selectedWarehouseIds.includes(warehouseId);
  }

  private _emitSelectionChange(warehouseId: string, checked: boolean): void {
    this.dispatchEvent(
      new CustomEvent<WarehouseSelectionChangeDetail>("warehouse-selection-change", {
        detail: { warehouseId, checked },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleToggleChange(warehouseId: string, e: Event): void {
    const target = e.target as { checked?: boolean } | null;
    this._emitSelectionChange(warehouseId, Boolean(target?.checked));
  }

  private _renderSummary(): unknown {
    const summary = getSelectedWarehouseSetupSummary(this.warehouses, this.selectedWarehouseIds);

    return html`
      <div class="selection-summary" role="status" aria-live="polite">
        <span><strong>${summary.selectedCount}</strong> selected</span>
        ${summary.selectedCount === 0
          ? html`<span>Select at least one warehouse for physical products</span>`
          : summary.selectedNeedsSetupCount > 0
          ? html`<span class="summary-warning">
              <uui-icon name="icon-alert"></uui-icon>
              ${summary.selectedNeedsSetupCount} selected warehouse${summary.selectedNeedsSetupCount === 1 ? "" : "s"} need setup
            </span>`
          : html`<span class="summary-ok">
              <uui-icon name="icon-check"></uui-icon>
              Selected warehouses are configured
            </span>`}
        ${summary.missingSelectedIdsCount > 0
          ? html`<span class="summary-warning">
              <uui-icon name="icon-alert"></uui-icon>
              ${summary.missingSelectedIdsCount} selected warehouse reference${summary.missingSelectedIdsCount === 1 ? "" : "s"} no longer exist
            </span>`
          : nothing}
      </div>
    `;
  }

  private _renderWarehouseRow(warehouse: WarehouseListDto): unknown {
    const warehouseName = warehouse.name || "Unnamed Warehouse";
    const isSelected = this._isSelected(warehouse.id);
    const setupState = getWarehouseSetupState(warehouse);
    const code = warehouse.code ? ` (${warehouse.code})` : "";
    const address = warehouse.addressSummary || "No address summary";
    const serviceRegionCount = warehouse.serviceRegionCount ?? 0;
    const shippingOptionCount = warehouse.shippingOptionCount ?? 0;

    return html`
      <div class="warehouse-row ${isSelected ? "selected" : ""} ${setupState.needsSetup ? "warning" : ""}">
        <div class="toggle-column">
          <uui-toggle
            label="Select ${warehouseName}"
            .checked=${isSelected}
            @change=${(e: Event) => this._handleToggleChange(warehouse.id, e)}>
          </uui-toggle>
        </div>

        <div class="warehouse-content">
          <div class="warehouse-header">
            <div class="warehouse-title">
              <span class="name">${warehouseName}${code}</span>
            </div>
            ${this.showConfigureLinks
              ? html`
                  <a class="configure-link" href=${getWarehouseDetailHref(warehouse.id)}>
                    Configure
                  </a>
                `
              : nothing}
          </div>

          <div class="warehouse-meta">
            <span>Regions: <strong>${serviceRegionCount}</strong></span>
            <span>Shipping options: <strong>${shippingOptionCount}</strong></span>
            <span>Address: ${address}</span>
          </div>

          ${setupState.warningMessage
            ? html`
                <div class="setup-warning" role="status">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${setupState.warningMessage}</span>
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  override render() {
    if (this.warehouses.length === 0) {
      return html`<p class="empty-state">No warehouses available. Create a warehouse first.</p>`;
    }

    return html`
      <div class="warehouse-selector">
        ${this._renderSummary()}
        <div class="warehouse-list">
          ${this.warehouses.map((warehouse) => this._renderWarehouseRow(warehouse))}
        </div>
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .warehouse-selector {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .selection-summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
      font-size: 0.8125rem;
      color: var(--uui-color-text);
    }

    .summary-warning,
    .summary-ok {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
    }

    .summary-warning {
      color: var(--uui-color-warning-emphasis);
    }

    .summary-ok {
      color: var(--uui-color-positive);
    }

    .warehouse-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .warehouse-row {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--uui-size-space-3);
      align-items: flex-start;
      padding: var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
    }

    .warehouse-row.selected {
      border-color: var(--uui-color-selected);
    }

    .warehouse-row.warning {
      border-color: var(--uui-color-warning);
      background: color-mix(in srgb, var(--uui-color-warning) 5%, var(--uui-color-surface));
    }

    .toggle-column {
      padding-top: 2px;
    }

    .warehouse-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      min-width: 0;
    }

    .warehouse-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .warehouse-title {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      min-width: 0;
    }

    .name {
      font-weight: 600;
      color: var(--uui-color-text);
      overflow-wrap: anywhere;
    }

    .configure-link {
      font-size: 0.8125rem;
      color: var(--uui-color-interactive);
      text-decoration: none;
      white-space: nowrap;
    }

    .configure-link:hover {
      text-decoration: underline;
    }

    .warehouse-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2) var(--uui-size-space-4);
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .setup-warning {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.8125rem;
      color: var(--uui-color-warning-emphasis);
    }

    .empty-state {
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    @media (max-width: 720px) {
      .warehouse-row {
        grid-template-columns: 1fr;
      }

      .toggle-column {
        padding-top: 0;
      }
    }
  `;
}

export default MerchelloProductWarehouseSelectorElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-warehouse-selector": MerchelloProductWarehouseSelectorElement;
  }
}
