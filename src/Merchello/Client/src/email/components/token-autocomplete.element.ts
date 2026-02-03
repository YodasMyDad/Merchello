import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state, query } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { TokenInfoDto } from "@email/types/email.types.js";

export interface TokenAutocompleteValueChangedDetail {
  value: string;
}

@customElement("merchello-token-autocomplete")
export class MerchelloTokenAutocompleteElement extends UmbElementMixin(LitElement) {
  @property({ type: String }) value = "";
  @property({ type: Array }) tokens: TokenInfoDto[] = [];
  @property({ type: String }) placeholder = "";
  @property({ type: String }) label = "Expression";

  @state() private _showDropdown = false;
  @state() private _filteredTokens: TokenInfoDto[] = [];
  @state() private _selectedIndex = 0;
  @state() private _cursorPosition = 0;

  @query("#input") private _inputElement!: HTMLInputElement;

  private _handleInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const value = input.value;
    this._cursorPosition = input.selectionStart ?? 0;

    this.value = value;
    this._dispatchValueChanged();

    // Check if we should show autocomplete
    this._checkForAutocomplete(value, this._cursorPosition);
  }

  private _checkForAutocomplete(value: string, cursorPos: number): void {
    const beforeCursor = value.slice(0, cursorPos);
    const lastOpenBrace = beforeCursor.lastIndexOf("{{");
    const lastCloseBrace = beforeCursor.lastIndexOf("}}");

    if (lastOpenBrace > lastCloseBrace && lastOpenBrace !== -1) {
      // We're inside a token (between {{ and before }})
      const partialToken = beforeCursor.slice(lastOpenBrace + 2);
      this._showAutocomplete(partialToken);
    } else {
      this._hideAutocomplete();
    }
  }

  private _showAutocomplete(filter: string): void {
    const normalizedFilter = filter.toLowerCase().trim();

    if (normalizedFilter) {
      this._filteredTokens = this.tokens.filter(
        (token) =>
          token.path.toLowerCase().includes(normalizedFilter) ||
          token.displayName.toLowerCase().includes(normalizedFilter)
      );
    } else {
      this._filteredTokens = [...this.tokens];
    }

    this._selectedIndex = 0;
    this._showDropdown = this._filteredTokens.length > 0;
  }

  private _hideAutocomplete(): void {
    this._showDropdown = false;
    this._filteredTokens = [];
    this._selectedIndex = 0;
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (!this._showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this._selectedIndex = Math.min(this._selectedIndex + 1, this._filteredTokens.length - 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
        break;
      case "Enter":
      case "Tab":
        if (this._filteredTokens.length > 0) {
          e.preventDefault();
          this._selectToken(this._filteredTokens[this._selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        this._hideAutocomplete();
        break;
    }
  }

  private _selectToken(token: TokenInfoDto): void {
    const value = this.value;
    const cursorPos = this._cursorPosition;

    // Find the position of the {{ before the cursor
    const beforeCursor = value.slice(0, cursorPos);
    const lastOpenBrace = beforeCursor.lastIndexOf("{{");

    if (lastOpenBrace !== -1) {
      // Replace from {{ to cursor with the full token
      const before = value.slice(0, lastOpenBrace);
      const after = value.slice(cursorPos);
      const newValue = `${before}{{${token.path}}}${after}`;

      this.value = newValue;
      this._dispatchValueChanged();

      // Move cursor to after the inserted token
      const newCursorPos = lastOpenBrace + token.path.length + 4; // +4 for {{ and }}
      requestAnimationFrame(() => {
        this._inputElement?.setSelectionRange(newCursorPos, newCursorPos);
        this._inputElement?.focus();
      });
    }

    this._hideAutocomplete();
  }

  private _handleBlur(): void {
    // Delay hiding to allow click on dropdown items
    setTimeout(() => {
      this._hideAutocomplete();
    }, 200);
  }

  private _handleFocus(): void {
    // Check if we should show autocomplete on focus
    if (this._inputElement) {
      const cursorPos = this._inputElement.selectionStart ?? 0;
      this._checkForAutocomplete(this.value, cursorPos);
    }
  }

  private _dispatchValueChanged(): void {
    this.dispatchEvent(
      new CustomEvent<TokenAutocompleteValueChangedDetail>("value-changed", {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderDropdown(): unknown {
    if (!this._showDropdown || this._filteredTokens.length === 0) {
      return nothing;
    }

    return html`
      <div class="dropdown">
        ${this._filteredTokens.map(
          (token, index) => html`
            <div
              class="dropdown-item ${index === this._selectedIndex ? "selected" : ""}"
              @click=${() => this._selectToken(token)}
              @mouseenter=${() => {
                this._selectedIndex = index;
              }}>
              <code class="token-path">{{${token.path}}}</code>
              <span class="token-name">${token.displayName}</span>
              ${token.description
                ? html`<span class="token-description">${token.description}</span>`
                : nothing}
            </div>
          `
        )}
      </div>
    `;
  }

  override render() {
    // Using native <input> instead of uui-input because we need access to
    // selectionStart/setSelectionRange for cursor position detection.
    // This matches Umbraco's approach in search-modal.element.ts.
    return html`
      <div class="autocomplete-container">
        <input
          id="input"
          type="text"
          .value=${this.value}
          placeholder=${this.placeholder}
          aria-label=${this.label}
          @input=${this._handleInput}
          @keydown=${this._handleKeyDown}
          @blur=${this._handleBlur}
          @focus=${this._handleFocus}
        />
        ${this._renderDropdown()}
      </div>
    `;
  }

  static override readonly styles = [
    css`
      :host {
        display: block;
        position: relative;
      }

      .autocomplete-container {
        position: relative;
      }

      /* Native input styled to match uui-input */
      input {
        width: 100%;
        height: var(--uui-size-11, 36px);
        padding: 0 var(--uui-size-space-3, 9px);
        font-family: inherit;
        font-size: inherit;
        color: var(--uui-color-text);
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius, 3px);
        box-sizing: border-box;
      }

      input:hover {
        border-color: var(--uui-color-border-emphasis);
      }

      input:focus {
        outline: none;
        border-color: var(--uui-color-focus);
        box-shadow: 0 0 0 1px var(--uui-color-focus);
      }

      input::placeholder {
        color: var(--uui-color-text-alt);
      }

      .dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        max-height: 300px;
        overflow-y: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        box-shadow: var(--uui-shadow-depth-3);
        z-index: 100;
        margin-top: 2px;
      }

      .dropdown-item {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
        padding: var(--uui-size-space-3);
        cursor: pointer;
        border-bottom: 1px solid var(--uui-color-border);
      }

      .dropdown-item:last-child {
        border-bottom: none;
      }

      .dropdown-item:hover,
      .dropdown-item.selected {
        background: var(--uui-color-surface-emphasis);
      }

      .token-path {
        font-family: monospace;
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-interactive);
        background: var(--uui-color-surface-alt);
        padding: 2px 6px;
        border-radius: var(--uui-border-radius);
        align-self: flex-start;
      }

      .token-name {
        font-weight: 500;
        font-size: var(--uui-type-default-size);
      }

      .token-description {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }
    `,
  ];
}

export default MerchelloTokenAutocompleteElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-token-autocomplete": MerchelloTokenAutocompleteElement;
  }
}
