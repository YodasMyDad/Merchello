import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import { generateCsv, downloadCsv, formatDateForCsv, type CsvColumn } from "@shared/utils/index.js";
import { formatNumber } from "@shared/utils/formatting.js";
import type { OrderExportItemDto } from "@orders/types/order.types.js";
import type { ExportModalData, ExportModalValue } from "./export-modal.token.js";

@customElement("merchello-export-modal")
export class MerchelloExportModalElement extends UmbModalBaseElement<
  ExportModalData,
  ExportModalValue
> {
  @state() private _fromDate: string = "";
  @state() private _toDate: string = "";
  @state() private _isExporting: boolean = false;
  @state() private _errorMessage: string | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    // Default to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this._toDate = this._formatDateForInput(today);
    this._fromDate = this._formatDateForInput(thirtyDaysAgo);
  }

  private _formatDateForInput(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  private async _handleExport(): Promise<void> {
    // Validate dates
    if (!this._fromDate || !this._toDate) {
      this._errorMessage = "Please select both from and to dates";
      return;
    }

    const fromDate = new Date(this._fromDate);
    const toDate = new Date(this._toDate);

    if (fromDate > toDate) {
      this._errorMessage = "From date must be before or equal to To date";
      return;
    }

    this._isExporting = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.exportOrders({
      fromDate: this._fromDate,
      toDate: this._toDate,
    });

    if (error) {
      this._errorMessage = error.message;
      this._isExporting = false;
      return;
    }

    if (!data || data.length === 0) {
      this._errorMessage = "No orders found in the selected date range";
      this._isExporting = false;
      return;
    }

    // Define CSV columns
    const columns: CsvColumn<OrderExportItemDto>[] = [
      { header: "Inv #", accessor: (item) => item.invoiceNumber },
      { header: "Inv Date", accessor: (item) => formatDateForCsv(item.invoiceDate) },
      { header: "Payment Status", accessor: (item) => item.paymentStatus },
      { header: "Billing Name", accessor: (item) => item.billingName },
      { header: "Product Sub Total", accessor: (item) => formatNumber(item.subTotal, 2) },
      { header: "Tax", accessor: (item) => formatNumber(item.tax, 2) },
      { header: "Shipping", accessor: (item) => formatNumber(item.shipping, 2) },
      { header: "Total", accessor: (item) => formatNumber(item.total, 2) },
    ];

    // Generate and download CSV
    const csvContent = generateCsv(data, columns);
    const filename = `orders-export-${this._fromDate}-to-${this._toDate}.csv`;
    downloadCsv(csvContent, filename);

    this._isExporting = false;
    this.value = { exported: true };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  override render() {
    return html`
      <umb-body-layout headline="Export Orders">
        <div id="main">
          ${this._errorMessage
            ? html`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              `
            : nothing}

          <p class="description">
            Export orders within a date range to CSV format. The export includes invoice number,
            date, payment status, billing name, subtotal, tax, shipping, and total.
          </p>

          <div class="form-field">
            <label for="fromDate">From Date *</label>
            <uui-input
              id="fromDate"
              type="date"
              .value=${this._fromDate}
              required
              @input=${(e: Event) => {
                this._fromDate = (e.target as HTMLInputElement).value;
              }}
            ></uui-input>
          </div>

          <div class="form-field">
            <label for="toDate">To Date *</label>
            <uui-input
              id="toDate"
              type="date"
              .value=${this._toDate}
              required
              @input=${(e: Event) => {
                this._toDate = (e.target as HTMLInputElement).value;
              }}
            ></uui-input>
          </div>
        </div>

        <div slot="actions">
          <uui-button
            label="Cancel"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isExporting}
          >
            Cancel
          </uui-button>
          <uui-button
            label="Export"
            look="primary"
            color="positive"
            @click=${this._handleExport}
            ?disabled=${this._isExporting || !this._fromDate || !this._toDate}
          >
            ${this._isExporting ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            ${this._isExporting ? "Exporting..." : "Export to CSV"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .description {
      margin: 0 0 var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .form-field {
      margin-bottom: var(--uui-size-space-4);
    }

    .form-field label {
      display: block;
      font-weight: 600;
      margin-bottom: var(--uui-size-space-1);
    }

    uui-input {
      width: 100%;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }

    uui-button uui-loader-circle {
      margin-right: var(--uui-size-space-2);
    }
  `;
}

export default MerchelloExportModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-export-modal": MerchelloExportModalElement;
  }
}
