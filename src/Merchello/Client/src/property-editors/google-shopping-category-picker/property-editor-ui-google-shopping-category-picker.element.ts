import {
  html,
  css,
  nothing,
  repeat,
  customElement,
  property,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbFormControlMixin } from "@umbraco-cms/backoffice/validation";
import { UmbChangeEvent } from "@umbraco-cms/backoffice/event";
import type { UmbPropertyEditorUiElement } from "@umbraco-cms/backoffice/property-editor";
import { MerchelloApi } from "@api/merchello-api.js";

@customElement("merchello-property-editor-ui-google-shopping-category-picker")
export class MerchelloPropertyEditorUiGoogleShoppingCategoryPickerElement
  extends UmbFormControlMixin<string | undefined, typeof UmbLitElement, undefined>(
    UmbLitElement,
    undefined
  )
  implements UmbPropertyEditorUiElement
{
  @property({ type: Boolean, reflect: true })
  readonly = false;

  @state()
  private _isLoading = false;

  @state()
  private _countryCode = "US";

  @state()
  private _suggestions: string[] = [];

  @state()
  private _showSuggestions = false;

  #isConnected = false;
  #searchDebounceTimer?: number;
  #requestId = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    void this.#hydrateMetadata();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
    if (this.#searchDebounceTimer) {
      clearTimeout(this.#searchDebounceTimer);
    }
  }

  #onInput(e: Event): void {
    const value = (e.target as HTMLInputElement).value ?? "";
    super.value = value.length > 0 ? value : undefined;
    this.dispatchEvent(new UmbChangeEvent());
    this.#queueSearch(value);
  }

  #onFocus(): void {
    const value = this.value ?? "";
    if (this._suggestions.length > 0) {
      this._showSuggestions = true;
      return;
    }

    if (value.trim().length >= 2) {
      this.#queueSearch(value);
    }
  }

  #onBlur(): void {
    // Let click handlers on suggestions run before hiding.
    window.setTimeout(() => {
      this._showSuggestions = false;
    }, 150);
  }

  #queueSearch(query: string): void {
    if (this.#searchDebounceTimer) {
      clearTimeout(this.#searchDebounceTimer);
    }

    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      this._suggestions = [];
      this._showSuggestions = false;
      this._isLoading = false;
      return;
    }

    this.#searchDebounceTimer = window.setTimeout(() => {
      void this.#search(normalizedQuery);
    }, 200);
  }

  async #search(query: string): Promise<void> {
    const requestId = ++this.#requestId;
    this._isLoading = true;

    const { data } = await MerchelloApi.getGoogleShoppingCategories({
      query,
      limit: 20,
    });

    if (!this.#isConnected || requestId !== this.#requestId) {
      return;
    }

    this._isLoading = false;
    this._countryCode = data?.countryCode ?? this._countryCode;
    this._suggestions = data?.categories ?? [];
    this._showSuggestions = this._suggestions.length > 0;
  }

  async #hydrateMetadata(): Promise<void> {
    const { data } = await MerchelloApi.getGoogleShoppingCategories({ limit: 1 });
    if (!this.#isConnected) {
      return;
    }

    this._countryCode = data?.countryCode ?? this._countryCode;
  }

  #selectSuggestion(category: string): void {
    super.value = category;
    this.dispatchEvent(new UmbChangeEvent());
    this._showSuggestions = false;
    this._suggestions = [];
  }

  override render() {
    const value = this.value ?? "";
    return html`
      <div class="wrapper">
        <uui-input
          label="Shopping Category"
          placeholder="Start typing to search shopping taxonomy..."
          .value=${value}
          ?disabled=${this.readonly}
          @input=${this.#onInput}
          @focus=${this.#onFocus}
          @blur=${this.#onBlur}>
        </uui-input>

        ${this._showSuggestions
          ? html`
              <div class="suggestions" role="listbox">
                ${repeat(
                  this._suggestions,
                  (category) => category,
                  (category) => html`
                    <button
                      type="button"
                      role="option"
                      class="suggestion-item"
                      @mousedown=${(e: Event) => e.preventDefault()}
                      @click=${() => this.#selectSuggestion(category)}>
                      ${category}
                    </button>
                  `,
                )}
              </div>
            `
          : nothing}

        <div class="metadata">
          ${this._isLoading
            ? html`Loading categories for ${this._countryCode}...`
            : this._countryCode
              ? html`Using ${this._countryCode} taxonomy`
              : nothing}
        </div>
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .wrapper {
      position: relative;
      width: 100%;
    }

    uui-input {
      width: 100%;
    }

    .suggestions {
      position: absolute;
      z-index: 10;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      max-height: 260px;
      overflow-y: auto;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      box-shadow: var(--uui-shadow-depth-2);
    }

    .suggestion-item {
      width: 100%;
      text-align: left;
      padding: var(--uui-size-space-3);
      border: 0;
      background: transparent;
      cursor: pointer;
      font: inherit;
      color: var(--uui-color-text);
    }

    .suggestion-item:hover,
    .suggestion-item:focus-visible {
      background: var(--uui-color-surface-alt);
      outline: none;
    }

    .metadata {
      margin-top: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
      min-height: 18px;
    }
  `;
}

export default MerchelloPropertyEditorUiGoogleShoppingCategoryPickerElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-property-editor-ui-google-shopping-category-picker": MerchelloPropertyEditorUiGoogleShoppingCategoryPickerElement;
  }
}
