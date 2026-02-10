import type {
  UmbEntryPointOnInit,
  UmbEntryPointOnUnload,
} from "@umbraco-cms/backoffice/extension-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { setApiConfig } from "@api/merchello-api.js";
import { preloadSettings } from "@api/store-settings.js";

const MERCHELLO_MODAL_WIDTH_STYLE_ID = "merchello-modal-width";
const MERCHELLO_MODAL_CONTAINER_SELECTOR = "umb-backoffice-modal-container";
const MERCHELLO_MODAL_WIDTH_STYLES = `
  uui-modal-dialog > uui-dialog {
    max-width: calc(100vw - 2rem);
    min-width: min(36rem, calc(100vw - 2rem));
  }

  @media (max-width: 768px) {
    uui-modal-dialog > uui-dialog {
      max-width: calc(100vw - 1rem);
      min-width: calc(100vw - 1rem);
    }
  }
`;

let modalWidthObserver: MutationObserver | null = null;

const installModalWidthStylesInContainer = (container: Element): void => {
  if (!(container instanceof HTMLElement)) return;

  const root = container.shadowRoot;
  if (!root || root.getElementById(MERCHELLO_MODAL_WIDTH_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = MERCHELLO_MODAL_WIDTH_STYLE_ID;
  style.textContent = MERCHELLO_MODAL_WIDTH_STYLES;
  root.appendChild(style);
};

const installModalWidthStylesForNode = (node: Node): void => {
  if (!(node instanceof Element)) return;

  if (node.matches(MERCHELLO_MODAL_CONTAINER_SELECTOR)) {
    installModalWidthStylesInContainer(node);
  }

  node.querySelectorAll(MERCHELLO_MODAL_CONTAINER_SELECTOR).forEach((container) => {
    installModalWidthStylesInContainer(container);
  });
};

const installModalWidthStyles = (): void => {
  installModalWidthStylesForNode(document.documentElement);
  void customElements.whenDefined(MERCHELLO_MODAL_CONTAINER_SELECTOR).then(() => {
    installModalWidthStylesForNode(document.documentElement);
  });

  if (modalWidthObserver) return;

  modalWidthObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        installModalWidthStylesForNode(node);
      });
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
