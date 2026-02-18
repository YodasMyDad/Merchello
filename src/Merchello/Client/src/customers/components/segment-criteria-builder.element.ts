import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type {
  SegmentCriteriaDto,
  SegmentMatchMode,
  CriteriaFieldMetadataDto,
} from "@customers/types/segment.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

interface CriteriaRow extends SegmentCriteriaDto {
  id: string; // Unique ID for tracking in UI
}

@customElement("merchello-segment-criteria-builder")
export class MerchelloSegmentCriteriaBuilderElement extends UmbElementMixin(LitElement) {
  @property({ type: Array }) criteria: SegmentCriteriaDto[] = [];
  @property({ type: String }) matchMode: SegmentMatchMode = "All";

  @state() private _criteriaRows: CriteriaRow[] = [];
  @state() private _availableFields: CriteriaFieldMetadataDto[] = [];
  @state() private _isLoadingFields = true;
  @state() private _fieldLoadError: string | null = null;

  #isConnected = false;
  #rowIdCounter = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadAvailableFields();
    this._initializeCriteriaRows();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("criteria")) {
      this._initializeCriteriaRows();
    }
  }

  private _initializeCriteriaRows(): void {
    this._criteriaRows = (this.criteria || []).map((c) => ({
      ...c,
      id: `row-${this.#rowIdCounter++}`,
    }));
  }

  private async _loadAvailableFields(): Promise<void> {
    this._isLoadingFields = true;
    this._fieldLoadError = null;

    const { data, error } = await MerchelloApi.getCriteriaFields();

    if (!this.#isConnected) return;

    if (error) {
      this._fieldLoadError = error.message;
      this._isLoadingFields = false;
      return;
    }

    this._availableFields = data ?? [];
    this._isLoadingFields = false;
  }

  private _getFieldMetadata(fieldName: string): CriteriaFieldMetadataDto | undefined {
    return this._availableFields.find((f) => f.field === fieldName);
  }

  private _getOperatorsForField(fieldName: string): string[] {
    const metadata = this._getFieldMetadata(fieldName);
    return metadata?.supportedOperators ?? [];
  }

  private _getOperatorLabel(operator: string): string {
    const labels: Record<string, string> = {
      Equals: "equals",
      NotEquals: "does not equal",
      GreaterThan: "is greater than",
      GreaterThanOrEqual: "is at least",
      LessThan: "is less than",
      LessThanOrEqual: "is at most",
      Between: "is between",
      Contains: "contains",
      NotContains: "does not contain",
      StartsWith: "starts with",
      EndsWith: "ends with",
      IsEmpty: "is empty",
      IsNotEmpty: "is not empty",
    };
    return labels[operator] ?? operator;
  }

  private _addCriterion(): void {
    const defaultField = this._availableFields[0]?.field ?? "OrderCount";
    const operators = this._getOperatorsForField(defaultField);
    const defaultOperator = operators[0] ?? "Equals";

    const newRow: CriteriaRow = {
      id: `row-${this.#rowIdCounter++}`,
      field: defaultField,
      operator: defaultOperator,
      value: null,
      value2: undefined,
    };

    this._criteriaRows = [...this._criteriaRows, newRow];
    this._emitChange();
  }

  private _removeCriterion(rowId: string): void {
    this._criteriaRows = this._criteriaRows.filter((r) => r.id !== rowId);
    this._emitChange();
  }

  private _updateCriterion(rowId: string, updates: Partial<SegmentCriteriaDto>): void {
    this._criteriaRows = this._criteriaRows.map((row) => {
      if (row.id !== rowId) return row;

      const updated = { ...row, ...updates };

      // If field changed, reset operator and value
      if (updates.field && updates.field !== row.field) {
        const operators = this._getOperatorsForField(updates.field);
        updated.operator = operators[0] ?? "Equals";
        updated.value = null;
        updated.value2 = undefined;
      }

      // If operator changed to non-Between, clear value2
      if (updates.operator && updates.operator !== "Between") {
        updated.value2 = undefined;
      }

      return updated;
    });
    this._emitChange();
  }

  private _emitChange(): void {
    const criteria: SegmentCriteriaDto[] = this._criteriaRows.map(({ field, operator, value, value2 }) => ({
      field,
      operator,
      value,
      value2,
    }));

    this.dispatchEvent(
      new CustomEvent("criteria-changed", {
        detail: { criteria },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderFieldSelect(row: CriteriaRow, rowIndex: number): unknown {
    return html`
      <uui-select
        label=${`Criterion ${rowIndex + 1} field`}
        .options=${this._availableFields.map((f) => ({
          name: f.label,
          value: f.field,
          selected: f.field === row.field,
        }))}
        @change=${(e: Event) => {
          const select = e.target as HTMLSelectElement;
          this._updateCriterion(row.id, { field: select.value });
        }}>
      </uui-select>
    `;
  }

  private _renderOperatorSelect(row: CriteriaRow, rowIndex: number): unknown {
    const operators = this._getOperatorsForField(row.field);

    return html`
      <uui-select
        label=${`Criterion ${rowIndex + 1} operator`}
        .options=${operators.map((op) => ({
          name: this._getOperatorLabel(op),
          value: op,
          selected: op === row.operator,
        }))}
        @change=${(e: Event) => {
          const select = e.target as HTMLSelectElement;
          this._updateCriterion(row.id, { operator: select.value });
        }}>
      </uui-select>
    `;
  }

  private _renderValueInput(row: CriteriaRow, rowIndex: number): unknown {
    // No value needed for IsEmpty/IsNotEmpty
    if (row.operator === "IsEmpty" || row.operator === "IsNotEmpty") {
      return nothing;
    }

    const fieldMetadata = this._getFieldMetadata(row.field);
    const valueType = fieldMetadata?.valueType ?? "String";

    const inputType = valueType === "Number" || valueType === "Currency" ? "number" : valueType === "Date" ? "date" : "text";

    const renderInput = (
      value: unknown,
      onInput: (val: unknown) => void,
      inputLabel: string
    ) => html`
      <uui-input
        label=${inputLabel}
        type=${inputType}
        .value=${value ?? ""}
        @input=${(e: Event) => {
          const input = e.target as HTMLInputElement;
          let val: unknown = input.value;
          if (inputType === "number") {
            val = input.value ? Number(input.value) : null;
          }
          onInput(val);
        }}
        placeholder=${valueType === "Currency" ? "Amount" : valueType === "Date" ? "Select date" : "Value"}>
      </uui-input>
    `;

    if (row.operator === "Between") {
      return html`
        <div class="between-inputs">
          ${renderInput(
            row.value,
            (val) => this._updateCriterion(row.id, { value: val }),
            `Criterion ${rowIndex + 1} value from`
          )}
          <span class="between-and">and</span>
          ${renderInput(
            row.value2,
            (val) => this._updateCriterion(row.id, { value2: val }),
            `Criterion ${rowIndex + 1} value to`
          )}
        </div>
      `;
    }

    return renderInput(
      row.value,
      (val) => this._updateCriterion(row.id, { value: val }),
      `Criterion ${rowIndex + 1} value`
    );
  }

  private _renderCriterionRow(row: CriteriaRow, index: number): unknown {
    return html`
      <div class="criterion-row">
        <span class="row-prefix">${index === 0 ? "Where" : this.matchMode === "All" ? "AND" : "OR"}</span>
        <div class="row-inputs">
          ${this._renderFieldSelect(row, index)}
          ${this._renderOperatorSelect(row, index)}
          ${this._renderValueInput(row, index)}
        </div>
        <uui-button
          compact
          look="secondary"
          label="Remove"
          @click=${() => this._removeCriterion(row.id)}>
          <uui-icon name="icon-delete"></uui-icon>
        </uui-button>
      </div>
    `;
  }

  override render() {
    if (this._isLoadingFields) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    if (this._fieldLoadError) {
      return html`
        <uui-box headline="Criteria rules">
          <div class="error-banner" role="alert">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._fieldLoadError}</span>
          </div>
          <uui-button
            look="secondary"
            label="Retry loading fields"
            @click=${() => this._loadAvailableFields()}>
            Retry
          </uui-button>
        </uui-box>
      `;
    }

    return html`
      <uui-box headline="Criteria Rules">
        <div class="criteria-builder">
          <p class="description">
            Define the conditions that customers must match to be included in this segment.
            ${this.matchMode === "All"
              ? "All conditions must be met (AND)."
              : "Any condition can be met (OR)."}
          </p>

          ${this._criteriaRows.length === 0
            ? html`<p class="empty-hint">No criteria defined. Add conditions to filter customers.</p>`
            : html`
                <div class="criteria-list">
                  ${this._criteriaRows.map((row, index) => this._renderCriterionRow(row, index))}
                </div>
              `}

          <div class="add-criterion">
            <uui-button
              look="primary"
              label="Add Condition"
              ?disabled=${this._availableFields.length === 0}
              @click=${this._addCriterion}>
              <uui-icon name="icon-add"></uui-icon>
              Add Condition
            </uui-button>
          </div>
        </div>
      </uui-box>
    `;
  }

  static override readonly styles = [
    css`
      :host {
        display: block;
      }

      .criteria-builder {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .description {
        color: var(--uui-color-text-alt);
        margin: 0;
      }

      .empty-hint {
        color: var(--uui-color-text-alt);
        font-style: italic;
        margin: 0;
      }

      .criteria-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .criterion-row {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
      }

      .row-prefix {
        min-width: 50px;
        font-weight: 600;
        color: var(--uui-color-text-alt);
        text-transform: uppercase;
        font-size: var(--uui-type-small-size);
      }

      .row-inputs {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        flex: 1;
        flex-wrap: wrap;
      }

      .row-inputs uui-select {
        min-width: 150px;
      }

      .row-inputs uui-input {
        min-width: 120px;
      }

      .between-inputs {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .between-and {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      .add-criterion {
        margin-top: var(--uui-size-space-2);
      }

      .loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-4);
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-3);
        margin-bottom: var(--uui-size-space-3);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
      }

      .error-banner uui-icon {
        flex-shrink: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-segment-criteria-builder": MerchelloSegmentCriteriaBuilderElement;
  }
}
