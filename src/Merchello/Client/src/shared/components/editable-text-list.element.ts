import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UmbChangeEvent } from "@umbraco-cms/backoffice/event";

/**
 * Reusable editable text list component for managing arrays of strings.
 * Based on Umbraco's umb-input-multiple-text-string pattern.
 *
 * @example
 * ```html
 * <merchello-editable-text-list
 *   .items=${["Item 1", "Item 2"]}
 *   @change=${this._handleChange}
 *   placeholder="Add a new item...">
 * </merchello-editable-text-list>
 * ```
 *
 * @fires change - Fired when items are added, removed, or modified
 */
@customElement("merchello-editable-text-list")
export class MerchelloEditableTextListElement extends UmbElementMixin(LitElement) {
  /**
   * Array of string items to display and edit.
   */
  @property({ type: Array })
  items: string[] = [];

  /**
   * Placeholder text for the add input field.
   */
  @property({ type: String })
  placeholder = "Add item...";

  /**
   * Whether the list is read-only.
   */
  @property({ type: Boolean })
  readonly = false;

  /**
   * Value of the new item input field.
   */
  @state()
  private _newItemValue = "";

  /**
   * Index of the item currently being edited (null if none).
   */
  @state()
  private _editingIndex: number | null = null;

  /**
   * Value of the item being edited.
   */
  @state()
  private _editingValue = "";

  /**
   * Handles adding a new item when Enter is pressed or Add button is clicked.
   */
  private _handleAddItem(): void {
    const value = this._newItemValue.trim();
    if (!value || this.readonly) return;

    const newItems = [...this.items, value];
    this._newItemValue = "";
    this._dispatchChange(newItems);
  }

  /**
   * Handles input in the new item field.
   */
  private _handleNewItemInput(e: Event): void {
    this._newItemValue = (e.target as HTMLInputElement).value;
  }

  /**
   * Handles Enter key press in the new item field.
   */
  private _handleNewItemKeyDown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      this._handleAddItem();
    }
  }

  /**
   * Handles removing an item by index.
   */
  private _handleRemoveItem(index: number): void {
    if (this.readonly) return;

    const newItems = this.items.filter((_, i) => i !== index);
    this._dispatchChange(newItems);
  }

  /**
   * Starts editing an item.
   */
  private _handleStartEdit(index: number): void {
    if (this.readonly) return;

    this._editingIndex = index;
    this._editingValue = this.items[index];
  }

  /**
   * Handles input in the edit field.
   */
  private _handleEditInput(e: Event): void {
    this._editingValue = (e.target as HTMLInputElement).value;
  }

  /**
   * Saves the edited item.
   */
  private _handleSaveEdit(): void {
    if (this._editingIndex === null) return;

    const value = this._editingValue.trim();
    if (!value) {
      // If empty, remove the item
      this._handleRemoveItem(this._editingIndex);
    } else {
      // Update the item
      const newItems = [...this.items];
      newItems[this._editingIndex] = value;
      this._dispatchChange(newItems);
    }

    this._editingIndex = null;
    this._editingValue = "";
  }

  /**
   * Cancels editing.
   */
  private _handleCancelEdit(): void {
    this._editingIndex = null;
    this._editingValue = "";
  }

  /**
   * Handles Enter and Escape keys in the edit field.
   */
  private _handleEditKeyDown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      this._handleSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      this._handleCancelEdit();
    }
  }

  /**
   * Dispatches a change event with the new items array.
   */
  private _dispatchChange(newItems: string[]): void {
    this.items = newItems;
    this.dispatchEvent(new UmbChangeEvent());
  }

  render() {
    return html`
      <div class="editable-list-container">
        ${this.items.length > 0
          ? html`
              <ul class="item-list">
                ${this.items.map((item, index) => this._renderItem(item, index))}
              </ul>
            `
          : nothing}

        ${!this.readonly
          ? html`
              <div class="add-item-row">
                <uui-input
                  type="text"
                  .value=${this._newItemValue}
                  @input=${this._handleNewItemInput}
                  @keydown=${this._handleNewItemKeyDown}
                  placeholder=${this.placeholder}
                  class="add-item-input">
                </uui-input>
                <uui-button
                  compact
                  look="primary"
                  color="positive"
                  @click=${this._handleAddItem}
                  ?disabled=${!this._newItemValue.trim()}
                  label="Add item"
                  aria-label="Add item">
                  <uui-icon name="icon-add"></uui-icon>
                </uui-button>
              </div>
            `
          : nothing}

        ${this.items.length === 0 && this.readonly
          ? html`<p class="empty-hint">No items added.</p>`
          : nothing}
      </div>
    `;
  }

  private _renderItem(item: string, index: number): unknown {
    const isEditing = this._editingIndex === index;

    if (isEditing) {
      return html`
        <li class="item-row editing">
          <uui-input
            type="text"
            .value=${this._editingValue}
            @input=${this._handleEditInput}
            @keydown=${this._handleEditKeyDown}
            @blur=${this._handleSaveEdit}
            class="edit-input"
            autofocus>
          </uui-input>
          <div class="item-actions">
            <uui-button
              compact
              look="secondary"
              @click=${this._handleSaveEdit}
              label="Save"
              aria-label="Save changes">
              <uui-icon name="icon-check"></uui-icon>
            </uui-button>
            <uui-button
              compact
              look="secondary"
              @click=${this._handleCancelEdit}
              label="Cancel"
              aria-label="Cancel editing">
              <uui-icon name="icon-wrong"></uui-icon>
            </uui-button>
          </div>
        </li>
      `;
    }

    return html`
      <li class="item-row">
        <span
          class="item-text ${!this.readonly ? "editable" : ""}"
          @click=${() => !this.readonly && this._handleStartEdit(index)}
          @keydown=${(e: KeyboardEvent) => e.key === "Enter" && !this.readonly && this._handleStartEdit(index)}
          tabindex=${this.readonly ? -1 : 0}
          role=${this.readonly ? nothing : "button"}
          aria-label=${this.readonly ? nothing : `Edit "${item}"`}>
          ${item}
        </span>
        ${!this.readonly
          ? html`
              <div class="item-actions">
                <uui-button
                  compact
                  look="secondary"
                  @click=${() => this._handleStartEdit(index)}
                  label="Edit"
                  aria-label="Edit ${item}">
                  <uui-icon name="icon-edit"></uui-icon>
                </uui-button>
                <uui-button
                  compact
                  look="secondary"
                  color="danger"
                  @click=${() => this._handleRemoveItem(index)}
                  label="Remove"
                  aria-label="Remove ${item}">
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              </div>
            `
          : nothing}
      </li>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .editable-list-container {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .item-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .item-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .item-row:hover {
      border-color: var(--uui-color-border-emphasis);
    }

    .item-row.editing {
      border-color: var(--uui-color-selected);
      box-shadow: 0 0 0 1px var(--uui-color-selected);
    }

    .item-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-text.editable {
      cursor: pointer;
      padding: var(--uui-size-space-1) var(--uui-size-space-2);
      margin: calc(-1 * var(--uui-size-space-1)) calc(-1 * var(--uui-size-space-2));
      border-radius: var(--uui-border-radius);
      transition: background-color 0.15s ease;
    }

    .item-text.editable:hover,
    .item-text.editable:focus {
      background: var(--uui-color-surface-alt);
      outline: none;
    }

    .edit-input {
      flex: 1;
    }

    .item-actions {
      display: flex;
      gap: var(--uui-size-space-1);
      flex-shrink: 0;
    }

    .add-item-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
    }

    .add-item-input {
      flex: 1;
    }

    .empty-hint {
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      font-style: italic;
    }
  `;
}

export default MerchelloEditableTextListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-editable-text-list": MerchelloEditableTextListElement;
  }
}

