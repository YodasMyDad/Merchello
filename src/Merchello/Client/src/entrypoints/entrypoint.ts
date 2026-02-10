import type {
  UmbEntryPointOnInit,
  UmbEntryPointOnUnload,
} from "@umbraco-cms/backoffice/extension-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { setApiConfig } from "@api/merchello-api.js";
import { preloadSettings } from "@api/store-settings.js";

const MERCHELLO_MODAL_WIDTH_STYLE_ID = "merchello-modal-width";

const installModalWidthStyles = (): void => {
  if (document.getElementById(MERCHELLO_MODAL_WIDTH_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = MERCHELLO_MODAL_WIDTH_STYLE_ID;
  style.textContent = `
    umb-backoffice-modal-container uui-modal-dialog > uui-dialog {
      width: min(36rem, calc(100vw - 2rem));
      min-width: min(36rem, calc(100vw - 2rem));
    }

    @media (max-width: 768px) {
      umb-backoffice-modal-container uui-modal-dialog > uui-dialog {
        width: calc(100vw - 1rem);
        min-width: calc(100vw - 1rem);
      }
    }
  `;

  document.head.appendChild(style);
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
  // Cleanup if needed
};
