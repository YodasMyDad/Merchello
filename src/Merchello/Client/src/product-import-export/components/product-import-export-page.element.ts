import { LitElement, css, html, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, query, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatNumber } from "@shared/utils/formatting.js";
import {
  ProductSyncProfile,
  ProductSyncIssueSeverity,
  type ProductImportValidationDto,
} from "@product-import-export/types/product-import-export.types.js";
import type { MerchelloProductSyncRunsListElement } from "@product-import-export/components/product-sync-runs-list.element.js";
import "@product-import-export/components/product-sync-runs-list.element.js";

@customElement("merchello-product-import-export-page")
export class MerchelloProductImportExportPageElement extends UmbElementMixin(LitElement) {
  @state() private _importProfile = ProductSyncProfile.ShopifyStrict;
  @state() private _exportProfile = ProductSyncProfile.ShopifyStrict;
  @state() private _continueOnImageFailure = false;

  @state() private _selectedFile: File | null = null;
  @state() private _validationResult: ProductImportValidationDto | null = null;
  @state() private _validationError: string | null = null;

  @state() private _isValidating = false;
  @state() private _isStartingImport = false;
  @state() private _isStartingExport = false;

  @query("merchello-product-sync-runs-list")
  private _runsList?: MerchelloProductSyncRunsListElement;

  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private _notify(type: "positive" | "warning" | "danger", headline: string, message: string): void {
    this.#notificationContext?.peek(type, {
      data: {
        headline,
        message,
      },
    });
  }

  private _handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this._selectedFile = input.files?.[0] ?? null;
    this._validationResult = null;
    this._validationError = null;
  }

  private _formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${formatNumber(kb, 1)} KB`;
    }

    return `${formatNumber(kb / 1024, 1)} MB`;
  }

  private async _validateImport(): Promise<void> {
    if (!this._selectedFile) {
      this._validationError = "Select a CSV file before validating.";
      return;
    }

    this._isValidating = true;
    this._validationError = null;
    this._validationResult = null;

    const { data, error } = await MerchelloApi.validateProductImport(this._selectedFile, {
      profile: this._importProfile,
      maxIssues: null,
    });

    if (!this.#isConnected) return;

    this._isValidating = false;

    if (error || !data) {
      this._validationError = error?.message ?? "Validation failed.";
      return;
    }

    this._validationResult = data;

    if (data.errorCount > 0) {
      this._notify(
        "warning",
        "Validation completed with errors",
        `${data.errorCount} error(s) found. Fix errors before starting import.`
      );
      return;
    }

    this._notify(
      "positive",
      "Validation passed",
      `Validated ${data.rowCount} row(s) across ${data.distinctHandleCount} handle(s).`
    );
  }

  private async _startImport(): Promise<void> {
    if (!this._selectedFile) {
      this._notify("warning", "No file selected", "Select a CSV file before starting import.");
      return;
    }

    if (!this._validationResult) {
      this._notify("warning", "Validate first", "Run validation before starting the import.");
      return;
    }

    if (this._validationResult.errorCount > 0) {
      this._notify("warning", "Validation errors remain", "Fix validation errors before starting import.");
      return;
    }

    this._isStartingImport = true;

    const { data, error } = await MerchelloApi.startProductImport(this._selectedFile, {
      profile: this._importProfile,
      continueOnImageFailure: this._continueOnImageFailure,
      maxIssues: null,
    });

    if (!this.#isConnected) return;

    this._isStartingImport = false;

    if (error || !data) {
      this._notify("danger", "Import queue failed", error?.message ?? "Unable to start import run.");
      return;
    }

    this._notify(
      "positive",
      "Import queued",
      `Import run ${data.id} has been queued and will be processed in the background.`
    );
    await this._runsList?.reload();
  }

  private async _startExport(): Promise<void> {
    this._isStartingExport = true;

    const { data, error } = await MerchelloApi.startProductExport({
      profile: this._exportProfile,
    });

    if (!this.#isConnected) return;

    this._isStartingExport = false;

    if (error || !data) {
      this._notify("danger", "Export queue failed", error?.message ?? "Unable to start export run.");
      return;
    }

    this._notify(
      "positive",
      "Export queued",
      `Export run ${data.id} has been queued and will be processed in the background.`
    );
    await this._runsList?.reload();
  }

  private _getSeverityLabel(severity: ProductSyncIssueSeverity): string {
    if (severity === ProductSyncIssueSeverity.Error) {
      return "Error";
    }

    if (severity === ProductSyncIssueSeverity.Warning) {
      return "Warning";
    }

    return "Info";
  }

  private _getSeverityColor(severity: ProductSyncIssueSeverity): "default" | "warning" | "danger" {
    if (severity === ProductSyncIssueSeverity.Error) {
      return "danger";
    }

    if (severity === ProductSyncIssueSeverity.Warning) {
      return "warning";
    }

    return "default";
  }

  private _renderValidationBlock(): unknown {
    if (this._validationError) {
      return html`
        <div class="error-banner">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._validationError}</span>
        </div>
      `;
    }

    if (!this._validationResult) {
      return nothing;
    }

    return html`
      <uui-box headline="Validation Results" class="section">
        <div class="validation-summary">
          <span>${this._validationResult.rowCount} row(s)</span>
          <span>${this._validationResult.distinctHandleCount} handle(s)</span>
          <span>${this._validationResult.warningCount} warning(s)</span>
          <span>${this._validationResult.errorCount} error(s)</span>
        </div>

        ${this._validationResult.issues.length > 0
          ? html`
              <div class="table-wrap">
                <uui-table>
                  <uui-table-head>
                    <uui-table-head-cell>Severity</uui-table-head-cell>
                    <uui-table-head-cell>Row</uui-table-head-cell>
                    <uui-table-head-cell>Field</uui-table-head-cell>
                    <uui-table-head-cell>Message</uui-table-head-cell>
                  </uui-table-head>
                  ${this._validationResult.issues.map(
                    (issue) => html`
                      <uui-table-row>
                        <uui-table-cell>
                          <uui-tag color=${this._getSeverityColor(issue.severity)}>
                            ${this._getSeverityLabel(issue.severity)}
                          </uui-tag>
                        </uui-table-cell>
                        <uui-table-cell>${issue.rowNumber ?? "-"}</uui-table-cell>
                        <uui-table-cell>${issue.field ?? "-"}</uui-table-cell>
                        <uui-table-cell>${issue.message}</uui-table-cell>
                      </uui-table-row>
                    `
                  )}
                </uui-table>
              </div>
            `
          : html`<p class="helper-text">No issues found.</p>`}
      </uui-box>
    `;
  }

  override render() {
    const canStartImport = this._selectedFile !== null &&
      this._validationResult !== null &&
      this._validationResult.errorCount === 0 &&
      !this._isValidating &&
      !this._isStartingImport;

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="container">
          <uui-box headline="Import Products" class="section">
            <div class="form-grid">
              <umb-property-layout
                label="Profile"
                description="Shopify Strict is Shopify-compatible. Merchello Extended includes custom columns for round-trips.">
                <uui-select
                  slot="editor"
                  label="Import profile"
                  .options=${[
                    {
                      name: "Shopify Strict",
                      value: String(ProductSyncProfile.ShopifyStrict),
                      selected: this._importProfile === ProductSyncProfile.ShopifyStrict,
                    },
                    {
                      name: "Merchello Extended",
                      value: String(ProductSyncProfile.MerchelloExtended),
                      selected: this._importProfile === ProductSyncProfile.MerchelloExtended,
                    },
                  ]}
                  @change=${(event: Event) => {
                    this._importProfile = parseInt((event.target as HTMLSelectElement).value, 10) as ProductSyncProfile;
                    this._validationResult = null;
                    this._validationError = null;
                  }}>
                </uui-select>
              </umb-property-layout>

              <umb-property-layout
                label="CSV File"
                description="Upload a Shopify-compatible CSV file. Validation runs before import can start.">
                <input
                  slot="editor"
                  class="file-input"
                  type="file"
                  accept=".csv,text/csv"
                  aria-label="CSV file upload"
                  @change=${this._handleFileChange} />
                ${this._selectedFile
                  ? html`<p class="helper-text">${this._selectedFile.name} (${this._formatFileSize(this._selectedFile.size)})</p>`
                  : nothing}
              </umb-property-layout>

              <umb-property-layout
                label="Options"
                description="Continue importing products when image downloads fail. Failures are logged as warnings.">
                <uui-toggle
                  slot="editor"
                  label="Continue on image failure"
                  .checked=${this._continueOnImageFailure}
                  @change=${(event: Event) => {
                    this._continueOnImageFailure = (event.target as HTMLInputElement).checked;
                  }}>
                </uui-toggle>
              </umb-property-layout>
            </div>

            <div class="actions">
              <uui-button
                look="secondary"
                label="Validate import file"
                ?disabled=${!this._selectedFile || this._isValidating || this._isStartingImport}
                @click=${this._validateImport}>
                <uui-icon name=${this._isValidating ? "icon-hourglass" : "icon-search"} slot="icon"></uui-icon>
                ${this._isValidating ? "Validating..." : "Validate"}
              </uui-button>
              <uui-button
                look="primary"
                color="positive"
                label="Start import"
                ?disabled=${!canStartImport}
                @click=${this._startImport}>
                <uui-icon name=${this._isStartingImport ? "icon-hourglass" : "icon-cloud-upload"} slot="icon"></uui-icon>
                ${this._isStartingImport ? "Starting..." : "Start Import"}
              </uui-button>
            </div>

            ${this._selectedFile && !this._validationResult
              ? html`<p class="helper-text action-hint">Validate this file before starting import.</p>`
              : nothing}
            ${this._validationResult && this._validationResult.errorCount > 0
              ? html`<p class="helper-text action-hint error-text">Resolve validation errors before starting import.</p>`
              : nothing}
          </uui-box>

          ${this._renderValidationBlock()}

          <uui-box headline="Export Products" class="section">
            <div class="form-grid">
              <umb-property-layout
                label="Profile"
                description="Choose Shopify Strict for Shopify import compatibility, or Merchello Extended for full Merchello metadata.">
                <uui-select
                  slot="editor"
                  label="Export profile"
                  .options=${[
                    {
                      name: "Shopify Strict",
                      value: String(ProductSyncProfile.ShopifyStrict),
                      selected: this._exportProfile === ProductSyncProfile.ShopifyStrict,
                    },
                    {
                      name: "Merchello Extended",
                      value: String(ProductSyncProfile.MerchelloExtended),
                      selected: this._exportProfile === ProductSyncProfile.MerchelloExtended,
                    },
                  ]}
                  @change=${(event: Event) => {
                    this._exportProfile = parseInt((event.target as HTMLSelectElement).value, 10) as ProductSyncProfile;
                  }}>
                </uui-select>
              </umb-property-layout>
            </div>

            <div class="actions">
              <uui-button
                look="primary"
                color="positive"
                label="Start export"
                ?disabled=${this._isStartingExport}
                @click=${this._startExport}>
                <uui-icon name=${this._isStartingExport ? "icon-hourglass" : "icon-page-up"} slot="icon"></uui-icon>
                ${this._isStartingExport ? "Starting..." : "Start Export"}
              </uui-button>
            </div>
          </uui-box>

          <merchello-product-sync-runs-list></merchello-product-sync-runs-list>
        </div>
      </umb-body-layout>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .container {
      max-width: 100%;
      padding: var(--uui-size-layout-1);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .section {
      margin: 0;
    }

    .form-grid {
      display: grid;
      gap: var(--uui-size-space-4);
    }

    .file-input {
      width: 100%;
      padding: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
    }

    .helper-text {
      margin: var(--uui-size-space-2) 0 0;
      color: var(--uui-color-text-alt);
      font-size: 0.8125rem;
    }

    .actions {
      margin-top: var(--uui-size-space-4);
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .validation-summary {
      display: flex;
      gap: var(--uui-size-space-4);
      flex-wrap: wrap;
      margin-bottom: var(--uui-size-space-3);
      font-weight: 600;
    }

    .table-wrap {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow-x: auto;
    }

    uui-table {
      width: 100%;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .action-hint {
      margin-top: var(--uui-size-space-3);
    }

    .error-text {
      color: var(--uui-color-danger-emphasis);
    }
  `;
}

export default MerchelloProductImportExportPageElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-import-export-page": MerchelloProductImportExportPageElement;
  }
}
