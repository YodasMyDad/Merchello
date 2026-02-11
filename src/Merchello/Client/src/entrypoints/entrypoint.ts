import type {
  UmbEntryPointOnInit,
  UmbEntryPointOnUnload,
} from "@umbraco-cms/backoffice/extension-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { setApiConfig } from "@api/merchello-api.js";
import { preloadSettings } from "@api/store-settings.js";

const MERCHELLO_MODAL_WIDTH_STYLE_ID = "merchello-modal-width";
const MERCHELLO_MODAL_DIALOG_SELECTOR = "uui-modal-dialog";
const MERCHELLO_MODAL_DIALOG_MARKER_ATTRIBUTE = "data-merchello-dialog";
const MERCHELLO_MODAL_WIDTH_STYLES = `
  :host([data-merchello-dialog]) dialog {
    max-width: calc(100vw - 2rem);
    min-width: min(var(--merchello-modal-min-width, 46rem), calc(100vw - 2rem));
  }

  @media (max-width: 768px) {
    :host([data-merchello-dialog]) dialog {
      max-width: calc(100vw - 1rem);
      min-width: calc(100vw - 1rem);
    }
  }
`;

let modalWidthObserver: MutationObserver | null = null;

const isMerchelloModalElement = (element: Element): boolean => (
  element instanceof HTMLElement && element.tagName.toLowerCase().startsWith("merchello-")
);

const updateDialogMarker = (dialog: HTMLElement): void => {
  const hasMerchelloModal = Array.from(dialog.children).some((child) => isMerchelloModalElement(child));
  if (hasMerchelloModal) {
    dialog.setAttribute(MERCHELLO_MODAL_DIALOG_MARKER_ATTRIBUTE, "");
  } else {
    dialog.removeAttribute(MERCHELLO_MODAL_DIALOG_MARKER_ATTRIBUTE);
  }
};

const installModalWidthStylesInDialog = (dialog: Element): void => {
  if (!(dialog instanceof HTMLElement)) return;

  const root = dialog.shadowRoot;
  if (!root) return;

  if (!root.getElementById(MERCHELLO_MODAL_WIDTH_STYLE_ID)) {
    const style = document.createElement("style");
    style.id = MERCHELLO_MODAL_WIDTH_STYLE_ID;
    style.textContent = MERCHELLO_MODAL_WIDTH_STYLES;
    root.appendChild(style);
  }

  updateDialogMarker(dialog);
};

const installModalWidthStylesForNode = (node: Node): void => {
  if (!(node instanceof Element)) return;

  if (node.matches(MERCHELLO_MODAL_DIALOG_SELECTOR)) {
    installModalWidthStylesInDialog(node);
  }

  node.querySelectorAll(MERCHELLO_MODAL_DIALOG_SELECTOR).forEach((dialog) => {
    installModalWidthStylesInDialog(dialog);
  });
};

const installModalWidthStyles = (): void => {
  installModalWidthStylesForNode(document.documentElement);
  void customElements.whenDefined(MERCHELLO_MODAL_DIALOG_SELECTOR).then(() => {
    installModalWidthStylesForNode(document.documentElement);
  });

  if (modalWidthObserver) return;

  modalWidthObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        installModalWidthStylesForNode(node);
        if (node instanceof Element) {
          const parentDialog = node.closest(MERCHELLO_MODAL_DIALOG_SELECTOR);
          if (parentDialog instanceof HTMLElement) {
            updateDialogMarker(parentDialog);
          }
        }
      });

      mutation.removedNodes.forEach(() => {
        if (mutation.target instanceof Element) {
          const parentDialog = mutation.target.closest(MERCHELLO_MODAL_DIALOG_SELECTOR);
          if (parentDialog instanceof HTMLElement) {
            updateDialogMarker(parentDialog);
          }
        }
      });

      if (mutation.target instanceof HTMLElement && mutation.target.matches(MERCHELLO_MODAL_DIALOG_SELECTOR)) {
        updateDialogMarker(mutation.target);
      }
    });
  });

  modalWidthObserver.observe(document.documentElement, { childList: true, subtree: true });
};

const uninstallModalWidthStyles = (): void => {
  modalWidthObserver?.disconnect();
  modalWidthObserver = null;
};

// load up the manifests here
export const onInit: UmbEntryPointOnInit = (_host, _extensionRegistry) => {
  installModalWidthStyles();

  _host.consumeContext(UMB_AUTH_CONTEXT, async (authContext) => {
    const config = authContext?.getOpenApiConfiguration();

    setApiConfig({
      token: config?.token,
      baseUrl: config?.base ?? "",
      credentials: config?.credentials ?? "same-origin",
    });

    // Preload store settings for currency formatting
    preloadSettings();
  });
};

export const onUnload: UmbEntryPointOnUnload = (_host, _extensionRegistry) => {
  uninstallModalWidthStyles();
};
