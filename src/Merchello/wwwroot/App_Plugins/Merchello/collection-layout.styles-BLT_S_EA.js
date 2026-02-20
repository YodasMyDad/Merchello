import { css as e } from "@umbraco-cms/backoffice/external/lit";
const a = e`
  .layout-container {
    max-width: 100%;
    padding: var(--uui-size-layout-1);
    display: flex;
    flex-direction: column;
    gap: var(--uui-size-space-4);
  }

  .header-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: var(--uui-size-space-2);
    margin-left: auto;
    flex-shrink: 0;
  }

  .filters {
    display: flex;
    flex-direction: column;
    gap: var(--uui-size-space-3);
  }

  .filters-top {
    display: flex;
    flex-direction: column;
    gap: var(--uui-size-space-3);
  }

  @media (min-width: 768px) {
    .filters-top {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--uui-size-space-3);
    }
  }

  .search-box {
    flex: 1 1 auto;
    min-width: 240px;
    max-width: 520px;
  }

  .search-box uui-input {
    width: 100%;
  }

  .tabs {
    align-self: flex-start;
  }

  .table-container {
    overflow-x: auto;
    background: var(--uui-color-surface);
    border: 1px solid var(--uui-color-border);
    border-radius: var(--uui-border-radius);
  }
`;
export {
  a as c
};
//# sourceMappingURL=collection-layout.styles-BLT_S_EA.js.map
