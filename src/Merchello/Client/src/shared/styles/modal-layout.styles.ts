import { css } from "@umbraco-cms/backoffice/external/lit";

/**
 * Shared modal layout baseline for Merchello dialog modals.
 * Keeps width, spacing, and field sizing consistent.
 */
export const modalLayoutStyles = css`
  :host {
    display: block;
    min-width: min(var(--merchello-modal-min-width, 46rem), calc(100vw - 2rem));
    max-width: calc(100vw - 2rem);
  }

  #main {
    display: flex;
    flex-direction: column;
    gap: var(--uui-size-space-4);
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: var(--uui-size-space-2);
  }

  .form-row-group {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--uui-size-space-4);
  }

  uui-input,
  uui-select,
  uui-textarea {
    width: 100%;
  }

  [slot="actions"] {
    display: flex;
    gap: var(--uui-size-space-2);
    justify-content: flex-end;
  }

  @media (max-width: 900px) {
    :host {
      min-width: calc(100vw - 1rem);
      max-width: calc(100vw - 1rem);
    }

    .form-row-group {
      grid-template-columns: 1fr;
    }
  }
`;
