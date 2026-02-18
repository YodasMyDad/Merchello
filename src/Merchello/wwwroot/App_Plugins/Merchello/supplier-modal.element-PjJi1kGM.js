import { nothing as d, html as o, css as C, state as n, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as S } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-COnU_HX2.js";
var b = Object.defineProperty, P = Object.getOwnPropertyDescriptor, a = (e, t, s, i) => {
  for (var l = i > 1 ? void 0 : i ? P(t, s) : t, u = e.length - 1, c; u >= 0; u--)
    (c = e[u]) && (l = (i ? c(t, s, l) : c(l)) || l);
  return i && l && b(t, s, l), l;
};
const y = "supplier-direct", _ = [
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
  { field: "Phone", header: "Phone" }
], $ = [
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
  { key: "Phone", label: "Shipping phone" }
];
let r = class extends S {
  constructor() {
    super(...arguments), this._name = "", this._code = "", this._contactName = "", this._contactEmail = "", this._contactPhone = "", this._fulfilmentProviderConfigurationId = "", this._fulfilmentProviderOptions = [], this._isLoadingProviders = !1, this._isLoadingSupplier = !1, this._isSaving = !1, this._errors = {}, this._deliveryMethod = "Email", this._emailRecipient = "", this._emailCcAddresses = "", this._ftpHost = "", this._ftpPort = "", this._ftpUsername = "", this._ftpPassword = "", this._ftpRemotePath = "", this._ftpHostFingerprint = "", this._useCustomCsvSettings = !1, this._csvColumns = this._createDefaultCsvColumns(), this._csvStaticColumns = [], this._isTestingFtpConnection = !1, this._ftpConnectionTestResult = null, this._ftpConnectionTestError = null;
  }
  get _isEditMode() {
    return !!this.data?.supplier;
  }
  get _isLoading() {
    return this._isLoadingProviders || this._isLoadingSupplier;
  }
  _isSupplierDirectSelected() {
    return this._fulfilmentProviderConfigurationId ? this._fulfilmentProviderOptions.find(
      (t) => t.configurationId === this._fulfilmentProviderConfigurationId
    )?.providerKey === y : !1;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.supplier && (this._name = this.data.supplier.name, this._code = this.data.supplier.code ?? "", this._fulfilmentProviderConfigurationId = this.data.supplier.fulfilmentProviderConfigurationId ?? ""), this._loadFulfilmentProviders(), this._loadSupplierDetailsIfEditing();
  }
  _createDefaultCsvColumns() {
    return _.map((e) => ({ ...e }));
  }
  _parseEmailList(e) {
    return e.split(/[\n,;]+/g).map((t) => t.trim()).filter((t) => t.length > 0);
  }
  _normalizeCsvColumns(e) {
    return e.map((t) => ({
      field: t.field.trim(),
      header: t.header.trim()
    })).filter((t) => t.field.length > 0 && t.header.length > 0);
  }
  _normalizeCsvStaticColumns(e) {
    return e.map((t) => ({
      header: t.header.trim(),
      value: t.value.trim()
    })).filter((t) => t.header.length > 0);
  }
  async _loadFulfilmentProviders() {
    this._isLoadingProviders = !0;
    const { data: e, error: t } = await v.getFulfilmentProviderOptions();
    if (t) {
      this._errors = { ...this._errors, general: t.message }, this._isLoadingProviders = !1;
      return;
    }
    this._fulfilmentProviderOptions = e ?? [], this._isLoadingProviders = !1;
  }
  async _loadSupplierDetailsIfEditing() {
    const e = this.data?.supplier?.id;
    if (!e)
      return;
    this._isLoadingSupplier = !0;
    const { data: t, error: s } = await v.getSupplier(e);
    if (s) {
      this._errors = { ...this._errors, general: s.message }, this._isLoadingSupplier = !1;
      return;
    }
    t && (this._name = t.name, this._code = t.code ?? "", this._contactName = t.contactName ?? "", this._contactEmail = t.contactEmail ?? "", this._contactPhone = t.contactPhone ?? "", this._fulfilmentProviderConfigurationId = t.fulfilmentProviderConfigurationId ?? "", t.supplierDirectProfile && this._applySupplierDirectProfile(t.supplierDirectProfile)), this._isLoadingSupplier = !1;
  }
  _applySupplierDirectProfile(e) {
    const t = e.deliveryMethod === "Ftp" || e.deliveryMethod === "Sftp" ? e.deliveryMethod : "Email";
    this._deliveryMethod = t, this._emailRecipient = e.emailSettings?.recipientEmail ?? "", this._emailCcAddresses = (e.emailSettings?.ccAddresses ?? []).join(", "), this._ftpHost = e.ftpSettings?.host ?? "", this._ftpPort = e.ftpSettings?.port !== void 0 && e.ftpSettings?.port !== null ? e.ftpSettings.port.toString() : "", this._ftpUsername = e.ftpSettings?.username ?? "", this._ftpPassword = "", this._ftpRemotePath = e.ftpSettings?.remotePath ?? "", this._ftpHostFingerprint = e.ftpSettings?.hostFingerprint ?? "";
    const s = Object.entries(e.csvSettings?.columns ?? {}).map(
      ([u, c]) => ({ field: u, header: c })
    ), i = Object.entries(e.csvSettings?.staticColumns ?? {}).map(
      ([u, c]) => ({ header: u, value: c })
    ), l = s.length > 0 || i.length > 0;
    this._useCustomCsvSettings = l, this._csvColumns = l ? s : this._createDefaultCsvColumns(), this._csvStaticColumns = l ? i : [], this._clearFtpConnectionTestState();
  }
  _validateEmail(e) {
    return e ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) : !0;
  }
  _validate() {
    const e = {};
    this._name.trim() || (e.name = "Supplier name is required"), this._validateEmail(this._contactEmail.trim()) || (e.contactEmail = "Contact email format is invalid");
    const t = this._isSupplierDirectSelected();
    if (this._parseEmailList(this._emailCcAddresses).some((i) => !this._validateEmail(i)) && (e.emailCcAddresses = "One or more CC email addresses are invalid"), t && this._deliveryMethod === "Email" && !this._validateEmail(this._emailRecipient.trim()) && (e.emailRecipient = "Supplier recipient email format is invalid"), t && this._deliveryMethod === "Email" && !this._emailRecipient.trim() && !this._contactEmail.trim() && (e.emailRecipient = "Provide supplier recipient email or supplier contact email"), t && this._deliveryMethod !== "Email" && this._ftpPort.trim() && Number.isNaN(Number(this._ftpPort.trim())) && (e.ftpPort = "FTP/SFTP port must be a valid number"), t && this._deliveryMethod !== "Email" && !this._ftpHost.trim() && (e.ftpHost = "FTP/SFTP host is required"), t && this._deliveryMethod !== "Email" && !this._ftpUsername.trim() && (e.ftpUsername = "FTP/SFTP username is required"), t && this._deliveryMethod !== "Email" && !this._isEditMode && !this._ftpPassword.trim() && (e.ftpPassword = "FTP/SFTP password is required when creating a supplier"), t && this._deliveryMethod !== "Email" && this._useCustomCsvSettings) {
      this._csvColumns.some(
        (p) => !p.field.trim() || !p.header.trim()
      ) && (e.csvColumns = "Each CSV column row must include both a field key and a header."), this._csvStaticColumns.some(
        (p) => !p.header.trim()
      ) && (e.csvStaticColumns = "Each static column requires a header.");
      const u = this._normalizeCsvColumns(this._csvColumns), c = this._normalizeCsvStaticColumns(this._csvStaticColumns);
      u.length === 0 && c.length === 0 && (e.csvColumns = "Add at least one CSV column or static column, or disable custom CSV format.");
      const f = /* @__PURE__ */ new Set();
      for (const p of u) {
        const m = p.field.toLowerCase();
        if (f.has(m)) {
          e.csvColumns = `CSV field '${p.field}' is duplicated.`;
          break;
        }
        f.add(m);
      }
      const h = /* @__PURE__ */ new Set();
      for (const p of c) {
        const m = p.header.toLowerCase();
        if (h.has(m)) {
          e.csvStaticColumns = `Static column header '${p.header}' is duplicated.`;
          break;
        }
        h.add(m);
      }
    }
    return this._errors = e, Object.keys(e).length === 0;
  }
  _buildCsvSettings() {
    if (!this._useCustomCsvSettings)
      return {};
    const e = this._normalizeCsvColumns(this._csvColumns), t = this._normalizeCsvStaticColumns(this._csvStaticColumns);
    return {
      columns: e.length > 0 ? Object.fromEntries(e.map((s) => [s.field, s.header])) : void 0,
      staticColumns: t.length > 0 ? Object.fromEntries(t.map((s) => [s.header, s.value])) : void 0
    };
  }
  _buildSupplierDirectProfile() {
    const e = this._parseEmailList(this._emailCcAddresses), t = this._buildCsvSettings(), s = this._emailRecipient.trim() || e.length > 0 ? {
      recipientEmail: this._emailRecipient.trim() || void 0,
      ccAddresses: e.length > 0 ? e : void 0
    } : void 0;
    if (this._deliveryMethod === "Email")
      return {
        deliveryMethod: "Email",
        emailSettings: s,
        csvSettings: t
      };
    const i = this._ftpPort.trim() ? parseInt(this._ftpPort.trim(), 10) : void 0;
    return {
      deliveryMethod: this._deliveryMethod,
      emailSettings: s,
      ftpSettings: {
        host: this._ftpHost.trim() || void 0,
        port: Number.isNaN(i) ? void 0 : i,
        username: this._ftpUsername.trim() || void 0,
        // Empty password preserves existing stored password on update.
        password: this._ftpPassword.trim() || void 0,
        remotePath: this._ftpRemotePath.trim() || void 0,
        useSftp: this._deliveryMethod === "Sftp",
        hostFingerprint: this._ftpHostFingerprint.trim() || void 0
      },
      csvSettings: t
    };
  }
  _clearFtpConnectionTestState() {
    this._ftpConnectionTestResult = null, this._ftpConnectionTestError = null;
  }
  async _handleTestFtpConnection() {
    if (this._deliveryMethod === "Email")
      return;
    const e = this._ftpHost.trim(), t = this._ftpUsername.trim(), s = this._ftpPassword.trim(), i = this._ftpPort.trim() ? parseInt(this._ftpPort.trim(), 10) : void 0;
    if (this._clearFtpConnectionTestState(), !e) {
      this._ftpConnectionTestError = "FTP/SFTP host is required to test the connection.";
      return;
    }
    if (!t) {
      this._ftpConnectionTestError = "FTP/SFTP username is required to test the connection.";
      return;
    }
    if (this._ftpPort.trim() && Number.isNaN(i)) {
      this._ftpConnectionTestError = "FTP/SFTP port must be a valid number.";
      return;
    }
    if (i !== void 0 && i <= 0) {
      this._ftpConnectionTestError = "FTP/SFTP port must be greater than 0.";
      return;
    }
    if (!s && !this._isEditMode) {
      this._ftpConnectionTestError = "FTP/SFTP password is required to test the connection when creating a supplier.";
      return;
    }
    this._isTestingFtpConnection = !0;
    const { data: l, error: u } = await v.testSupplierFtpConnection({
      supplierId: this.data?.supplier?.id,
      deliveryMethod: this._deliveryMethod,
      ftpSettings: {
        host: e || void 0,
        port: Number.isNaN(i) ? void 0 : i,
        username: t || void 0,
        password: s || void 0,
        remotePath: this._ftpRemotePath.trim() || void 0,
        useSftp: this._deliveryMethod === "Sftp",
        hostFingerprint: this._ftpHostFingerprint.trim() || void 0
      }
    });
    if (this._isTestingFtpConnection = !1, u) {
      this._ftpConnectionTestError = u.message;
      return;
    }
    this._ftpConnectionTestResult = l ?? {
      success: !1,
      errorMessage: "No response returned from connection test."
    };
  }
  async _handleSave() {
    if (!this._validate()) return;
    this._isSaving = !0;
    const e = this.data?.supplier?.fulfilmentProviderConfigurationId ?? "", t = this._isEditMode && !this._fulfilmentProviderConfigurationId && !!e, s = this._isSupplierDirectSelected(), i = {
      name: this._name.trim(),
      code: this._code.trim() || void 0,
      contactName: this._contactName.trim() || void 0,
      contactEmail: this._contactEmail.trim() || void 0,
      contactPhone: this._contactPhone.trim() || void 0,
      fulfilmentProviderConfigurationId: this._fulfilmentProviderConfigurationId || void 0,
      shouldClearFulfilmentProviderId: t || void 0,
      supplierDirectProfile: s ? this._buildSupplierDirectProfile() : void 0,
      shouldClearSupplierDirectProfile: this._isEditMode && !s ? !0 : void 0
    };
    if (this._isEditMode) {
      const c = this.data?.supplier?.id;
      if (!c) {
        this._errors = { general: "Supplier ID is missing" }, this._isSaving = !1;
        return;
      }
      const { data: f, error: h } = await v.updateSupplier(c, i);
      if (this._isSaving = !1, h) {
        this._errors = { general: h.message };
        return;
      }
      this.value = { supplier: f, isUpdated: !0 }, this.modalContext?.submit();
      return;
    }
    const { data: l, error: u } = await v.createSupplier({
      name: i.name,
      code: i.code,
      contactName: i.contactName,
      contactEmail: i.contactEmail,
      contactPhone: i.contactPhone,
      fulfilmentProviderConfigurationId: i.fulfilmentProviderConfigurationId,
      supplierDirectProfile: i.supplierDirectProfile
    });
    if (this._isSaving = !1, u) {
      this._errors = { general: u.message };
      return;
    }
    this.value = { supplier: l, isCreated: !0 }, this.modalContext?.submit();
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
  _setCsvCustomEnabled(e) {
    this._useCustomCsvSettings = e, e && this._csvColumns.length === 0 && this._csvStaticColumns.length === 0 && (this._csvColumns = this._createDefaultCsvColumns());
  }
  _addCsvColumn() {
    this._csvColumns = [...this._csvColumns, { field: "", header: "" }];
  }
  _removeCsvColumn(e) {
    this._csvColumns = this._csvColumns.filter((t, s) => s !== e);
  }
  _updateCsvColumnField(e, t) {
    const s = [...this._csvColumns], i = s[e];
    i && (s[e] = {
      ...i,
      field: t
    }, this._csvColumns = s);
  }
  _updateCsvColumnHeader(e, t) {
    const s = [...this._csvColumns], i = s[e];
    i && (s[e] = {
      ...i,
      header: t
    }, this._csvColumns = s);
  }
  _resetCsvColumnsToDefault() {
    this._csvColumns = this._createDefaultCsvColumns();
  }
  _addCsvStaticColumn() {
    this._csvStaticColumns = [...this._csvStaticColumns, { header: "", value: "" }];
  }
  _removeCsvStaticColumn(e) {
    this._csvStaticColumns = this._csvStaticColumns.filter(
      (t, s) => s !== e
    );
  }
  _updateCsvStaticColumnHeader(e, t) {
    const s = [...this._csvStaticColumns], i = s[e];
    i && (s[e] = {
      ...i,
      header: t
    }, this._csvStaticColumns = s);
  }
  _updateCsvStaticColumnValue(e, t) {
    const s = [...this._csvStaticColumns], i = s[e];
    i && (s[e] = {
      ...i,
      value: t
    }, this._csvStaticColumns = s);
  }
  _renderCsvSettingsSection() {
    return o`
      <div class="subsection">
        <h5>CSV Format (FTP/SFTP)</h5>
        <uui-checkbox
          label="Use custom CSV format for this supplier"
          ?checked=${this._useCustomCsvSettings}
          @change=${(e) => this._setCsvCustomEnabled(e.target.checked)}
        >
          Use custom CSV format for this supplier
        </uui-checkbox>
        <span class="hint">
          If disabled, Supplier Direct uses its built-in default CSV columns.
        </span>

        ${this._useCustomCsvSettings ? o`
              <div class="csv-grid csv-grid-header">
                <span>Field key</span>
                <span>Column header</span>
                <span></span>
              </div>

              ${this._csvColumns.map(
      (e, t) => o`
                  <div class="csv-grid">
                    <uui-input
                      .value=${e.field}
                      @input=${(s) => this._updateCsvColumnField(t, s.target.value)}
                      placeholder="e.g., OrderNumber"
                      label="Field key"
                    ></uui-input>
                    <uui-input
                      .value=${e.header}
                      @input=${(s) => this._updateCsvColumnHeader(t, s.target.value)}
                      placeholder="e.g., Order Number"
                      label="Column header"
                    ></uui-input>
                    <uui-button
                      look="secondary"
                      compact
                      label="Remove column"
                      @click=${() => this._removeCsvColumn(t)}
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
              ${this._errors.csvColumns ? o`<span class="error">${this._errors.csvColumns}</span>` : d}

              <h6>Static Columns</h6>
              <span class="hint">
                Static columns add fixed values to every row in this supplier CSV.
              </span>
              ${this._csvStaticColumns.map(
      (e, t) => o`
                  <div class="csv-grid">
                    <uui-input
                      .value=${e.header}
                      @input=${(s) => this._updateCsvStaticColumnHeader(
        t,
        s.target.value
      )}
                      placeholder="e.g., Source"
                      label="Static header"
                    ></uui-input>
                    <uui-input
                      .value=${e.value}
                      @input=${(s) => this._updateCsvStaticColumnValue(
        t,
        s.target.value
      )}
                      placeholder="e.g., Merchello"
                      label="Static value"
                    ></uui-input>
                    <uui-button
                      look="secondary"
                      compact
                      label="Remove static column"
                      @click=${() => this._removeCsvStaticColumn(t)}
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
              ${this._errors.csvStaticColumns ? o`<span class="error">${this._errors.csvStaticColumns}</span>` : d}
            ` : o`
              <div class="default-columns">
                ${_.map((e) => o`<code>${e.field}</code>`)}
              </div>
            `}

        <div class="field-reference">
          <h6>Built-in CSV Field Keys</h6>
          <div class="field-key-list">
            ${$.map(
      (e) => o`
                <span class="field-key-item">
                  <code>${e.key}</code>
                  <span class="hint-inline">${e.label}</span>
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
  _renderEmailSettingsSection() {
    return o`
      <div class="subsection">
        <h5>Email Settings</h5>
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
          ${this._errors.emailRecipient ? o`<span class="error">${this._errors.emailRecipient}</span>` : d}
        </div>

        <div class="form-row">
          <label for="supplier-email-cc">CC Addresses</label>
          <uui-textarea
            id="supplier-email-cc"
            .value=${this._emailCcAddresses}
            @input=${(e) => this._emailCcAddresses = e.target.value}
            placeholder="warehouse@supplier.com, ops@supplier.com"
            label="CC addresses"
          ></uui-textarea>
          <span class="hint">Comma, semicolon, or newline separated email addresses</span>
          ${this._errors.emailCcAddresses ? o`<span class="error">${this._errors.emailCcAddresses}</span>` : d}
        </div>
      </div>
    `;
  }
  _renderFtpSettingsSection() {
    return o`
      <div class="subsection">
        <h5>FTP/SFTP Settings</h5>
        <div class="form-row">
          <label for="ftp-host">FTP/SFTP Host</label>
          <uui-input
            id="ftp-host"
            .value=${this._ftpHost}
            @input=${(e) => {
      this._ftpHost = e.target.value, this._clearFtpConnectionTestState();
    }}
            placeholder="ftp.supplier.com"
            label="FTP host"
          ></uui-input>
          ${this._errors.ftpHost ? o`<span class="error">${this._errors.ftpHost}</span>` : d}
        </div>

        <div class="form-row">
          <label for="ftp-port">Port</label>
          <uui-input
            id="ftp-port"
            type="number"
            .value=${this._ftpPort}
            @input=${(e) => {
      this._ftpPort = e.target.value, this._clearFtpConnectionTestState();
    }}
            placeholder=${this._deliveryMethod === "Sftp" ? "22" : "21"}
            label="Port"
          ></uui-input>
          ${this._errors.ftpPort ? o`<span class="error">${this._errors.ftpPort}</span>` : d}
        </div>

        <div class="form-row">
          <label for="ftp-username">Username</label>
          <uui-input
            id="ftp-username"
            .value=${this._ftpUsername}
            @input=${(e) => {
      this._ftpUsername = e.target.value, this._clearFtpConnectionTestState();
    }}
            label="Username"
          ></uui-input>
          ${this._errors.ftpUsername ? o`<span class="error">${this._errors.ftpUsername}</span>` : d}
        </div>

        <div class="form-row">
          <label for="ftp-password">Password</label>
          <uui-input
            id="ftp-password"
            type="password"
            .value=${this._ftpPassword}
            @input=${(e) => {
      this._ftpPassword = e.target.value, this._clearFtpConnectionTestState();
    }}
            placeholder="Leave blank to keep existing password"
            label="Password"
          ></uui-input>
          ${this._errors.ftpPassword ? o`<span class="error">${this._errors.ftpPassword}</span>` : d}
        </div>

        <div class="form-row">
          <label for="ftp-remote-path">Remote Path</label>
          <uui-input
            id="ftp-remote-path"
            .value=${this._ftpRemotePath}
            @input=${(e) => {
      this._ftpRemotePath = e.target.value, this._clearFtpConnectionTestState();
    }}
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
                  @input=${(e) => {
      this._ftpHostFingerprint = e.target.value, this._clearFtpConnectionTestState();
    }}
                  placeholder="Optional"
                  label="SFTP host fingerprint"
                ></uui-input>
                <span class="hint">Recommended for strict host verification</span>
              </div>
            ` : d}

        <div class="connection-test">
          <uui-button
            look="secondary"
            label=${this._isTestingFtpConnection ? "Testing FTP/SFTP Connection..." : "Test FTP/SFTP Connection"}
            ?disabled=${this._isTestingFtpConnection || this._isSaving || this._isLoading}
            @click=${this._handleTestFtpConnection}
          >
            ${this._isTestingFtpConnection ? o`<uui-loader-circle></uui-loader-circle>` : "Test FTP/SFTP Connection"}
          </uui-button>
          <span class="hint">Tests the current FTP/SFTP settings without saving supplier changes.</span>

          ${this._ftpConnectionTestError ? o`<span class="error">${this._ftpConnectionTestError}</span>` : d}

          ${this._ftpConnectionTestResult ? o`
                <div class="connection-test-result ${this._ftpConnectionTestResult.success ? "success" : "error"}">
                  ${this._ftpConnectionTestResult.success ? "Connection test successful." : this._ftpConnectionTestResult.errorMessage ?? "Connection test failed."}
                </div>
              ` : d}
        </div>
      </div>

      ${this._renderCsvSettingsSection()}
    `;
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
            @change=${(e) => {
      this._deliveryMethod = e.target.value, this._clearFtpConnectionTestState();
    }}
          ></uui-select>
          <span class="hint">Choose how this supplier receives fulfilment orders</span>
        </div>

        ${this._deliveryMethod === "Email" ? this._renderEmailSettingsSection() : this._renderFtpSettingsSection()}
      </div>
    `;
  }
  render() {
    const e = this._isEditMode ? "Edit Supplier" : "Add Supplier", t = this._isEditMode ? "Save Changes" : "Create Supplier", s = this._isEditMode ? "Saving..." : "Creating...";
    return o`
      <umb-body-layout headline=${e}>
        <div id="main">
          ${this._errors.general ? o`<div class="error-banner">${this._errors.general}</div>` : d}

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
                      @input=${(i) => this._name = i.target.value}
                      placeholder="e.g., Acme Distribution Co."
                      label="Supplier name"
                    >
                    </uui-input>
                    <span class="hint">The name of the company or supplier</span>
                    ${this._errors.name ? o`<span class="error">${this._errors.name}</span>` : d}
                  </div>

                  <div class="form-row">
                    <label for="supplier-code">Reference Code</label>
                    <uui-input
                      id="supplier-code"
                      maxlength="100"
                      .value=${this._code}
                      @input=${(i) => this._code = i.target.value}
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
                      @input=${(i) => this._contactName = i.target.value}
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
                      @input=${(i) => this._contactEmail = i.target.value}
                      label="Contact email"
                    >
                    </uui-input>
                    ${this._errors.contactEmail ? o`<span class="error">${this._errors.contactEmail}</span>` : d}
                  </div>

                  <div class="form-row">
                    <label for="contact-phone">Contact Phone</label>
                    <uui-input
                      id="contact-phone"
                      maxlength="50"
                      .value=${this._contactPhone}
                      @input=${(i) => this._contactPhone = i.target.value}
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
      ...this._fulfilmentProviderOptions.filter((i) => i.isEnabled).map((i) => ({
        name: i.displayName,
        value: i.configurationId,
        selected: i.configurationId === this._fulfilmentProviderConfigurationId
      }))
    ]}
                      @change=${(i) => {
      this._fulfilmentProviderConfigurationId = i.target.value, this._clearFtpConnectionTestState();
    }}
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
            label=${t}
            look="primary"
            color="positive"
            ?disabled=${this._isSaving || this._isLoading}
            @click=${this._handleSave}
          >
            ${this._isSaving ? s : t}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
r.styles = C`
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

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    label,
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

    .required {
      color: var(--uui-color-danger);
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
a([
  n()
], r.prototype, "_name", 2);
a([
  n()
], r.prototype, "_code", 2);
a([
  n()
], r.prototype, "_contactName", 2);
a([
  n()
], r.prototype, "_contactEmail", 2);
a([
  n()
], r.prototype, "_contactPhone", 2);
a([
  n()
], r.prototype, "_fulfilmentProviderConfigurationId", 2);
a([
  n()
], r.prototype, "_fulfilmentProviderOptions", 2);
a([
  n()
], r.prototype, "_isLoadingProviders", 2);
a([
  n()
], r.prototype, "_isLoadingSupplier", 2);
a([
  n()
], r.prototype, "_isSaving", 2);
a([
  n()
], r.prototype, "_errors", 2);
a([
  n()
], r.prototype, "_deliveryMethod", 2);
a([
  n()
], r.prototype, "_emailRecipient", 2);
a([
  n()
], r.prototype, "_emailCcAddresses", 2);
a([
  n()
], r.prototype, "_ftpHost", 2);
a([
  n()
], r.prototype, "_ftpPort", 2);
a([
  n()
], r.prototype, "_ftpUsername", 2);
a([
  n()
], r.prototype, "_ftpPassword", 2);
a([
  n()
], r.prototype, "_ftpRemotePath", 2);
a([
  n()
], r.prototype, "_ftpHostFingerprint", 2);
a([
  n()
], r.prototype, "_useCustomCsvSettings", 2);
a([
  n()
], r.prototype, "_csvColumns", 2);
a([
  n()
], r.prototype, "_csvStaticColumns", 2);
a([
  n()
], r.prototype, "_isTestingFtpConnection", 2);
a([
  n()
], r.prototype, "_ftpConnectionTestResult", 2);
a([
  n()
], r.prototype, "_ftpConnectionTestError", 2);
r = a([
  g("merchello-supplier-modal")
], r);
const w = r;
export {
  r as MerchelloSupplierModalElement,
  w as default
};
//# sourceMappingURL=supplier-modal.element-PjJi1kGM.js.map
