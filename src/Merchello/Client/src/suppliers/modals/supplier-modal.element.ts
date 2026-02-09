import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { SupplierModalData, SupplierModalValue } from "@suppliers/modals/supplier-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { FulfilmentProviderOptionDto } from "@fulfilment-providers/types/fulfilment-providers.types.js";
import type { SupplierDirectProfileDto } from "@suppliers/types/suppliers.types.js";

type SupplierDirectDeliveryMethod = "Email" | "Ftp" | "Sftp";
const SUPPLIER_DIRECT_PROVIDER_KEY = "supplier-direct";

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
  @state() private _emailRecipient = "";
  @state() private _ftpHost = "";
  @state() private _ftpPort = "";
  @state() private _ftpUsername = "";
  @state() private _ftpPassword = "";
  @state() private _ftpRemotePath = "";
  @state() private _ftpHostFingerprint = "";

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

    this._deliveryMethod = method;
    this._emailRecipient = profile.emailSettings?.recipientEmail ?? "";
    this._ftpHost = profile.ftpSettings?.host ?? "";
    this._ftpPort =
      profile.ftpSettings?.port !== undefined && profile.ftpSettings?.port !== null
        ? profile.ftpSettings.port.toString()
        : "";
    this._ftpUsername = profile.ftpSettings?.username ?? "";
    this._ftpPassword = "";
    this._ftpRemotePath = profile.ftpSettings?.remotePath ?? "";
    this._ftpHostFingerprint = profile.ftpSettings?.hostFingerprint ?? "";
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

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private _buildSupplierDirectProfile(): SupplierDirectProfileDto {
    if (this._deliveryMethod === "Email") {
      return {
        deliveryMethod: "Email",
        emailSettings: {
          recipientEmail: this._emailRecipient.trim() || undefined,
        },
      };
    }

    const parsedPort = this._ftpPort.trim() ? parseInt(this._ftpPort.trim(), 10) : undefined;

    return {
      deliveryMethod: this._deliveryMethod,
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

  private _renderSupplierDirectFields(): unknown {
    return html`
      <div class="section">
        <h4>Supplier Direct Profile</h4>

        <div class="form-row">
          <label for="delivery-method">Delivery Method</label>
          <uui-select
            id="delivery-method"
            label="Delivery method"
            .options=${this._getDeliveryMethodOptions()}
            @change=${(e: Event) =>
              (this._deliveryMethod = (e.target as HTMLSelectElement).value as SupplierDirectDeliveryMethod)}
          ></uui-select>
          <span class="hint">Choose how this supplier receives fulfilment orders</span>
        </div>

        ${this._deliveryMethod === "Email"
          ? html`
              <div class="form-row">
                <label for="supplier-email">Supplier Recipient Email</label>
                <uui-input
                  id="supplier-email"
                  type="email"
                  .value=${this._emailRecipient}
                  @input=${(e: Event) => (this._emailRecipient = (e.target as HTMLInputElement).value)}
                  placeholder="orders@supplier.com"
                  label="Supplier recipient email"
                ></uui-input>
                <span class="hint">If empty, supplier contact email is used</span>
                ${this._errors.emailRecipient
                  ? html`<span class="error">${this._errors.emailRecipient}</span>`
                  : nothing}
              </div>
            `
          : html`
              <div class="form-row">
                <label for="ftp-host">FTP/SFTP Host</label>
                <uui-input
                  id="ftp-host"
                  .value=${this._ftpHost}
                  @input=${(e: Event) => (this._ftpHost = (e.target as HTMLInputElement).value)}
                  placeholder="ftp.supplier.com"
                  label="FTP host"
                ></uui-input>
                ${this._errors.ftpHost ? html`<span class="error">${this._errors.ftpHost}</span>` : nothing}
              </div>

              <div class="form-row">
                <label for="ftp-port">Port</label>
                <uui-input
                  id="ftp-port"
                  type="number"
                  .value=${this._ftpPort}
                  @input=${(e: Event) => (this._ftpPort = (e.target as HTMLInputElement).value)}
                  placeholder=${this._deliveryMethod === "Sftp" ? "22" : "21"}
                  label="Port"
                ></uui-input>
                ${this._errors.ftpPort ? html`<span class="error">${this._errors.ftpPort}</span>` : nothing}
              </div>

              <div class="form-row">
                <label for="ftp-username">Username</label>
                <uui-input
                  id="ftp-username"
                  .value=${this._ftpUsername}
                  @input=${(e: Event) => (this._ftpUsername = (e.target as HTMLInputElement).value)}
                  label="Username"
                ></uui-input>
                ${this._errors.ftpUsername ? html`<span class="error">${this._errors.ftpUsername}</span>` : nothing}
              </div>

              <div class="form-row">
                <label for="ftp-password">Password</label>
                <uui-input
                  id="ftp-password"
                  type="password"
                  .value=${this._ftpPassword}
                  @input=${(e: Event) => (this._ftpPassword = (e.target as HTMLInputElement).value)}
                  placeholder="Leave blank to keep existing password"
                  label="Password"
                ></uui-input>
                ${this._errors.ftpPassword ? html`<span class="error">${this._errors.ftpPassword}</span>` : nothing}
              </div>

              <div class="form-row">
                <label for="ftp-remote-path">Remote Path</label>
                <uui-input
                  id="ftp-remote-path"
                  .value=${this._ftpRemotePath}
                  @input=${(e: Event) => (this._ftpRemotePath = (e.target as HTMLInputElement).value)}
                  placeholder="/orders"
                  label="Remote path"
                ></uui-input>
              </div>

              ${this._deliveryMethod === "Sftp"
                ? html`
                    <div class="form-row">
                      <label for="sftp-host-fingerprint">Host Fingerprint</label>
                      <uui-input
                        id="sftp-host-fingerprint"
                        .value=${this._ftpHostFingerprint}
                        @input=${(e: Event) =>
                          (this._ftpHostFingerprint = (e.target as HTMLInputElement).value)}
                        placeholder="Optional"
                        label="SFTP host fingerprint"
                      ></uui-input>
                    </div>
                  `
                : nothing}
            `}
      </div>
    `;
  }

  override render() {
    const headline = this._isEditMode ? "Edit Supplier" : "Add Supplier";
    const saveLabel = this._isEditMode ? "Save Changes" : "Create Supplier";
    const savingLabel = this._isEditMode ? "Saving..." : "Creating...";

    return html`
      <umb-body-layout headline=${headline}>
        <div id="main">
          ${this._errors.general
            ? html`<div class="error-banner">${this._errors.general}</div>`
            : nothing}

          ${this._isLoading
            ? html`
                <div class="loading">
                  <uui-loader></uui-loader>
                </div>
              `
            : html`
                <div class="section">
                  <div class="form-row">
                    <label for="supplier-name">Supplier Name <span class="required">*</span></label>
                    <uui-input
                      id="supplier-name"
                      maxlength="250"
                      .value=${this._name}
                      @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
                      placeholder="e.g., Acme Distribution Co."
                      label="Supplier name"
                    >
                    </uui-input>
                    <span class="hint">The name of the company or supplier</span>
                    ${this._errors.name ? html`<span class="error">${this._errors.name}</span>` : nothing}
                  </div>

                  <div class="form-row">
                    <label for="supplier-code">Reference Code</label>
                    <uui-input
                      id="supplier-code"
                      maxlength="100"
                      .value=${this._code}
                      @input=${(e: Event) => (this._code = (e.target as HTMLInputElement).value)}
                      placeholder="e.g., SUP-001"
                      label="Supplier code"
                    >
                    </uui-input>
                  </div>

                  <div class="form-row">
                    <label for="contact-name">Contact Name</label>
                    <uui-input
                      id="contact-name"
                      maxlength="250"
                      .value=${this._contactName}
                      @input=${(e: Event) => (this._contactName = (e.target as HTMLInputElement).value)}
                      label="Contact name"
                    >
                    </uui-input>
                  </div>

                  <div class="form-row">
                    <label for="contact-email">Contact Email</label>
                    <uui-input
                      id="contact-email"
                      type="email"
                      maxlength="250"
                      .value=${this._contactEmail}
                      @input=${(e: Event) => (this._contactEmail = (e.target as HTMLInputElement).value)}
                      label="Contact email"
                    >
                    </uui-input>
                    ${this._errors.contactEmail
                      ? html`<span class="error">${this._errors.contactEmail}</span>`
                      : nothing}
                  </div>

                  <div class="form-row">
                    <label for="contact-phone">Contact Phone</label>
                    <uui-input
                      id="contact-phone"
                      maxlength="50"
                      .value=${this._contactPhone}
                      @input=${(e: Event) => (this._contactPhone = (e.target as HTMLInputElement).value)}
                      label="Contact phone"
                    >
                    </uui-input>
                  </div>
                </div>

                <div class="section">
                  <div class="form-row">
                    <label for="fulfilment-provider">Default Fulfilment Provider</label>
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
                      @change=${(e: Event) =>
                        (this._fulfilmentProviderConfigurationId = (e.target as HTMLSelectElement).value)}
                    ></uui-select>
                    <span class="hint">Used when warehouses under this supplier do not specify an override</span>
                  </div>
                </div>

                ${this._isSupplierDirectSelected()
                  ? this._renderSupplierDirectFields()
                  : html`
                      <div class="section">
                        <span class="hint">
                          Select Supplier Direct as the default fulfilment provider to configure per-supplier Email/FTP/SFTP delivery.
                        </span>
                      </div>
                    `}
              `}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label=${saveLabel}
            look="primary"
            color="positive"
            ?disabled=${this._isSaving || this._isLoading}
            @click=${this._handleSave}
          >
            ${this._isSaving ? savingLabel : saveLabel}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
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

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    label,
    h4 {
      font-weight: 600;
      font-size: 0.8125rem;
      margin: 0;
    }

    h4 {
      font-size: 0.875rem;
      margin-bottom: var(--uui-size-space-1);
    }

    .required {
      color: var(--uui-color-danger);
    }

    uui-input,
    uui-select {
      width: 100%;
    }

    .hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
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

    .error {
      color: var(--uui-color-danger);
      font-size: 0.75rem;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloSupplierModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-supplier-modal": MerchelloSupplierModalElement;
  }
}
