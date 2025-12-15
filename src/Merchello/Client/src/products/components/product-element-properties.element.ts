import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type {
  ElementTypeResponseModel,
  ElementTypeProperty,
  ElementTypeContainer,
} from "../types/element-type.types.js";
import "@umbraco-cms/backoffice/property";

/**
 * Property change event detail
 */
export interface ElementPropertyChangeDetail {
  alias: string;
  value: unknown;
}

/**
 * Renders Element Type properties using Umbraco's property editors.
 * This component displays properties for a specific tab or ungrouped properties.
 */
@customElement("merchello-product-element-properties")
export class MerchelloProductElementPropertiesElement extends UmbElementMixin(LitElement) {
  @property({ attribute: false })
  elementType?: ElementTypeResponseModel | null;

  @property({ attribute: false })
  values: Record<string, unknown> = {};

  @property({ type: String })
  activeTabId?: string;

  @state()
  private _datasetValue: Array<{ alias: string; value: unknown }> = [];

  updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);
    if (changedProperties.has("values") || changedProperties.has("activeTabId") || changedProperties.has("elementType")) {
      this._updateDatasetValue();
    }
  }

  private _updateDatasetValue(): void {
    const properties = this._getAllPropertiesForCurrentTab();
    this._datasetValue = properties.map(p => ({
      alias: p.alias,
      value: this.values[p.alias],
    }));
  }

  private _getPropertiesForContainer(containerId: string | null): ElementTypeProperty[] {
    return this.elementType?.properties
      .filter(p => p.containerId === containerId)
      .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];
  }

  private _getGroupsInContainer(containerId: string): ElementTypeContainer[] {
    return this.elementType?.containers
      .filter(c => c.type === "Group" && c.parentId === containerId)
      .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];
  }

  private _getAllPropertiesForCurrentTab(): ElementTypeProperty[] {
    if (!this.elementType) return [];

    const containerId = this.activeTabId ?? null;
    const directProperties = this._getPropertiesForContainer(containerId);

    // Also include properties from groups within this tab
    const groups = containerId ? this._getGroupsInContainer(containerId) : [];
    const groupProperties = groups.flatMap(g => this._getPropertiesForContainer(g.id));

    return [...directProperties, ...groupProperties];
  }

  private _onPropertyChange(e: CustomEvent): void {
    const target = e.target as HTMLElement & { alias?: string; value?: unknown };
    if (target.alias) {
      this.dispatchEvent(new CustomEvent<ElementPropertyChangeDetail>("property-change", {
        detail: { alias: target.alias, value: target.value },
        bubbles: true,
        composed: true,
      }));
    }
  }

  render() {
    if (!this.elementType) return nothing;

    const containerId = this.activeTabId ?? null;
    const groups = containerId ? this._getGroupsInContainer(containerId) : [];
    const directProperties = this._getPropertiesForContainer(containerId);

    // If no tab is active (null containerId), get properties without a container
    const hasContent = directProperties.length > 0 || groups.length > 0;

    return html`
      <div class="element-properties">
        ${hasContent ? html`
          <umb-property-dataset
            .value=${this._datasetValue}
            @change=${this._onPropertyChange}>
            ${directProperties.length > 0 ? html`
              <uui-box>
                ${this._renderProperties(directProperties)}
              </uui-box>
            ` : nothing}

            ${groups.map(group => html`
              <uui-box headline=${group.name ?? ""}>
                ${this._renderProperties(this._getPropertiesForContainer(group.id))}
              </uui-box>
            `)}
          </umb-property-dataset>
        ` : html`
          <div class="empty-state">
            <p>No properties configured for this tab.</p>
          </div>
        `}
      </div>
    `;
  }

  private _renderProperties(properties: ElementTypeProperty[]) {
    if (properties.length === 0) return nothing;

    return properties.map(prop => html`
      <umb-property
        alias=${prop.alias}
        label=${prop.name}
        description=${prop.description ?? ""}
        property-editor-ui-alias=${prop.propertyEditorUiAlias}
        .config=${this._getPropertyConfig(prop)}
        ?mandatory=${prop.mandatory}
        .validation=${{
          mandatory: prop.mandatory,
          mandatoryMessage: prop.mandatoryMessage ?? undefined,
        }}>
      </umb-property>
    `);
  }

  private _getPropertyConfig(prop: ElementTypeProperty): unknown {
    // The dataTypeConfiguration from the API contains the property editor config
    // This needs to be in the format expected by the property editor
    if (prop.dataTypeConfiguration && typeof prop.dataTypeConfiguration === "object") {
      return prop.dataTypeConfiguration;
    }
    return undefined;
  }

  static styles = css`
    :host {
      display: block;
    }

    .element-properties {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    .empty-state {
      padding: var(--uui-size-layout-2);
      text-align: center;
      color: var(--uui-color-text-alt);
    }

    .empty-state p {
      margin: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-element-properties": MerchelloProductElementPropertiesElement;
  }
}
