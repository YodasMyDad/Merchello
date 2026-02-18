import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type {
  GenerateStatementModalData,
  GenerateStatementModalValue,
} from "@orders/modals/generate-statement-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

type PeriodOption = "last30" | "last60" | "last90" | "thisMonth" | "custom";

@customElement("merchello-generate-statement-modal")
export class MerchelloGenerateStatementModalElement extends UmbModalBaseElement<
  GenerateStatementModalData,
  GenerateStatementModalValue
> {
  @state() private _periodOption: PeriodOption = "last30";
  @state() private _customStartDate: string = "";
  @state() private _customEndDate: string = "";
  @state() private _isGenerating: boolean = false;
  @state() private _error: string | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    // Set default end date to today
    this._customEndDate = new Date().toISOString().split("T")[0];
    // Set default start date to 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this._customStartDate = thirtyDaysAgo.toISOString().split("T")[0];
  }

  private _getDateRange(): { periodStart?: string; periodEnd?: string } {
    const today = new Date();
    const endDate = today.toISOString().split("T")[0];

    switch (this._periodOption) {
      case "last30": {
        const start = new Date();
        start.setDate(start.getDate() - 30);
        return { periodStart: start.toISOString().split("T")[0], periodEnd: endDate };
      }
      case "last60": {
        const start = new Date();
        start.setDate(start.getDate() - 60);
        return { periodStart: start.toISOString().split("T")[0], periodEnd: endDate };
      }
      case "last90": {
        const start = new Date();
        start.setDate(start.getDate() - 90);
        return { periodStart: start.toISOString().split("T")[0], periodEnd: endDate };
      }
      case "thisMonth": {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { periodStart: start.toISOString().split("T")[0], periodEnd: endDate };
      }
      case "custom":
        return {
          periodStart: this._customStartDate || undefined,
          periodEnd: this._customEndDate || undefined,
        };
      default:
        return {};
    }
  }

  private async _handleGenerate(): Promise<void> {
    const customerId = this.data?.customerId;
    if (!customerId) return;

    // Validate custom date range
    if (this._periodOption === "custom") {
      if (!this._customStartDate || !this._customEndDate) {
        this._error = "Please select both start and end dates for custom range";
        return;
      }
      if (new Date(this._customStartDate) > new Date(this._customEndDate)) {
        this._error = "Start date must be before end date";
        return;
      }
    }

    this._isGenerating = true;
    this._error = null;

    const { periodStart, periodEnd } = this._getDateRange();
    const { blob, filename, error } = await MerchelloApi.downloadCustomerStatement(
      customerId,
      periodStart,
      periodEnd
    );

    this._isGenerating = false;

    if (error || !blob) {
      this._error = error?.message ?? "Failed to generate statement";
      return;
    }

    // Trigger browser download
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename ?? "statement.pdf";
    link.style.display = "none";
    document.body.appendChild(link);
    link.addEventListener("click", (e) => e.stopPropagation(), { once: true });
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.value = { downloaded: true };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.value = { downloaded: false };
    this.modalContext?.reject();
  }

  override render() {
    const customerName = this.data?.customerName ?? "Customer";

    return html`
      <umb-body-layout headline="Generate Statement">
        <div id="main">
          ${this._error
            ? html`<div class="error-banner">${this._error}</div>`
            : nothing}

          <p class="description">
            Generate a PDF statement for <strong>${customerName}</strong> showing all
            invoices, payments, and outstanding balance for the selected period.
          </p>

          <div class="form-row">
            <label>Statement Period</label>
            <div class="period-options">
              ${this._renderPeriodOption("last30", "Last 30 Days")}
              ${this._renderPeriodOption("last60", "Last 60 Days")}
              ${this._renderPeriodOption("last90", "Last 90 Days")}
              ${this._renderPeriodOption("thisMonth", "This Month")}
              ${this._renderPeriodOption("custom", "Custom Range")}
            </div>
          </div>

          ${this._periodOption === "custom"
            ? html`
                <div class="date-range">
                  <div class="form-row">
                    <label for="start-date">From</label>
                    <uui-input
                      id="start-date"
                      type="date"
                      .value=${this._customStartDate}
                      @input=${(e: Event) =>
                        (this._customStartDate = (e.target as HTMLInputElement).value)}
                      label="Start date"
                    ></uui-input>
                  </div>
                  <div class="form-row">
                    <label for="end-date">To</label>
                    <uui-input
                      id="end-date"
                      type="date"
                      .value=${this._customEndDate}
                      @input=${(e: Event) =>
                        (this._customEndDate = (e.target as HTMLInputElement).value)}
                      label="End date"
                    ></uui-input>
                  </div>
                </div>
              `
            : nothing}

          <div class="info-note">
            <uui-icon name="icon-info"></uui-icon>
            <span>
              The statement includes an aging summary showing current and overdue
              amounts.
            </span>
          </div>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label="Download Statement"
            look="primary"
            color="positive"
            ?disabled=${this._isGenerating}
            @click=${this._handleGenerate}
          >
            ${this._isGenerating ? "Generating..." : "Download PDF"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  private _renderPeriodOption(value: PeriodOption, label: string) {
    const isSelected = this._periodOption === value;
    return html`
      <uui-button
        label=${label}
        look=${isSelected ? "primary" : "outline"}
        @click=${() => (this._periodOption = value)}
      >
        ${label}
      </uui-button>
    `;
  }

  static override readonly styles = [
    modalLayoutStyles,
    css`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .description {
      font-size: 0.9375rem;
      line-height: 1.5;
      margin: 0;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .form-row label {
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .period-options {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
    }

    .period-options uui-button {
      flex: 0 0 auto;
    }

    .date-range {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
    }

    .date-range uui-input {
      width: 100%;
    }

    .info-note {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: color-mix(in srgb, var(--uui-color-current) 10%, transparent);
      border-radius: var(--uui-border-radius);
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .info-note uui-icon {
      flex-shrink: 0;
      color: var(--uui-color-current);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `,
  ];
}

export default MerchelloGenerateStatementModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-generate-statement-modal": MerchelloGenerateStatementModalElement;
  }
}

