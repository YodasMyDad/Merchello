import { html, css, nothing, LitElement } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state, query } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

/**
 * Tag input component with chip display and autocomplete
 *
 * @fires tags-changed - Fired when tags are added or removed
 */
@customElement("merchello-tag-input")
export class MerchelloTagInputElement extends UmbElementMixin(LitElement) {
  @property({ type: Array }) tags: string[] = [];
  @property({ type: Array }) suggestions: string[] = [];
  @property({ type: String }) placeholder = "Add tag...";

  @state() private _inputValue = "";
  @state() private _filteredSuggestions: string[] = [];
  @state() private _showSuggestions = false;
  @state() private _selectedSuggestionIndex = -1;

  @query("#tag-input") private _inputElement!: HTMLInputElement;

  private _handleInputChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    this._inputValue = target.value;
    this._filterSuggestions();
  }

  private _filterSuggestions(): void {
    if (!this._inputValue.trim()) {
      this._filteredSuggestions = [];
      this._showSuggestions = false;
      return;
    }

    const searchTerm = this._inputValue.toLowerCase().trim();
    const existingTagsLower = this.tags.map(t => t.toLowerCase());

    this._filteredSuggestions = this.suggestions
      .filter(s =>
        s.toLowerCase().includes(searchTerm) &&
        !existingTagsLower.includes(s.toLowerCase())
      )
      .slice(0, 8);

    this._showSuggestions = this._filteredSuggestions.length > 0;
    this._selectedSuggestionIndex = -1;
  }

  private _addTag(tag: string): void {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    // Check for duplicates (case-insensitive)
    const existingTagsLower = this.tags.map(t => t.toLowerCase());
    if (existingTagsLower.includes(trimmedTag.toLowerCase())) return;

    const newTags = [...this.tags, trimmedTag];
    this._dispatchTagsChanged(newTags);

    this._inputValue = "";
    this._showSuggestions = false;
    this._filteredSuggestions = [];
    this._selectedSuggestionIndex = -1;
  }

  private _removeTag(tag: string): void {
    const newTags = this.tags.filter(t => t !== tag);
    this._dispatchTagsChanged(newTags);
  }

  private _dispatchTagsChanged(tags: string[]): void {
    this.dispatchEvent(new CustomEvent("tags-changed", {
      detail: { tags },
      bubbles: true,
      composed: true,
    }));
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      if (this._selectedSuggestionIndex >= 0 && this._filteredSuggestions.length > 0) {
        this._addTag(this._filteredSuggestions[this._selectedSuggestionIndex]);
      } else if (this._inputValue.trim()) {
        this._addTag(this._inputValue);
      }
    } else if (e.key === ",") {
      e.preventDefault();
      if (this._inputValue.trim()) {
        this._addTag(this._inputValue);
      }
    } else if (e.key === "Backspace" && !this._inputValue && this.tags.length > 0) {
      this._removeTag(this.tags[this.tags.length - 1]);
    } else if (e.key === "ArrowDown" && this._showSuggestions) {
      e.preventDefault();
      this._selectedSuggestionIndex = Math.min(
        this._selectedSuggestionIndex + 1,
        this._filteredSuggestions.length - 1
      );
    } else if (e.key === "ArrowUp" && this._showSuggestions) {
      e.preventDefault();
      this._selectedSuggestionIndex = Math.max(this._selectedSuggestionIndex - 1, -1);
    } else if (e.key === "Escape") {
      this._showSuggestions = false;
      this._selectedSuggestionIndex = -1;
    }
  }

  private _handleInputFocus(): void {
    if (this._inputValue.trim()) {
      this._filterSuggestions();
    }
  }

  private _handleInputBlur(): void {
    // Delay hiding to allow click on suggestion
    setTimeout(() => {
      this._showSuggestions = false;
      this._selectedSuggestionIndex = -1;
    }, 200);
  }

  private _handleSuggestionClick(suggestion: string): void {
    this._addTag(suggestion);
    this._inputElement?.focus();
  }

  render() {
    return html`
      <div class="tag-input-container" @click=${() => this._inputElement?.focus()}>
        <div class="tags-wrapper">
          ${this.tags.map(tag => html`
            <span class="tag-chip">
              <span class="tag-text">${tag}</span>
              <button
                type="button"
                class="tag-remove"
                @click=${(e: Event) => { e.stopPropagation(); this._removeTag(tag); }}
                aria-label="Remove ${tag}">
                <uui-icon name="icon-remove"></uui-icon>
              </button>
            </span>
          `)}
          <input
            id="tag-input"
            type="text"
            .value=${this._inputValue}
            placeholder=${this.tags.length === 0 ? this.placeholder : ""}
            @input=${this._handleInputChange}
            @keydown=${this._handleKeyDown}
            @focus=${this._handleInputFocus}
            @blur=${this._handleInputBlur}
            autocomplete="off"
          />
        </div>
        ${this._showSuggestions ? html`
          <div class="suggestions-dropdown">
            ${this._filteredSuggestions.map((suggestion, index) => html`
              <div
                class="suggestion-item ${index === this._selectedSuggestionIndex ? 'selected' : ''}"
                @mousedown=${() => this._handleSuggestionClick(suggestion)}>
                ${suggestion}
              </div>
            `)}
          </div>
        ` : nothing}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .tag-input-container {
      position: relative;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      min-height: 40px;
      cursor: text;
    }

    .tag-input-container:focus-within {
      outline: calc(2px * var(--uui-show-focus-outline, 1)) solid var(--uui-color-focus);
    }

    .tags-wrapper {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2);
    }

    .tag-chip {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      padding: var(--uui-size-space-1) var(--uui-size-space-2);
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: 0.8125rem;
      line-height: 1.2;
    }

    .tag-text {
      color: var(--uui-color-text);
    }

    .tag-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: var(--uui-color-text-alt);
      transition: color 0.1s ease;
    }

    .tag-remove:hover {
      color: var(--uui-color-danger);
    }

    .tag-remove uui-icon {
      font-size: 12px;
    }

    input {
      flex: 1;
      min-width: 120px;
      border: none;
      outline: none;
      background: transparent;
      font-family: inherit;
      font-size: 0.875rem;
      padding: var(--uui-size-space-1);
      color: var(--uui-color-text);
    }

    input::placeholder {
      color: var(--uui-color-text-alt);
    }

    .suggestions-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1000;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-top: none;
      border-radius: 0 0 var(--uui-border-radius) var(--uui-border-radius);
      box-shadow: var(--uui-shadow-depth-1);
      max-height: 200px;
      overflow-y: auto;
    }

    .suggestion-item {
      padding: var(--uui-size-space-3);
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--uui-color-text);
    }

    .suggestion-item:hover,
    .suggestion-item.selected {
      background: var(--uui-color-surface-emphasis);
    }
  `;
}

export default MerchelloTagInputElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-tag-input": MerchelloTagInputElement;
  }
}
