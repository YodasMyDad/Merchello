import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { VariantWarehouseStockDto } from "@products/types/product.types.js";

export interface StockSettingsChangeDetail {
  warehouseId: string;
  stock?: number;
  reorderPoint?: number | null;
  trackStock?: boolean;
}

/**
 * Shared component for displaying and editing variant stock settings.
 * Used by both product-detail (single-variant mode) and variant-detail.
 *
 * @fires stock-settings-change - Fired when any stock setting changes
 */
@customElement("merchello-variant-stock-display")
export class MerchelloVariantStockDisplayElement extends UmbElementMixin(LitElement) {
  @property({ type: Array }) warehouseStock: VariantWarehouseStockDto[] = [];

  private _emitChange(detail: StockSettingsChangeDetail): void {
    this.dispatchEvent(
      new CustomEvent("stock-settings-change", {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleStockChange(warehouseId: string, value: string): void {
    const stock = parseInt(value, 10);
    if (!isNaN(stock) && stock >= 0) {
      this._emitChange({ warehouseId, stock });
    }
  }

  private _handleReorderPointChange(warehouseId: string, value: string): void {
    const reorderPoint = value === "" ? null : parseInt(value, 10);
    if (reorderPoint === null || (!isNaN(reorderPoint) && reorderPoint >= 0)) {
      this._emitChange({ warehouseId, reorderPoint });
    }
  }

  private _handleTrackStockChange(warehouseId: string, trackStock: boolean): void {
    this._emitChange({ warehouseId, trackStock });
  }

  render() {
    const totalStock = this.warehouseStock.reduce((sum, ws) => sum + ws.stock, 0);

    return html`
      <uui-box class="info-banner">
        <div class="info-content">
          <uui-icon name="icon-info"></uui-icon>
          <div>
            <strong>Stock Management</strong>
            <p>Manage stock levels per warehouse. Set reorder points to receive alerts when stock runs low. Disable "Track Stock" for unlimited availability.</p>
          </div>
        </div>
      </uui-box>

      <uui-box headline="Warehouse Stock">
        ${this.warehouseStock.length > 0
          ? html`
              <div class="stock-summary">
                <strong>Total Stock:</strong> ${totalStock} units
              </div>
              <div class="table-container">
                <uui-table>
                  <uui-table-head>
                    <uui-table-head-cell>Warehouse</uui-table-head-cell>
                    <uui-table-head-cell>Available</uui-table-head-cell>
                    <uui-table-head-cell>Reorder Point</uui-table-head-cell>
                    <uui-table-head-cell>Track Stock</uui-table-head-cell>
                  </uui-table-head>
                  ${this.warehouseStock.map(
                    (ws) => html`
                      <uui-table-row>
                        <uui-table-cell><strong>${ws.warehouseName}</strong></uui-table-cell>
                        <uui-table-cell>
                          <uui-input
                            type="number"
                            min="0"
                            class="stock-input"
                            .value=${String(ws.stock)}
                            ?disabled=${!ws.trackStock}
                            @change=${(e: Event) => this._handleStockChange(ws.warehouseId, (e.target as HTMLInputElement).value)}>
                          </uui-input>
                        </uui-table-cell>
                        <uui-table-cell>
                          <uui-input
                            type="number"
                            min="0"
                            class="stock-input"
                            placeholder="Not set"
                            .value=${ws.reorderPoint != null ? String(ws.reorderPoint) : ""}
                            ?disabled=${!ws.trackStock}
                            @change=${(e: Event) => this._handleReorderPointChange(ws.warehouseId, (e.target as HTMLInputElement).value)}>
                          </uui-input>
                        </uui-table-cell>
                        <uui-table-cell>
                          <uui-toggle
                            .checked=${ws.trackStock}
                            @change=${(e: Event) => this._handleTrackStockChange(ws.warehouseId, (e.target as HTMLInputElement).checked)}>
                          </uui-toggle>
                        </uui-table-cell>
                      </uui-table-row>
                    `
                  )}
                </uui-table>
              </div>
            `
          : html`
              <div class="empty-state">
                <uui-icon name="icon-box"></uui-icon>
                <p>No warehouses assigned to this product</p>
                <p class="hint">Assign warehouses in the Details tab</p>
              </div>
            `}
      </uui-box>
    `;
  }

  static styles = [
    css`
      :host {
        display: contents;
      }

      uui-box {
        --uui-box-default-padding: var(--uui-size-space-5);
      }

      uui-box + uui-box {
        margin-top: var(--uui-size-space-5);
      }

      .info-banner {
        background: var(--uui-color-surface-alt);
        border-left: 4px solid var(--uui-color-current);
      }

      .info-content {
        display: flex;
        gap: var(--uui-size-space-4);
        align-items: flex-start;
      }

      .info-content uui-icon {
        font-size: 24px;
        color: var(--uui-color-current);
        flex-shrink: 0;
      }

      .info-content p {
        margin: var(--uui-size-space-2) 0 0;
        color: var(--uui-color-text-alt);
      }

      .stock-summary {
        margin-bottom: var(--uui-size-space-4);
        padding: var(--uui-size-space-3);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
      }

      .table-container {
        overflow-x: auto;
      }

      .stock-input {
        width: 100px;
      }

      uui-table-cell uui-toggle {
        margin: 0;
      }

      .empty-state {
        text-align: center;
        padding: var(--uui-size-space-6);
        color: var(--uui-color-text-alt);
      }

      .empty-state uui-icon {
        font-size: 48px;
        opacity: 0.5;
      }

      .empty-state p {
        margin: var(--uui-size-space-3) 0 0;
      }

      .empty-state .hint {
        font-size: 0.875rem;
        opacity: 0.8;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-variant-stock-display": MerchelloVariantStockDisplayElement;
  }
}
