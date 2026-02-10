import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import { UMB_PROPERTY_CONTEXT } from "@umbraco-cms/backoffice/property";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import type { UmbPropertyEditorUiElement } from "@umbraco-cms/backoffice/property-editor";

const DROPDOWN_EDITOR_TAG = "umb-property-editor-ui-dropdown";
const SELECT_EDITOR_TAG = "umb-property-editor-ui-select";
const INPUT_DROPDOWN_TAG = "umb-input-dropdown-list";
const UUI_SELECT_TAG = "uui-select";
const NATIVE_SELECT_SELECTOR = "select#native";

type LitLikeElement = HTMLElement & { updateComplete?: Promise<unknown> };

const applyFullWidth = (element: HTMLElement | null | undefined): void => {
  if (!element) return;
  element.style.display = "block";
  element.style.width = "100%";
};

/**
 * Property context API that ensures dropdown/select property editors use full-width layout.
 * This targets Umbraco's dropdown/select editors only and keeps the canonical editor aliases intact
 * so property actions continue to attach to `Umb.PropertyEditorUi.Dropdown` and `Umb.PropertyEditorUi.Select`.
 */
export class MerchelloDropdownLayoutPropertyContext extends UmbControllerBase {
  constructor(host: UmbControllerHost) {
    super(host);

    this.consumeContext(UMB_PROPERTY_CONTEXT, (propertyContext) => {
      if (!propertyContext) return;

      this.observe(propertyContext.editor, (editor) => {
        void this.#applyEditorLayout(editor);
      });

      this.observe(propertyContext.config, () => {
        void this.#applyEditorLayout(propertyContext.getEditor());
      });
    });
  }

  async #applyEditorLayout(editor: UmbPropertyEditorUiElement | undefined): Promise<void> {
    const editorElement = editor as LitLikeElement | undefined;
    if (!editorElement) return;

    const editorTag = editorElement.tagName.toLowerCase();
    if (editorTag !== DROPDOWN_EDITOR_TAG && editorTag !== SELECT_EDITOR_TAG) return;

    applyFullWidth(editorElement);

    if (editorElement.updateComplete) {
      await editorElement.updateComplete;
    }

    if (editorTag === SELECT_EDITOR_TAG) {
      const directSelect = editorElement.shadowRoot?.querySelector<HTMLElement>(UUI_SELECT_TAG);
      applyFullWidth(directSelect);
      return;
    }

    const nativeSelect = editorElement.shadowRoot?.querySelector<HTMLElement>(NATIVE_SELECT_SELECTOR);
    applyFullWidth(nativeSelect);

    const inputDropdown = editorElement.shadowRoot?.querySelector<LitLikeElement>(INPUT_DROPDOWN_TAG);
    applyFullWidth(inputDropdown);

    if (inputDropdown?.updateComplete) {
      await inputDropdown.updateComplete;
    }

    const dropdownSelect = inputDropdown?.shadowRoot?.querySelector<HTMLElement>(UUI_SELECT_TAG);
    applyFullWidth(dropdownSelect);
  }
}

export { MerchelloDropdownLayoutPropertyContext as api };
