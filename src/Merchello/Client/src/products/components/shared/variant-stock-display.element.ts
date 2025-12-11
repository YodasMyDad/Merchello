import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { VariantWarehouseStockDto } from "@products/types/product.types.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";

/**
 * Shared component for displaying variant stock information (read-only).
 * Used by both product-detail (single-variant mode) and variant-detail.
 */
@customElement("merchello-variant-stock-display")
export class MerchelloVariantStockDisplayElement extends UmbElementMixin(LitElement) {
  @property({ type: Array }) warehouseStock: VariantWarehouseStockDto[] = [];

  render() {
    const totalStock = this.warehouseStock.reduce((sum, ws) => sum + ws.stock, 0);

    return html`
      <uui-box class="info-banner">
        <div class="info-content">
          <uui-icon name="icon-info"></uui-icon>
          <div>
            <strong>Stock Management</strong>
            <p>Stock levels are managed per warehouse. To adjust stock, create a shipment from the Orders section or use the Inventory management tools.</p>
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
                          <span class="badge ${ws.stock === 0 ? "badge-danger" : ws.stock < 10 ? "badge-warning" : "badge-positive"}">
                            ${ws.stock} units
                          </span>
                        </uui-table-cell>
                        <uui-table-cell>
                          <span class="stock-value">${ws.reorderPoint ?? "Not set"}</span>
                        </uui-table-cell>
                        <uui-table-cell>
                          <uui-badge color=${ws.trackStock ? "positive" : "default"}>
                            ${ws.trackStock ? "Enabled" : "Disabled"}
                          </uui-badge>
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
    badgeStyles,
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

      .stock-value {
        color: var(--uui-color-text-alt);
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
