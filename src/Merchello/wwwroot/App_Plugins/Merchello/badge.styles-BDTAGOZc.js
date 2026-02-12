import { css as a } from "@umbraco-cms/backoffice/external/lit";
const r = a`
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

  .badge.unfulfilled,
  .badge.partially-fulfilled {
    background: var(--merchello-color-warning-status-background, #8a6500);
    color: var(--merchello-color-warning-status-contrast, #fff);
  }

  /* Cancellation status badge */
  .badge.cancelled {
    background: var(--uui-color-danger-standalone);
    color: var(--uui-color-danger-contrast);
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
//# sourceMappingURL=badge.styles-BDTAGOZc.js.map
