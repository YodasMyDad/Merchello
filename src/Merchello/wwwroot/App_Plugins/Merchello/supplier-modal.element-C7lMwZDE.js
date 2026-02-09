import { nothing as p, html as o, css as f, state as a, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as _ } from "@umbraco-cms/backoffice/modal";
import { M as c } from "./merchello-api-BB625Gjj.js";
var g = Object.defineProperty, P = Object.getOwnPropertyDescriptor, s = (e, i, l, t) => {
  for (var n = t > 1 ? void 0 : t ? P(i, l) : i, d = e.length - 1, u; d >= 0; d--)
    (u = e[d]) && (n = (t ? u(i, l, n) : u(n)) || n);
  return t && n && g(i, l, n), n;
};
const b = "supplier-direct";
let r = class extends _ {
  constructor() {
    super(...arguments), this._name = "", this._code = "", this._contactName = "", this._contactEmail = "", this._contactPhone = "", this._fulfilmentProviderConfigurationId = "", this._fulfilmentProviderOptions = [], this._isLoadingProviders = !1, this._isLoadingSupplier = !1, this._isSaving = !1, this._errors = {}, this._deliveryMethod = "Email", this._emailRecipient = "", this._ftpHost = "", this._ftpPort = "", this._ftpUsername = "", this._ftpPassword = "", this._ftpRemotePath = "", this._ftpHostFingerprint = "";
  }
  get _isEditMode() {
    return !!this.data?.supplier;
  }
  get _isLoading() {
    return this._isLoadingProviders || this._isLoadingSupplier;
  }
  _isSupplierDirectSelected() {
    return this._fulfilmentProviderConfigurationId ? this._fulfilmentProviderOptions.find(
      (i) => i.configurationId === this._fulfilmentProviderConfigurationId
    )?.providerKey === b : !1;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.supplier && (this._name = this.data.supplier.name, this._code = this.data.supplier.code ?? "", this._fulfilmentProviderConfigurationId = this.data.supplier.fulfilmentProviderConfigurationId ?? ""), this._loadFulfilmentProviders(), this._loadSupplierDetailsIfEditing();
  }
  async _loadFulfilmentProviders() {
    this._isLoadingProviders = !0;
    const { data: e, error: i } = await c.getFulfilmentProviderOptions();
    if (i) {
      this._errors = { ...this._errors, general: i.message }, this._isLoadingProviders = !1;
      return;
    }
    this._fulfilmentProviderOptions = e ?? [], this._isLoadingProviders = !1;
  }
  async _loadSupplierDetailsIfEditing() {
    const e = this.data?.supplier?.id;
    if (!e)
      return;
    this._isLoadingSupplier = !0;
    const { data: i, error: l } = await c.getSupplier(e);
    if (l) {
      this._errors = { ...this._errors, general: l.message }, this._isLoadingSupplier = !1;
      return;
    }
    i && (this._name = i.name, this._code = i.code ?? "", this._contactName = i.contactName ?? "", this._contactEmail = i.contactEmail ?? "", this._contactPhone = i.contactPhone ?? "", this._fulfilmentProviderConfigurationId = i.fulfilmentProviderConfigurationId ?? "", i.supplierDirectProfile && this._applySupplierDirectProfile(i.supplierDirectProfile)), this._isLoadingSupplier = !1;
  }
  _applySupplierDirectProfile(e) {
    const i = e.deliveryMethod === "Ftp" || e.deliveryMethod === "Sftp" ? e.deliveryMethod : "Email";
    this._deliveryMethod = i, this._emailRecipient = e.emailSettings?.recipientEmail ?? "", this._ftpHost = e.ftpSettings?.host ?? "", this._ftpPort = e.ftpSettings?.port !== void 0 && e.ftpSettings?.port !== null ? e.ftpSettings.port.toString() : "", this._ftpUsername = e.ftpSettings?.username ?? "", this._ftpPassword = "", this._ftpRemotePath = e.ftpSettings?.remotePath ?? "", this._ftpHostFingerprint = e.ftpSettings?.hostFingerprint ?? "";
  }
  _validateEmail(e) {
    return e ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) : !0;
  }
  _validate() {
    const e = {};
    this._name.trim() || (e.name = "Supplier name is required"), this._validateEmail(this._contactEmail.trim()) || (e.contactEmail = "Contact email format is invalid");
    const i = this._isSupplierDirectSelected();
    return i && this._deliveryMethod === "Email" && !this._validateEmail(this._emailRecipient.trim()) && (e.emailRecipient = "Supplier recipient email format is invalid"), i && this._deliveryMethod === "Email" && !this._emailRecipient.trim() && !this._contactEmail.trim() && (e.emailRecipient = "Provide supplier recipient email or supplier contact email"), i && this._deliveryMethod !== "Email" && this._ftpPort.trim() && Number.isNaN(Number(this._ftpPort.trim())) && (e.ftpPort = "FTP/SFTP port must be a valid number"), i && this._deliveryMethod !== "Email" && !this._ftpHost.trim() && (e.ftpHost = "FTP/SFTP host is required"), i && this._deliveryMethod !== "Email" && !this._ftpUsername.trim() && (e.ftpUsername = "FTP/SFTP username is required"), i && this._deliveryMethod !== "Email" && !this._isEditMode && !this._ftpPassword.trim() && (e.ftpPassword = "FTP/SFTP password is required when creating a supplier"), this._errors = e, Object.keys(e).length === 0;
  }
  _buildSupplierDirectProfile() {
    if (this._deliveryMethod === "Email")
      return {
        deliveryMethod: "Email",
        emailSettings: {
          recipientEmail: this._emailRecipient.trim() || void 0
        }
      };
    const e = this._ftpPort.trim() ? parseInt(this._ftpPort.trim(), 10) : void 0;
    return {
      deliveryMethod: this._deliveryMethod,
      ftpSettings: {
        host: this._ftpHost.trim() || void 0,
        port: Number.isNaN(e) ? void 0 : e,
        username: this._ftpUsername.trim() || void 0,
        // Empty password preserves existing stored password on update.
        password: this._ftpPassword.trim() || void 0,
        remotePath: this._ftpRemotePath.trim() || void 0,
        useSftp: this._deliveryMethod === "Sftp",
        hostFingerprint: this._ftpHostFingerprint.trim() || void 0
      }
    };
  }
  async _handleSave() {
    if (!this._validate()) return;
    this._isSaving = !0;
    const e = this.data?.supplier?.fulfilmentProviderConfigurationId ?? "", i = this._isEditMode && !this._fulfilmentProviderConfigurationId && !!e, l = this._isSupplierDirectSelected(), t = {
      name: this._name.trim(),
      code: this._code.trim() || void 0,
      contactName: this._contactName.trim() || void 0,
      contactEmail: this._contactEmail.trim() || void 0,
      contactPhone: this._contactPhone.trim() || void 0,
      fulfilmentProviderConfigurationId: this._fulfilmentProviderConfigurationId || void 0,
      shouldClearFulfilmentProviderId: i || void 0,
      supplierDirectProfile: l ? this._buildSupplierDirectProfile() : void 0,
      shouldClearSupplierDirectProfile: this._isEditMode && !l ? !0 : void 0
    };
    if (this._isEditMode) {
      const u = this.data?.supplier?.id;
      if (!u) {
        this._errors = { general: "Supplier ID is missing" }, this._isSaving = !1;
        return;
      }
      const { data: m, error: h } = await c.updateSupplier(u, t);
      if (this._isSaving = !1, h) {
        this._errors = { general: h.message };
        return;
      }
      this.value = { supplier: m, isUpdated: !0 }, this.modalContext?.submit();
      return;
    }
    const { data: n, error: d } = await c.createSupplier({
      name: t.name,
      code: t.code,
      contactName: t.contactName,
      contactEmail: t.contactEmail,
      contactPhone: t.contactPhone,
      fulfilmentProviderConfigurationId: t.fulfilmentProviderConfigurationId,
      supplierDirectProfile: t.supplierDirectProfile
    });
    if (this._isSaving = !1, d) {
      this._errors = { general: d.message };
      return;
    }
    this.value = { supplier: n, isCreated: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _getDeliveryMethodOptions() {
    return [
      { name: "Email", value: "Email", selected: this._deliveryMethod === "Email" },
      { name: "FTP", value: "Ftp", selected: this._deliveryMethod === "Ftp" },
      { name: "SFTP", value: "Sftp", selected: this._deliveryMethod === "Sftp" }
    ];
  }
  _renderSupplierDirectFields() {
    return o`
      <div class="section">
        <h4>Supplier Direct Profile</h4>

        <div class="form-row">
          <label for="delivery-method">Delivery Method</label>
          <uui-select
            id="delivery-method"
            label="Delivery method"
            .options=${this._getDeliveryMethodOptions()}
            @change=${(e) => this._deliveryMethod = e.target.value}
          ></uui-select>
          <span class="hint">Choose how this supplier receives fulfilment orders</span>
        </div>

        ${this._deliveryMethod === "Email" ? o`
              <div class="form-row">
                <label for="supplier-email">Supplier Recipient Email</label>
                <uui-input
                  id="supplier-email"
                  type="email"
                  .value=${this._emailRecipient}
                  @input=${(e) => this._emailRecipient = e.target.value}
                  placeholder="orders@supplier.com"
                  label="Supplier recipient email"
                ></uui-input>
                <span class="hint">If empty, supplier contact email is used</span>
                ${this._errors.emailRecipient ? o`<span class="error">${this._errors.emailRecipient}</span>` : p}
              </div>
            ` : o`
              <div class="form-row">
                <label for="ftp-host">FTP/SFTP Host</label>
                <uui-input
                  id="ftp-host"
                  .value=${this._ftpHost}
                  @input=${(e) => this._ftpHost = e.target.value}
                  placeholder="ftp.supplier.com"
                  label="FTP host"
                ></uui-input>
                ${this._errors.ftpHost ? o`<span class="error">${this._errors.ftpHost}</span>` : p}
              </div>

              <div class="form-row">
                <label for="ftp-port">Port</label>
                <uui-input
                  id="ftp-port"
                  type="number"
                  .value=${this._ftpPort}
                  @input=${(e) => this._ftpPort = e.target.value}
                  placeholder=${this._deliveryMethod === "Sftp" ? "22" : "21"}
                  label="Port"
                ></uui-input>
                ${this._errors.ftpPort ? o`<span class="error">${this._errors.ftpPort}</span>` : p}
              </div>

              <div class="form-row">
                <label for="ftp-username">Username</label>
                <uui-input
                  id="ftp-username"
                  .value=${this._ftpUsername}
                  @input=${(e) => this._ftpUsername = e.target.value}
                  label="Username"
                ></uui-input>
                ${this._errors.ftpUsername ? o`<span class="error">${this._errors.ftpUsername}</span>` : p}
              </div>

              <div class="form-row">
                <label for="ftp-password">Password</label>
                <uui-input
                  id="ftp-password"
                  type="password"
                  .value=${this._ftpPassword}
                  @input=${(e) => this._ftpPassword = e.target.value}
                  placeholder="Leave blank to keep existing password"
                  label="Password"
                ></uui-input>
                ${this._errors.ftpPassword ? o`<span class="error">${this._errors.ftpPassword}</span>` : p}
              </div>

              <div class="form-row">
                <label for="ftp-remote-path">Remote Path</label>
                <uui-input
                  id="ftp-remote-path"
                  .value=${this._ftpRemotePath}
                  @input=${(e) => this._ftpRemotePath = e.target.value}
                  placeholder="/orders"
                  label="Remote path"
                ></uui-input>
              </div>

              ${this._deliveryMethod === "Sftp" ? o`
                    <div class="form-row">
                      <label for="sftp-host-fingerprint">Host Fingerprint</label>
                      <uui-input
                        id="sftp-host-fingerprint"
                        .value=${this._ftpHostFingerprint}
                        @input=${(e) => this._ftpHostFingerprint = e.target.value}
                        placeholder="Optional"
                        label="SFTP host fingerprint"
                      ></uui-input>
                    </div>
                  ` : p}
            `}
      </div>
    `;
  }
  render() {
    const e = this._isEditMode ? "Edit Supplier" : "Add Supplier", i = this._isEditMode ? "Save Changes" : "Create Supplier", l = this._isEditMode ? "Saving..." : "Creating...";
    return o`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._errors.general ? o`<div class="error-banner">${this._errors.general}</div>` : p}

          ${this._isLoading ? o`
                <div class="loading">
                  <uui-loader></uui-loader>
                </div>
              ` : o`
                <div class="section">
                  <div class="form-row">
                    <label for="supplier-name">Supplier Name <span class="required">*</span></label>
                    <uui-input
                      id="supplier-name"
                      maxlength="250"
                      .value=${this._name}
                      @input=${(t) => this._name = t.target.value}
                      placeholder="e.g., Acme Distribution Co."
                      label="Supplier name"
                    >
                    </uui-input>
                    <span class="hint">The name of the company or supplier</span>
                    ${this._errors.name ? o`<span class="error">${this._errors.name}</span>` : p}
                  </div>

                  <div class="form-row">
                    <label for="supplier-code">Reference Code</label>
                    <uui-input
                      id="supplier-code"
                      maxlength="100"
                      .value=${this._code}
                      @input=${(t) => this._code = t.target.value}
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
                      @input=${(t) => this._contactName = t.target.value}
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
                      @input=${(t) => this._contactEmail = t.target.value}
                      label="Contact email"
                    >
                    </uui-input>
                    ${this._errors.contactEmail ? o`<span class="error">${this._errors.contactEmail}</span>` : p}
                  </div>

                  <div class="form-row">
                    <label for="contact-phone">Contact Phone</label>
                    <uui-input
                      id="contact-phone"
                      maxlength="50"
                      .value=${this._contactPhone}
                      @input=${(t) => this._contactPhone = t.target.value}
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
        selected: !this._fulfilmentProviderConfigurationId
      },
      ...this._fulfilmentProviderOptions.filter((t) => t.isEnabled).map((t) => ({
        name: t.displayName,
        value: t.configurationId,
        selected: t.configurationId === this._fulfilmentProviderConfigurationId
      }))
    ]}
                      @change=${(t) => this._fulfilmentProviderConfigurationId = t.target.value}
                    ></uui-select>
                    <span class="hint">Used when warehouses under this supplier do not specify an override</span>
                  </div>
                </div>

                ${this._isSupplierDirectSelected() ? this._renderSupplierDirectFields() : o`
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
            label=${i}
            look="primary"
            color="positive"
            ?disabled=${this._isSaving || this._isLoading}
            @click=${this._handleSave}
          >
            ${this._isSaving ? l : i}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
r.styles = f`
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
s([
  a()
], r.prototype, "_name", 2);
s([
  a()
], r.prototype, "_code", 2);
s([
  a()
], r.prototype, "_contactName", 2);
s([
  a()
], r.prototype, "_contactEmail", 2);
s([
  a()
], r.prototype, "_contactPhone", 2);
s([
  a()
], r.prototype, "_fulfilmentProviderConfigurationId", 2);
s([
  a()
], r.prototype, "_fulfilmentProviderOptions", 2);
s([
  a()
], r.prototype, "_isLoadingProviders", 2);
s([
  a()
], r.prototype, "_isLoadingSupplier", 2);
s([
  a()
], r.prototype, "_isSaving", 2);
s([
  a()
], r.prototype, "_errors", 2);
s([
  a()
], r.prototype, "_deliveryMethod", 2);
s([
  a()
], r.prototype, "_emailRecipient", 2);
s([
  a()
], r.prototype, "_ftpHost", 2);
s([
  a()
], r.prototype, "_ftpPort", 2);
s([
  a()
], r.prototype, "_ftpUsername", 2);
s([
  a()
], r.prototype, "_ftpPassword", 2);
s([
  a()
], r.prototype, "_ftpRemotePath", 2);
s([
  a()
], r.prototype, "_ftpHostFingerprint", 2);
r = s([
  v("merchello-supplier-modal")
], r);
const $ = r;
export {
  r as MerchelloSupplierModalElement,
  $ as default
};
//# sourceMappingURL=supplier-modal.element-C7lMwZDE.js.map
