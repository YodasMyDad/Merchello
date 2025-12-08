import { css as o } from "@umbraco-cms/backoffice/external/lit";
const r = o`
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  /* Payment status badges */
  .badge.paid {
    background: var(--uui-color-positive-standalone);
    color: var(--uui-color-positive-contrast);
  }

  .badge.unpaid {
    background: var(--uui-color-danger-standalone);
    color: var(--uui-color-danger-contrast);
  }

  .badge.partial {
    background: var(--uui-color-warning-standalone);
    color: var(--uui-color-warning-contrast);
  }

  .badge.awaiting {
    background: var(--uui-color-warning-standalone);
    color: var(--uui-color-warning-contrast);
  }

  .badge.refunded,
  .badge.partially-refunded {
    background: var(--uui-color-text-alt);
    color: var(--uui-color-surface);
  }

  /* Fulfillment status badges */
  .badge.fulfilled {
    background: var(--uui-color-positive-standalone);
    color: var(--uui-color-positive-contrast);
  }

  .badge.unfulfilled {
    background: var(--uui-color-warning-standalone);
    color: var(--uui-color-warning-contrast);
  }

  .badge.partially-fulfilled {
    background: var(--uui-color-warning-standalone);
    color: var(--uui-color-warning-contrast);
  }

  /* Generic color badges (for products, etc.) */
  .badge-positive {
    background: var(--uui-color-positive-standalone);
    color: var(--uui-color-positive-contrast);
  }

  .badge-danger {
    background: var(--uui-color-danger-standalone);
    color: var(--uui-color-danger-contrast);
  }

  .badge-warning {
    background: var(--uui-color-warning-standalone);
    color: var(--uui-color-warning-contrast);
  }

  .badge-default {
    background: var(--uui-color-surface-alt);
    color: var(--uui-color-text);
  }
`;
export {
  r as b
};
//# sourceMappingURL=badge.styles-C_lNgH9O.js.map
