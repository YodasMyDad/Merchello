import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { SupplierModalData, SupplierModalValue } from "@suppliers/modals/supplier-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { FulfilmentProviderOptionDto } from "@fulfilment-providers/types/fulfilment-providers.types.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";
import type {
  CsvDeliverySettingsDto,
  SupplierDirectProfileDto,
  TestSupplierFtpConnectionResultDto,
} from "@suppliers/types/suppliers.types.js";

type SupplierDirectDeliveryMethod = "Email" | "Ftp" | "Sftp";
type SupplierDirectSubmissionTrigger = "OnPaid" | "ExplicitRelease";
type CsvColumnRow = { field: string; header: string };
type CsvStaticColumnRow = { header: string; value: string };
const SUPPLIER_DIRECT_PROVIDER_KEY = "supplier-direct";

const DEFAULT_CSV_COLUMNS: ReadonlyArray<CsvColumnRow> = [
  { field: "OrderNumber", header: "Order Number" },
  { field: "Sku", header: "SKU" },
  { field: "ProductName", header: "Product Name" },
  { field: "Quantity", header: "Quantity" },
  { field: "UnitPrice", header: "Unit Price" },
  { field: "RecipientName", header: "Ship To Name" },
  { field: "Company", header: "Company" },
  { field: "AddressOne", header: "Address Line 1" },
  { field: "AddressTwo", header: "Address Line 2" },
  { field: "TownCity", header: "City" },
  { field: "CountyState", header: "State/Province" },
  { field: "PostalCode", header: "Postal Code" },
  { field: "CountryCode", header: "Country" },
  { field: "Phone", header: "Phone" },
];

const BUILT_IN_CSV_FIELDS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "OrderNumber", label: "Order number" },
  { key: "CustomerEmail", label: "Customer email" },
  { key: "CustomerPhone", label: "Customer phone" },
  { key: "RequestedDeliveryDate", label: "Requested delivery date" },
  { key: "InternalNotes", label: "Internal notes" },
  { key: "ShippingServiceCode", label: "Shipping service code" },
  { key: "Sku", label: "Line item SKU" },
  { key: "ProductName", label: "Line item product name" },
  { key: "Quantity", label: "Line item quantity" },
  { key: "UnitPrice", label: "Line item unit price" },
  { key: "Weight", label: "Line item weight" },
  { key: "Barcode", label: "Line item barcode" },
  { key: "RecipientName", label: "Shipping name" },
  { key: "Company", label: "Shipping company" },
  { key: "AddressOne", label: "Shipping address line 1" },
  { key: "AddressTwo", label: "Shipping address line 2" },
  { key: "TownCity", label: "Shipping city" },
  { key: "CountyState", label: "Shipping state/province" },
  { key: "PostalCode", label: "Shipping postal code" },
  { key: "CountryCode", label: "Shipping country code" },
  { key: "Phone", label: "Shipping phone" },
];

@customElement("merchello-supplier-modal")
export class MerchelloSupplierModalElement extends UmbModalBaseElement<
  SupplierModalData,
  SupplierModalValue
> {
  @state() private _name = "";
  @state() private _code = "";
  @state() private _contactName = "";
  @state() private _contactEmail = "";
  @state() private _contactPhone = "";
  @state() private _fulfilmentProviderConfigurationId = "";
  @state() private _fulfilmentProviderOptions: FulfilmentProviderOptionDto[] = [];
  @state() private _isLoadingProviders = false;
  @state() private _isLoadingSupplier = false;
  @state() private _isSaving = false;
  @state() private _errors: Record<string, string> = {};

  @state() private _deliveryMethod: SupplierDirectDeliveryMethod = "Email";
  @state() private _submissionTrigger: SupplierDirectSubmissionTrigger = "OnPaid";
  @state() private _emailRecipient = "";
  @state() private _emailCcAddresses = "";
  @state() private _ftpHost = "";
  @state() private _ftpPort = "";
  @state() private _ftpUsername = "";
  @state() private _ftpPassword = "";
  @state() private _ftpRemotePath = "";
  @state() private _ftpHostFingerprint = "";
  @state() private _useCustomCsvSettings = false;
  @state() private _csvColumns: CsvColumnRow[] = this._createDefaultCsvColumns();
  @state() private _csvStaticColumns: CsvStaticColumnRow[] = [];
  @state() private _isTestingFtpConnection = false;
  @state() private _ftpConnectionTestResult: TestSupplierFtpConnectionResultDto | null = null;
  @state() private _ftpConnectionTestError: string | null = null;

  private get _isEditMode(): boolean {
    return !!this.data?.supplier;
  }

  private get _isLoading(): boolean {
    return this._isLoadingProviders || this._isLoadingSupplier;
  }

  private _isSupplierDirectSelected(): boolean {
    if (!this._fulfilmentProviderConfigurationId) {
      return false;
    }

    const selectedProvider = this._fulfilmentProviderOptions.find(
      (provider) => provider.configurationId === this._fulfilmentProviderConfigurationId
    );

    return selectedProvider?.providerKey === SUPPLIER_DIRECT_PROVIDER_KEY;
  }

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.data?.supplier) {
      this._name = this.data.supplier.name;
      this._code = this.data.supplier.code ?? "";
      this._fulfilmentProviderConfigurationId =
        this.data.supplier.fulfilmentProviderConfigurationId ?? "";
    }

    this._loadFulfilmentProviders();
    this._loadSupplierDetailsIfEditing();
  }

  private _createDefaultCsvColumns(): CsvColumnRow[] {
    return DEFAULT_CSV_COLUMNS.map((column) => ({ ...column }));
  }

  private _parseEmailList(value: string): string[] {
    return value
      .split(/[\n,;]+/g)
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }

  private _normalizeCsvColumns(columns: CsvColumnRow[]): CsvColumnRow[] {
    return columns
      .map((column) => ({
        field: column.field.trim(),
        header: column.header.trim(),
      }))
      .filter((column) => column.field.length > 0 && column.header.length > 0);
  }

  private _normalizeCsvStaticColumns(columns: CsvStaticColumnRow[]): CsvStaticColumnRow[] {
    return columns
      .map((column) => ({
        header: column.header.trim(),
        value: column.value.trim(),
      }))
      .filter((column) => column.header.length > 0);
  }

  private async _loadFulfilmentProviders(): Promise<void> {
    this._isLoadingProviders = true;
    const { data, error } = await MerchelloApi.getFulfilmentProviderOptions();

    if (error) {
      this._errors = { ...this._errors, general: error.message };
      this._isLoadingProviders = false;
      return;
    }

    this._fulfilmentProviderOptions = data ?? [];
    this._isLoadingProviders = false;
  }

  private async _loadSupplierDetailsIfEditing(): Promise<void> {
    const supplierId = this.data?.supplier?.id;
    if (!supplierId) {
      return;
    }

    this._isLoadingSupplier = true;
    const { data, error } = await MerchelloApi.getSupplier(supplierId);

    if (error) {
      this._errors = { ...this._errors, general: error.message };
      this._isLoadingSupplier = false;
      return;
    }

    if (data) {
      this._name = data.name;
      this._code = data.code ?? "";
      this._contactName = data.contactName ?? "";
      this._contactEmail = data.contactEmail ?? "";
      this._contactPhone = data.contactPhone ?? "";
      this._fulfilmentProviderConfigurationId = data.fulfilmentProviderConfigurationId ?? "";

      if (data.supplierDirectProfile) {
        this._applySupplierDirectProfile(data.supplierDirectProfile);
      }
    }

    this._isLoadingSupplier = false;
  }

  private _applySupplierDirectProfile(profile: SupplierDirectProfileDto): void {
    const method =
      profile.deliveryMethod === "Ftp" || profile.deliveryMethod === "Sftp"
        ? profile.deliveryMethod
        : "Email";
    const submissionTrigger =
      profile.submissionTrigger === "ExplicitRelease" ? "ExplicitRelease" : "OnPaid";

    this._deliveryMethod = method;
    this._submissionTrigger = submissionTrigger;
    this._emailRecipient = profile.emailSettings?.recipientEmail ?? "";
    this._emailCcAddresses = (profile.emailSettings?.ccAddresses ?? []).join(", ");
    this._ftpHost = profile.ftpSettings?.host ?? "";
    this._ftpPort =
      profile.ftpSettings?.port !== undefined && profile.ftpSettings?.port !== null
        ? profile.ftpSettings.port.toString()
        : "";
    this._ftpUsername = profile.ftpSettings?.username ?? "";
    this._ftpPassword = "";
    this._ftpRemotePath = profile.ftpSettings?.remotePath ?? "";
    this._ftpHostFingerprint = profile.ftpSettings?.hostFingerprint ?? "";

    const csvColumns = Object.entries(profile.csvSettings?.columns ?? {}).map(
      ([field, header]) => ({ field, header })
    );
    const csvStaticColumns = Object.entries(profile.csvSettings?.staticColumns ?? {}).map(
      ([header, value]) => ({ header, value })
    );
    const hasCustomCsv = csvColumns.length > 0 || csvStaticColumns.length > 0;

    this._useCustomCsvSettings = hasCustomCsv;
    this._csvColumns = hasCustomCsv ? csvColumns : this._createDefaultCsvColumns();
    this._csvStaticColumns = hasCustomCsv ? csvStaticColumns : [];
    this._clearFtpConnectionTestState();
  }

  private _validateEmail(value: string): boolean {
    if (!value) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private _validate(): boolean {
    const errors: Record<string, string> = {};

    if (!this._name.trim()) {
      errors.name = "Supplier name is required";
    }

    if (!this._validateEmail(this._contactEmail.trim())) {
      errors.contactEmail = "Contact email format is invalid";
    }

    const isSupplierDirectSelected = this._isSupplierDirectSelected();
    const parsedCcAddresses = this._parseEmailList(this._emailCcAddresses);

    if (parsedCcAddresses.some((address) => !this._validateEmail(address))) {
      errors.emailCcAddresses = "One or more CC email addresses are invalid";
    }

    if (
      isSupplierDirectSelected &&
      this._deliveryMethod === "Email" &&
      !this._validateEmail(this._emailRecipient.trim())
    ) {
      errors.emailRecipient = "Supplier recipient email format is invalid";
    }

    if (
      isSupplierDirectSelected &&
      this._deliveryMethod === "Email" &&
      !this._emailRecipient.trim() &&
      !this._contactEmail.trim()
    ) {
      errors.emailRecipient = "Provide supplier recipient email or supplier contact email";
    }

    if (
      isSupplierDirectSelected &&
      this._deliveryMethod !== "Email" &&
      this._ftpPort.trim() &&
      Number.isNaN(Number(this._ftpPort.trim()))
    ) {
      errors.ftpPort = "FTP/SFTP port must be a valid number";
    }

    if (isSupplierDirectSelected && this._deliveryMethod !== "Email" && !this._ftpHost.trim()) {
      errors.ftpHost = "FTP/SFTP host is required";
    }

    if (isSupplierDirectSelected && this._deliveryMethod !== "Email" && !this._ftpUsername.trim()) {
      errors.ftpUsername = "FTP/SFTP username is required";
    }

    if (isSupplierDirectSelected && this._deliveryMethod !== "Email" && !this._isEditMode && !this._ftpPassword.trim()) {
      errors.ftpPassword = "FTP/SFTP password is required when creating a supplier";
    }

    if (isSupplierDirectSelected && this._deliveryMethod !== "Email" && this._useCustomCsvSettings) {
      const hasIncompleteColumn = this._csvColumns.some(
        (column) => !column.field.trim() || !column.header.trim()
      );
      if (hasIncompleteColumn) {
        errors.csvColumns = "Each CSV column row must include both a field key and a header.";
      }

      const hasIncompleteStaticColumn = this._csvStaticColumns.some(
        (column) => !column.header.trim()
      );
      if (hasIncompleteStaticColumn) {
        errors.csvStaticColumns = "Each static column requires a header.";
      }

      const normalizedColumns = this._normalizeCsvColumns(this._csvColumns);
      const normalizedStaticColumns = this._normalizeCsvStaticColumns(this._csvStaticColumns);

      if (normalizedColumns.length === 0 && normalizedStaticColumns.length === 0) {
        errors.csvColumns =
          "Add at least one CSV column or static column, or disable custom CSV format.";
      }

      const fieldSet = new Set<string>();
      for (const column of normalizedColumns) {
        const normalizedField = column.field.toLowerCase();
        if (fieldSet.has(normalizedField)) {
          errors.csvColumns = `CSV field '${column.field}' is duplicated.`;
          break;
        }

        fieldSet.add(normalizedField);
      }

      const staticHeaderSet = new Set<string>();
      for (const column of normalizedStaticColumns) {
        const normalizedHeader = column.header.toLowerCase();
        if (staticHeaderSet.has(normalizedHeader)) {
          errors.csvStaticColumns = `Static column header '${column.header}' is duplicated.`;
          break;
        }

        staticHeaderSet.add(normalizedHeader);
      }
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private _buildCsvSettings(): CsvDeliverySettingsDto {
    if (!this._useCustomCsvSettings) {
      return {};
    }

    const columns = this._normalizeCsvColumns(this._csvColumns);
    const staticColumns = this._normalizeCsvStaticColumns(this._csvStaticColumns);

    return {
      columns:
        columns.length > 0
          ? Object.fromEntries(columns.map((column) => [column.field, column.header]))
          : undefined,
      staticColumns:
        staticColumns.length > 0
          ? Object.fromEntries(staticColumns.map((column) => [column.header, column.value]))
          : undefined,
    };
  }

  private _buildSupplierDirectProfile(): SupplierDirectProfileDto {
    const parsedCcAddresses = this._parseEmailList(this._emailCcAddresses);
    const csvSettings = this._buildCsvSettings();
    const emailSettings =
      this._emailRecipient.trim() || parsedCcAddresses.length > 0
        ? {
            recipientEmail: this._emailRecipient.trim() || undefined,
            ccAddresses: parsedCcAddresses.length > 0 ? parsedCcAddresses : undefined,
          }
        : undefined;

    if (this._deliveryMethod === "Email") {
      return {
        submissionTrigger: this._submissionTrigger,
        deliveryMethod: "Email",
        emailSettings,
        csvSettings,
      };
    }

    const parsedPort = this._ftpPort.trim() ? parseInt(this._ftpPort.trim(), 10) : undefined;

    return {
      submissionTrigger: this._submissionTrigger,
      deliveryMethod: this._deliveryMethod,
      emailSettings,
      ftpSettings: {
        host: this._ftpHost.trim() || undefined,
        port: Number.isNaN(parsedPort) ? undefined : parsedPort,
        username: this._ftpUsername.trim() || undefined,
        // Empty password preserves existing stored password on update.
        password: this._ftpPassword.trim() || undefined,
        remotePath: this._ftpRemotePath.trim() || undefined,
        useSftp: this._deliveryMethod === "Sftp",
        hostFingerprint: this._ftpHostFingerprint.trim() || undefined,
      },
      csvSettings,
    };
  }

  private _clearFtpConnectionTestState(): void {
    this._ftpConnectionTestResult = null;
    this._ftpConnectionTestError = null;
  }

  private async _handleTestFtpConnection(): Promise<void> {
    if (this._deliveryMethod === "Email") {
      return;
    }

    const host = this._ftpHost.trim();
    const username = this._ftpUsername.trim();
    const password = this._ftpPassword.trim();
    const parsedPort = this._ftpPort.trim() ? parseInt(this._ftpPort.trim(), 10) : undefined;

    this._clearFtpConnectionTestState();

    if (!host) {
      this._ftpConnectionTestError = "FTP/SFTP host is required to test the connection.";
      return;
    }

    if (!username) {
      this._ftpConnectionTestError = "FTP/SFTP username is required to test the connection.";
      return;
    }

    if (this._ftpPort.trim() && Number.isNaN(parsedPort)) {
      this._ftpConnectionTestError = "FTP/SFTP port must be a valid number.";
      return;
    }

    if (parsedPort !== undefined && parsedPort <= 0) {
      this._ftpConnectionTestError = "FTP/SFTP port must be greater than 0.";
      return;
    }

    if (!password && !this._isEditMode) {
      this._ftpConnectionTestError =
        "FTP/SFTP password is required to test the connection when creating a supplier.";
      return;
    }

    this._isTestingFtpConnection = true;

    const { data, error } = await MerchelloApi.testSupplierFtpConnection({
      supplierId: this.data?.supplier?.id,
      deliveryMethod: this._deliveryMethod,
      ftpSettings: {
        host: host || undefined,
        port: Number.isNaN(parsedPort) ? undefined : parsedPort,
        username: username || undefined,
        password: password || undefined,
        remotePath: this._ftpRemotePath.trim() || undefined,
        useSftp: this._deliveryMethod === "Sftp",
        hostFingerprint: this._ftpHostFingerprint.trim() || undefined,
      },
    });

    this._isTestingFtpConnection = false;

    if (error) {
      this._ftpConnectionTestError = error.message;
      return;
    }

    this._ftpConnectionTestResult = data ?? {
      success: false,
      errorMessage: "No response returned from connection test.",
    };
  }

  private async _handleSave(): Promise<void> {
    if (!this._validate()) return;

    this._isSaving = true;

    const previousProviderId = this.data?.supplier?.fulfilmentProviderConfigurationId ?? "";
    const shouldClearProviderId = this._isEditMode && !this._fulfilmentProviderConfigurationId && !!previousProviderId;
    const shouldIncludeSupplierDirectProfile = this._isSupplierDirectSelected();

    const basePayload = {
      name: this._name.trim(),
      code: this._code.trim() || undefined,
      contactName: this._contactName.trim() || undefined,
      contactEmail: this._contactEmail.trim() || undefined,
      contactPhone: this._contactPhone.trim() || undefined,
      fulfilmentProviderConfigurationId: this._fulfilmentProviderConfigurationId || undefined,
      shouldClearFulfilmentProviderId: shouldClearProviderId || undefined,
      supplierDirectProfile: shouldIncludeSupplierDirectProfile
        ? this._buildSupplierDirectProfile()
        : undefined,
      shouldClearSupplierDirectProfile:
        this._isEditMode && !shouldIncludeSupplierDirectProfile ? true : undefined,
    };

    if (this._isEditMode) {
      const supplierId = this.data?.supplier?.id;
      if (!supplierId) {
        this._errors = { general: "Supplier ID is missing" };
        this._isSaving = false;
        return;
      }

      const { data, error } = await MerchelloApi.updateSupplier(supplierId, basePayload);
      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { supplier: data, isUpdated: true };
      this.modalContext?.submit();
      return;
    }

    const { data, error } = await MerchelloApi.createSupplier({
      name: basePayload.name,
      code: basePayload.code,
      contactName: basePayload.contactName,
      contactEmail: basePayload.contactEmail,
      contactPhone: basePayload.contactPhone,
      fulfilmentProviderConfigurationId: basePayload.fulfilmentProviderConfigurationId,
      supplierDirectProfile: basePayload.supplierDirectProfile,
    });

    this._isSaving = false;

    if (error) {
      this._errors = { general: error.message };
      return;
    }

    this.value = { supplier: data, isCreated: true };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _getDeliveryMethodOptions(): Array<{ name: string; value: string; selected: boolean }> {
    return [
      { name: "Email", value: "Email", selected: this._deliveryMethod === "Email" },
      { name: "FTP", value: "Ftp", selected: this._deliveryMethod === "Ftp" },
      { name: "SFTP", value: "Sftp", selected: this._deliveryMethod === "Sftp" },
    ];
  }

  private _getSubmissionTriggerOptions(): Array<{ name: string; value: string; selected: boolean }> {
    return [
      { name: "On Paid", value: "OnPaid", selected: this._submissionTrigger === "OnPaid" },
      {
        name: "Explicit Release",
        value: "ExplicitRelease",
        selected: this._submissionTrigger === "ExplicitRelease",
      },
    ];
  }

  private _setCsvCustomEnabled(enabled: boolean): void {
    this._useCustomCsvSettings = enabled;
    if (enabled && this._csvColumns.length === 0 && this._csvStaticColumns.length === 0) {
      this._csvColumns = this._createDefaultCsvColumns();
    }
  }

  private _addCsvColumn(): void {
    this._csvColumns = [...this._csvColumns, { field: "", header: "" }];
  }

  private _removeCsvColumn(index: number): void {
    this._csvColumns = this._csvColumns.filter((_, currentIndex) => currentIndex !== index);
  }

  private _updateCsvColumnField(index: number, value: string): void {
    const updated = [...this._csvColumns];
    const row = updated[index];
    if (!row) return;

    updated[index] = {
      ...row,
      field: value,
    };
    this._csvColumns = updated;
  }

  private _updateCsvColumnHeader(index: number, value: string): void {
    const updated = [...this._csvColumns];
    const row = updated[index];
    if (!row) return;

    updated[index] = {
      ...row,
      header: value,
    };
    this._csvColumns = updated;
  }

  private _resetCsvColumnsToDefault(): void {
    this._csvColumns = this._createDefaultCsvColumns();
  }

  private _addCsvStaticColumn(): void {
    this._csvStaticColumns = [...this._csvStaticColumns, { header: "", value: "" }];
  }

  private _removeCsvStaticColumn(index: number): void {
    this._csvStaticColumns = this._csvStaticColumns.filter(
      (_, currentIndex) => currentIndex !== index
    );
  }

  private _updateCsvStaticColumnHeader(index: number, value: string): void {
    const updated = [...this._csvStaticColumns];
    const row = updated[index];
    if (!row) return;

    updated[index] = {
      ...row,
      header: value,
    };
    this._csvStaticColumns = updated;
  }

  private _updateCsvStaticColumnValue(index: number, value: string): void {
    const updated = [...this._csvStaticColumns];
    const row = updated[index];
    if (!row) return;

    updated[index] = {
      ...row,
      value,
    };
    this._csvStaticColumns = updated;
  }

  private _renderFormLayoutItem(options: {
    id: string;
    label: string;
    input: unknown;
    required?: boolean;
    hint?: string;
    error?: string;
  }): unknown {
    return html`
      <uui-form-layout-item>
        <uui-label slot="label" for=${options.id} ?required=${options.required}>
          ${options.label}
        </uui-label>
        ${options.input}
        ${options.hint ? html`<span class="hint">${options.hint}</span>` : nothing}
        ${options.error ? html`<span class="error" role="alert">${options.error}</span>` : nothing}
      </uui-form-layout-item>
    `;
  }

  private _renderCsvSettingsSection(): unknown {
    return html`
      <div class="subsection">
        <h5>CSV Format (FTP/SFTP)</h5>
        <uui-checkbox
          label="Use custom CSV format for this supplier"
          ?checked=${this._useCustomCsvSettings}
          @change=${(e: Event) =>
            this._setCsvCustomEnabled((e.target as HTMLInputElement).checked)}
        >
          Use custom CSV format for this supplier
        </uui-checkbox>
        <span class="hint">
          If disabled, Supplier Direct uses its built-in default CSV columns.
        </span>

        ${this._useCustomCsvSettings
          ? html`
              <div class="csv-grid csv-grid-header">
                <span>Field key</span>
                <span>Column header</span>
                <span></span>
              </div>

              ${this._csvColumns.map(
                (column, index) => html`
                  <div class="csv-grid">
                    <uui-input
                      .value=${column.field}
                      @input=${(e: Event) =>
                        this._updateCsvColumnField(index, (e.target as HTMLInputElement).value)}
                      placeholder="e.g., OrderNumber"
                      label="Field key"
                    ></uui-input>
                    <uui-input
                      .value=${column.header}
                      @input=${(e: Event) =>
                        this._updateCsvColumnHeader(index, (e.target as HTMLInputElement).value)}
                      placeholder="e.g., Order Number"
                      label="Column header"
                    ></uui-input>
                    <uui-button
                      look="secondary"
                      compact
                      label="Remove column"
                      @click=${() => this._removeCsvColumn(index)}
                    >
                      Remove
                    </uui-button>
                  </div>
                `
              )}

              <div class="row-actions">
                <uui-button look="secondary" label="Add column" @click=${this._addCsvColumn}>
                  Add Column
                </uui-button>
                <uui-button
                  look="secondary"
                  label="Reset to defaults"
                  @click=${this._resetCsvColumnsToDefault}
                >
                  Reset Columns
                </uui-button>
              </div>
              ${this._errors.csvColumns
                ? html`<span class="error">${this._errors.csvColumns}</span>`
                : nothing}

              <h6>Static Columns</h6>
              <span class="hint">
                Static columns add fixed values to every row in this supplier CSV.
              </span>
              ${this._csvStaticColumns.map(
                (column, index) => html`
                  <div class="csv-grid">
                    <uui-input
                      .value=${column.header}
                      @input=${(e: Event) =>
                        this._updateCsvStaticColumnHeader(
                          index,
                          (e.target as HTMLInputElement).value
                        )}
                      placeholder="e.g., Source"
                      label="Static header"
                    ></uui-input>
                    <uui-input
                      .value=${column.value}
                      @input=${(e: Event) =>
                        this._updateCsvStaticColumnValue(
                          index,
                          (e.target as HTMLInputElement).value
                        )}
                      placeholder="e.g., Merchello"
                      label="Static value"
                    ></uui-input>
                    <uui-button
                      look="secondary"
                      compact
                      label="Remove static column"
                      @click=${() => this._removeCsvStaticColumn(index)}
                    >
                      Remove
                    </uui-button>
                  </div>
                `
              )}

              <div class="row-actions">
                <uui-button
                  look="secondary"
                  label="Add static column"
                  @click=${this._addCsvStaticColumn}
                >
                  Add Static Column
                </uui-button>
              </div>
              ${this._errors.csvStaticColumns
                ? html`<span class="error">${this._errors.csvStaticColumns}</span>`
                : nothing}
            `
          : html`
              <div class="default-columns">
                ${DEFAULT_CSV_COLUMNS.map((column) => html`<code>${column.field}</code>`)}
              </div>
            `}

        <div class="field-reference">
          <h6>Built-in CSV Field Keys</h6>
          <div class="field-key-list">
            ${BUILT_IN_CSV_FIELDS.map(
              (field) => html`
                <span class="field-key-item">
                  <code>${field.key}</code>
                  <span class="hint-inline">${field.label}</span>
                </span>
              `
            )}
          </div>
          <span class="hint">
            Custom field keys are also supported and are resolved from line item/order extended data.
          </span>
        </div>
      </div>
    `;
  }

  private _renderEmailSettingsSection(): unknown {
    return html`
      <div class="subsection">
        <h5>Email Settings</h5>
        ${this._renderFormLayoutItem({
          id: "supplier-email",
          label: "Supplier recipient email",
          input: html`
            <uui-input
              id="supplier-email"
              type="email"
              .value=${this._emailRecipient}
              @input=${(e: Event) => (this._emailRecipient = (e.target as HTMLInputElement).value)}
              placeholder="orders@supplier.com"
              label="Supplier recipient email">
            </uui-input>
          `,
          hint: "If empty, supplier contact email is used.",
          error: this._errors.emailRecipient,
        })}

        ${this._renderFormLayoutItem({
          id: "supplier-email-cc",
          label: "CC addresses",
          input: html`
            <uui-textarea
              id="supplier-email-cc"
              .value=${this._emailCcAddresses}
              @input=${(e: Event) => (this._emailCcAddresses = (e.target as HTMLTextAreaElement).value)}
              placeholder="warehouse@supplier.com, ops@supplier.com"
              label="CC addresses">
            </uui-textarea>
          `,
          hint: "Use comma, semicolon, or newline separators.",
          error: this._errors.emailCcAddresses,
        })}
      </div>
    `;
  }

  private _renderFtpSettingsSection(): unknown {
    return html`
      <div class="subsection">
        <h5>FTP/SFTP Settings</h5>
        ${this._renderFormLayoutItem({
          id: "ftp-host",
          label: "FTP/SFTP host",
          input: html`
            <uui-input
              id="ftp-host"
              .value=${this._ftpHost}
              @input=${(e: Event) => {
                this._ftpHost = (e.target as HTMLInputElement).value;
                this._clearFtpConnectionTestState();
              }}
              placeholder="ftp.supplier.com"
              label="FTP host">
            </uui-input>
          `,
          error: this._errors.ftpHost,
        })}

        ${this._renderFormLayoutItem({
          id: "ftp-port",
          label: "Port",
          input: html`
            <uui-input
              id="ftp-port"
              type="number"
              min="1"
              .value=${this._ftpPort}
              @input=${(e: Event) => {
                this._ftpPort = (e.target as HTMLInputElement).value;
                this._clearFtpConnectionTestState();
              }}
              placeholder=${this._deliveryMethod === "Sftp" ? "22" : "21"}
              label="Port">
            </uui-input>
          `,
          error: this._errors.ftpPort,
        })}

        ${this._renderFormLayoutItem({
          id: "ftp-username",
          label: "Username",
          input: html`
            <uui-input
              id="ftp-username"
              .value=${this._ftpUsername}
              @input=${(e: Event) => {
                this._ftpUsername = (e.target as HTMLInputElement).value;
                this._clearFtpConnectionTestState();
              }}
              label="Username">
            </uui-input>
          `,
          error: this._errors.ftpUsername,
        })}

        ${this._renderFormLayoutItem({
          id: "ftp-password",
          label: "Password",
          input: html`
            <uui-input
              id="ftp-password"
              type="password"
              .value=${this._ftpPassword}
              @input=${(e: Event) => {
                this._ftpPassword = (e.target as HTMLInputElement).value;
                this._clearFtpConnectionTestState();
              }}
              placeholder="Leave blank to keep existing password"
              label="Password">
            </uui-input>
          `,
          hint: "Leave blank when editing to keep the existing password.",
          error: this._errors.ftpPassword,
        })}

        ${this._renderFormLayoutItem({
          id: "ftp-remote-path",
          label: "Remote path",
          input: html`
            <uui-input
              id="ftp-remote-path"
              .value=${this._ftpRemotePath}
              @input=${(e: Event) => {
                this._ftpRemotePath = (e.target as HTMLInputElement).value;
                this._clearFtpConnectionTestState();
              }}
              placeholder="/orders"
              label="Remote path">
            </uui-input>
          `,
        })}

        ${this._deliveryMethod === "Sftp"
          ? html`
              ${this._renderFormLayoutItem({
                id: "sftp-host-fingerprint",
                label: "Host fingerprint",
                input: html`
                  <uui-input
                    id="sftp-host-fingerprint"
                    .value=${this._ftpHostFingerprint}
                    @input=${(e: Event) => {
                      this._ftpHostFingerprint = (e.target as HTMLInputElement).value;
                      this._clearFtpConnectionTestState();
                    }}
                    placeholder="Optional"
                    label="SFTP host fingerprint">
                  </uui-input>
                `,
                hint: "Recommended when strict host verification is enabled.",
              })}
            `
          : nothing}

        <div class="connection-test">
          <uui-button
            look="secondary"
            label=${this._isTestingFtpConnection
              ? "Testing FTP/SFTP Connection..."
              : "Test FTP/SFTP Connection"}
            ?disabled=${this._isTestingFtpConnection || this._isSaving || this._isLoading}
            @click=${this._handleTestFtpConnection}
          >
            ${this._isTestingFtpConnection
              ? html`<uui-loader-circle></uui-loader-circle>`
              : "Test FTP/SFTP Connection"}
          </uui-button>
          <span class="hint">Tests the current FTP/SFTP settings without saving supplier changes.</span>

          ${this._ftpConnectionTestError
            ? html`<span class="error" role="alert">${this._ftpConnectionTestError}</span>`
            : nothing}

          ${this._ftpConnectionTestResult
            ? html`
                <div class="connection-test-result ${this._ftpConnectionTestResult.success ? "success" : "error"}">
                  ${this._ftpConnectionTestResult.success
                    ? "Connection test successful."
                    : this._ftpConnectionTestResult.errorMessage ?? "Connection test failed."}
                </div>
              `
            : nothing}
        </div>
      </div>

      ${this._renderCsvSettingsSection()}
    `;
  }

  private _renderSupplierDirectFields(): unknown {
    return html`
      <div class="section">
        <h4>Supplier Direct Profile</h4>

        ${this._renderFormLayoutItem({
          id: "submission-trigger",
          label: "Submission trigger",
          input: html`
            <uui-select
              id="submission-trigger"
              label="Submission trigger"
              .options=${this._getSubmissionTriggerOptions()}
              @change=${(e: Event) => {
                this._submissionTrigger = ((e.target as HTMLSelectElement)
                  .value as SupplierDirectSubmissionTrigger) ?? "OnPaid";
              }}>
            </uui-select>
          `,
          hint:
            "On Paid submits automatically when payment is captured. Explicit Release requires a staff release action per order.",
        })}

        ${this._renderFormLayoutItem({
          id: "delivery-method",
          label: "Delivery method",
          input: html`
            <uui-select
              id="delivery-method"
              label="Delivery method"
              .options=${this._getDeliveryMethodOptions()}
              @change=${(e: Event) => {
                this._deliveryMethod = (e.target as HTMLSelectElement)
                  .value as SupplierDirectDeliveryMethod;
                this._clearFtpConnectionTestState();
              }}>
            </uui-select>
          `,
          hint: "Choose how this supplier receives fulfilment orders.",
        })}

        ${this._deliveryMethod === "Email"
          ? this._renderEmailSettingsSection()
          : this._renderFtpSettingsSection()}
      </div>
    `;
  }

  private _handleFormSubmit(event: Event): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    void this._handleSave();
  }

  override render() {
    const headline = this._isEditMode ? "Edit Supplier" : "Add Supplier";
    const saveLabel = this._isEditMode ? "Save Changes" : "Create Supplier";
    const savingLabel = this._isEditMode ? "Saving..." : "Creating...";

    return html`
      <umb-body-layout headline=${headline}>
        <uui-form>
          <form id="SupplierForm" @submit=${this._handleFormSubmit}>
            <div id="main">
              ${this._errors.general
                ? html`<div class="error-banner" role="alert">${this._errors.general}</div>`
                : nothing}

              ${this._isLoading
                ? html`
                    <div class="loading">
                      <uui-loader></uui-loader>
                      <span>Loading supplier settings...</span>
                    </div>
                  `
                : html`
                    <div class="section">
                      <h4>Supplier Details</h4>

                      ${this._renderFormLayoutItem({
                        id: "supplier-name",
                        label: "Supplier name",
                        required: true,
                        input: html`
                          <uui-input
                            id="supplier-name"
                            maxlength="250"
                            required
                            .value=${this._name}
                            @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
                            placeholder="e.g., Acme Distribution Co."
                            label="Supplier name">
                          </uui-input>
                        `,
                        hint: "The company or source that supplies inventory.",
                        error: this._errors.name,
                      })}

                      ${this._renderFormLayoutItem({
                        id: "supplier-code",
                        label: "Reference code",
                        input: html`
                          <uui-input
                            id="supplier-code"
                            maxlength="100"
                            .value=${this._code}
                            @input=${(e: Event) => (this._code = (e.target as HTMLInputElement).value)}
                            placeholder="e.g., SUP-001"
                            label="Supplier code">
                          </uui-input>
                        `,
                      })}

                      ${this._renderFormLayoutItem({
                        id: "contact-name",
                        label: "Contact name",
                        input: html`
                          <uui-input
                            id="contact-name"
                            maxlength="250"
                            .value=${this._contactName}
                            @input=${(e: Event) => (this._contactName = (e.target as HTMLInputElement).value)}
                            label="Contact name">
                          </uui-input>
                        `,
                      })}

                      ${this._renderFormLayoutItem({
                        id: "contact-email",
                        label: "Contact email",
                        input: html`
                          <uui-input
                            id="contact-email"
                            type="email"
                            maxlength="250"
                            .value=${this._contactEmail}
                            @input=${(e: Event) => (this._contactEmail = (e.target as HTMLInputElement).value)}
                            label="Contact email">
                          </uui-input>
                        `,
                        error: this._errors.contactEmail,
                      })}

                      ${this._renderFormLayoutItem({
                        id: "contact-phone",
                        label: "Contact phone",
                        input: html`
                          <uui-input
                            id="contact-phone"
                            maxlength="50"
                            .value=${this._contactPhone}
                            @input=${(e: Event) => (this._contactPhone = (e.target as HTMLInputElement).value)}
                            label="Contact phone">
                          </uui-input>
                        `,
                      })}
                    </div>

                    <div class="section">
                      <h4>Fulfilment</h4>
                      ${this._renderFormLayoutItem({
                        id: "fulfilment-provider",
                        label: "Default fulfilment provider",
                        input: html`
                          <uui-select
                            id="fulfilment-provider"
                            label="Fulfilment provider"
                            .options=${[
                              {
                                name: "None (manual fulfilment)",
                                value: "",
                                selected: !this._fulfilmentProviderConfigurationId,
                              },
                              ...this._fulfilmentProviderOptions
                                .filter((p) => p.isEnabled)
                                .map((p) => ({
                                  name: p.displayName,
                                  value: p.configurationId,
                                  selected: p.configurationId === this._fulfilmentProviderConfigurationId,
                                })),
                            ]}
                            @change=${(e: Event) => {
                              this._fulfilmentProviderConfigurationId = (e.target as HTMLSelectElement).value;
                              this._clearFtpConnectionTestState();
                            }}>
                          </uui-select>
                        `,
                        hint: "Used when warehouses under this supplier do not specify an override.",
                      })}
                    </div>

                    ${this._isSupplierDirectSelected()
                      ? this._renderSupplierDirectFields()
                      : html`
                          <div class="section">
                            <span class="hint">
                              Select Supplier Direct as the default fulfilment provider to configure
                              per-supplier Email, FTP, or SFTP delivery.
                            </span>
                          </div>
                        `}
                  `}
            </div>
          </form>
        </uui-form>

        <uui-button slot="actions" label="Cancel" look="secondary" @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          form="SupplierForm"
          type="submit"
          .label=${saveLabel}
          look="primary"
          color="positive"
          ?disabled=${this._isSaving || this._isLoading}>
          ${this._isSaving ? savingLabel : saveLabel}
        </uui-button>
      </umb-body-layout>
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
      gap: var(--uui-size-space-5);
    }

    .section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      padding-bottom: var(--uui-size-space-2);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .section:last-child {
      border-bottom: none;
    }

    .subsection {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
    }

    h4,
    h5,
    h6 {
      font-weight: 600;
      font-size: 0.8125rem;
      margin: 0;
    }

    h4 {
      font-size: 0.875rem;
      margin-bottom: var(--uui-size-space-1);
    }

    h5 {
      font-size: 0.8125rem;
      color: var(--uui-color-text);
    }

    h6 {
      margin-top: var(--uui-size-space-1);
    }

    uui-form-layout-item {
      margin: 0;
    }

    uui-input,
    uui-select,
    uui-textarea {
      width: 100%;
    }

    .csv-grid {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: var(--uui-size-space-2);
      align-items: center;
    }

    .csv-grid-header {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      font-weight: 600;
    }

    .row-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .connection-test {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-2);
    }

    .connection-test-result {
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      font-size: 0.8125rem;
    }

    .connection-test-result.success {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .connection-test-result.error {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .default-columns {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-1);
    }

    .field-reference {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .field-key-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: var(--uui-size-space-2);
    }

    .field-key-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--uui-size-space-1) var(--uui-size-space-2);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
    }

    .hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .hint-inline {
      font-size: 0.7rem;
      color: var(--uui-color-text-alt);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .error {
      color: var(--uui-color-danger);
      font-size: 0.75rem;
    }

    .loading {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-6);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `,
  ];
}

export default MerchelloSupplierModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-supplier-modal": MerchelloSupplierModalElement;
  }
}

