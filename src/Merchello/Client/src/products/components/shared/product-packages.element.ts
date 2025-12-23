import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { ProductPackageDto } from "@products/types/product.types.js";

// ============================================
// Event Types
// ============================================

/** Event detail for packages change */
export interface PackagesChangeDetail {
  packages: ProductPackageDto[];
}

// ============================================
// Component
// ============================================

/**
 * Shared component for managing product package configurations.
 * Used by both product-detail (shipping tab) and variant-detail (packages tab).
 *
 * Packages define the physical dimensions and weight for shipping rate calculations.
 * Products can ship in multiple packages (e.g., furniture that comes in multiple boxes).
 *
 * @fires packages-change - Fired when packages are added, removed, or updated
 */
@customElement("merchello-product-packages")
export class MerchelloProductPackagesElement extends UmbElementMixin(LitElement) {
  /** Current package configurations */
  @property({ type: Array }) packages: ProductPackageDto[] = [];

  /** Whether the packages can be edited (false for inherited view) */
  @property({ type: Boolean }) editable = true;

  /** Show a banner indicating packages are inherited from product root */
  @property({ type: Boolean }) showInheritedBanner = false;

  /** Disable the add button (e.g., for new products that must be saved first) */
  @property({ type: Boolean }) disableAdd = false;

  // ============================================
  // Package Management
  // ============================================

  /** Add a new empty package configuration */
  private _addPackage(): void {
    const packages = [...this.packages];
    packages.push({ weight: 0, lengthCm: null, widthCm: null, heightCm: null });
    this._emitChange(packages);
  }

  /** Remove a package by index */
  private _removePackage(index: number): void {
    const packages = [...this.packages];
    packages.splice(index, 1);
    this._emitChange(packages);
  }

  /** Update a specific field on a package */
  private _updatePackage(index: number, field: keyof ProductPackageDto, value: number | null): void {
    const packages = [...this.packages];
    packages[index] = { ...packages[index], [field]: value };
    this._emitChange(packages);
  }

  /** Dispatch packages-change event with updated packages */
  private _emitChange(packages: ProductPackageDto[]): void {
    this.dispatchEvent(
      new CustomEvent<PackagesChangeDetail>("packages-change", {
        detail: { packages },
        bubbles: true,
        composed: true,
      })
    );
  }

  // ============================================
  // Render Methods
  // ============================================

  override render() {
    return html`
      ${this.showInheritedBanner && !this.editable
        ? html`
            <div class="inherited-notice">
              <uui-icon name="icon-link"></uui-icon>
              <span>These packages are inherited from the product. Enable override above to customize.</span>
            </div>
          `
        : nothing}

      ${this.packages.length > 0
        ? html`
            <div class="packages-list">
              ${this.packages.map((pkg, index) => this._renderPackageCard(pkg, index))}
            </div>
          `
        : html`
            <div class="empty-state">
              <uui-icon name="icon-box"></uui-icon>
              <p>No packages configured</p>
              <p class="hint">Add a package to enable shipping rate calculations with carriers like FedEx, UPS, and DHL</p>
            </div>
          `}

      ${this.editable
        ? html`
            <uui-button
              look="placeholder"
              class="add-package-button"
              ?disabled=${this.disableAdd}
              @click=${this._addPackage}>
              <uui-icon name="icon-add"></uui-icon>
              Add Package
            </uui-button>
          `
        : nothing}
    `;
  }

  /** Renders a single package card (editable or read-only) */
  private _renderPackageCard(pkg: ProductPackageDto, index: number): unknown {
    const dimensionText =
      pkg.lengthCm && pkg.widthCm && pkg.heightCm
        ? `${pkg.lengthCm} × ${pkg.widthCm} × ${pkg.heightCm} cm`
        : "No dimensions";

    // Read-only view for inherited packages
    if (!this.editable) {
      return html`
        <div class="package-card readonly">
          <div class="package-header">
            <span class="package-number">Package ${index + 1}</span>
            <span class="badge badge-muted">Inherited</span>
          </div>
          <div class="package-details">
            <div class="package-stat">
              <span class="label">Weight</span>
              <span class="value">${pkg.weight} kg</span>
            </div>
            <div class="package-stat">
              <span class="label">Dimensions</span>
              <span class="value">${dimensionText}</span>
            </div>
          </div>
        </div>
      `;
    }

    // Editable view
    return html`
      <div class="package-card">
        <div class="package-header">
          <span class="package-number">Package ${index + 1}</span>
          <uui-button
            compact
            look="secondary"
            color="danger"
            label="Remove package"
            @click=${() => this._removePackage(index)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>
        <div class="package-fields">
          <div class="field-group">
            <label>Weight (kg) *</label>
            <uui-input
              type="number"
              step="0.01"
              min="0"
              .value=${String(pkg.weight ?? "")}
              @input=${(e: Event) =>
                this._updatePackage(index, "weight", parseFloat((e.target as HTMLInputElement).value) || 0)}
              placeholder="0.50">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Length (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              min="0"
              .value=${String(pkg.lengthCm ?? "")}
              @input=${(e: Event) =>
                this._updatePackage(index, "lengthCm", parseFloat((e.target as HTMLInputElement).value) || null)}
              placeholder="20">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Width (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              min="0"
              .value=${String(pkg.widthCm ?? "")}
              @input=${(e: Event) =>
                this._updatePackage(index, "widthCm", parseFloat((e.target as HTMLInputElement).value) || null)}
              placeholder="15">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Height (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              min="0"
              .value=${String(pkg.heightCm ?? "")}
              @input=${(e: Event) =>
                this._updatePackage(index, "heightCm", parseFloat((e.target as HTMLInputElement).value) || null)}
              placeholder="10">
            </uui-input>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================
  // Styles
  // ============================================

  static override readonly styles = css`
    :host {
      display: block;
    }

    /* Inherited notice banner */
    .inherited-notice {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .inherited-notice uui-icon {
      color: var(--uui-color-selected);
    }

    /* Package list */
    .packages-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-4);
    }

    /* Package card */
    .package-card {
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .package-card.readonly {
      opacity: 0.8;
    }

    .package-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-3);
    }

    .package-number {
      font-weight: 600;
      color: var(--uui-color-text);
    }

    /* Read-only package details */
    .package-details {
      display: flex;
      gap: var(--uui-size-space-6);
    }

    .package-stat {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .package-stat .label {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--uui-color-text-alt);
    }

    .package-stat .value {
      font-weight: 500;
    }

    /* Editable package fields */
    .package-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: var(--uui-size-space-3);
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .field-group label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--uui-color-text-alt);
    }

    .field-group uui-input {
      width: 100%;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: var(--uui-size-space-6);
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 48px;
      opacity: 0.5;
      margin-bottom: var(--uui-size-space-3);
    }

    .empty-state p {
      margin: var(--uui-size-space-2) 0;
    }

    .hint {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      margin: 0;
    }

    /* Add button */
    .add-package-button {
      width: 100%;
    }

    /* Badge styles */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0 var(--uui-size-space-2);
      height: 20px;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: var(--uui-border-radius);
    }

    .badge-muted {
      background: var(--uui-color-surface-emphasis);
      color: var(--uui-color-text-alt);
    }
  `;
}

export default MerchelloProductPackagesElement;

// ============================================
// Type Declarations
// ============================================

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-packages": MerchelloProductPackagesElement;
  }
}
