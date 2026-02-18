import { css } from "@umbraco-cms/backoffice/external/lit";

/**
 * Shared badge styles for status indicators (payment, fulfillment, etc.)
 * Import and spread into component styles: `static styles = [badgeStyles, css\`...\`]`
 */
export const badgeStyles = css`
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  /* Payment status badges */
  .badge.paid,
  .badge.positive {
    background: var(--uui-color-positive-standalone);
    color: var(--uui-color-positive-contrast);
  }

  .badge.unpaid {
    background: var(--uui-color-danger-standalone);
    color: var(--uui-color-danger-contrast);
  }

  .badge.partial {
    background: var(--merchello-color-warning-status-background, #8a6500);
    color: #fff;
  }

  .badge.awaiting {
    background: var(--merchello-color-warning-status-background, #8a6500);
    color: #fff;
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
  .badge.partially-fulfilled,
  .badge.warning {
    background: var(--merchello-color-warning-status-background, #8a6500);
    color: #fff;
  }

  /* Cancellation status badge */
  .badge.cancelled {
    background: var(--uui-color-danger-standalone);
    color: var(--uui-color-danger-contrast);
  }

  /* Generic color badges (for products, etc.) */
  .badge-positive,
  .badge.positive {
    background: var(--uui-color-positive-standalone);
    color: var(--uui-color-positive-contrast);
  }

  .badge-danger,
  .badge.danger {
    background: var(--uui-color-danger-standalone);
    color: var(--uui-color-danger-contrast);
  }

  .badge-warning,
  .badge.warning {
    background: var(--merchello-color-warning-status-background, #8a6500);
    color: #fff;
  }

  .badge-default,
  .badge.default {
    background: var(--uui-color-text-alt);
    color: #fff;
  }
`;
