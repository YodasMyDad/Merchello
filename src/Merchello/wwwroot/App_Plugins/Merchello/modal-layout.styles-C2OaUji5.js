import { css as i } from "@umbraco-cms/backoffice/external/lit";
const a = i`
  :host {
    display: block;
    box-sizing: border-box;
    min-width: min(var(--merchello-modal-min-width, 46rem), 100%);
    max-width: 100%;
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
      min-width: 100%;
      max-width: 100%;
    }

    .form-row-group {
      grid-template-columns: 1fr;
    }
  }
`;
export {
  a as m
};
//# sourceMappingURL=modal-layout.styles-C2OaUji5.js.map
