# Umbraco v17 Property Editor Development

## Overview

Property editors define how content editors interact with data in the Umbraco backoffice. They consist of two parts:

| Component | Type | Purpose |
|-----------|------|---------|
| **Property Editor UI** | `propertyEditorUi` | Frontend element (Lit component) |
| **Property Editor Schema** | `propertyEditorSchema` | Backend value type definition |

> For picker-style editors (collection, filter, product), see [Picker Property Editors](#picker-property-editors).

---

## Quick Start

### Minimal File Structure
```
my-editor/
├── manifests.ts                           # Extension registration
├── property-editor-ui-my-editor.element.ts  # Lit component
└── index.ts                               # Exports
```

### Minimal Manifest
```typescript
// manifests.ts
import type { ManifestPropertyEditorUi } from '@umbraco-cms/backoffice/property-editor';

export const manifests: Array<ManifestPropertyEditorUi> = [
  {
    type: 'propertyEditorUi',
    alias: 'My.PropertyEditorUi.CustomEditor',
    name: 'My Custom Editor',
    element: () => import('./property-editor-ui-my-editor.element.js'),
    meta: {
      label: 'My Editor',
      icon: 'icon-edit',
      group: 'common',
      propertyEditorSchemaAlias: 'Umbraco.Plain.String',  // Use existing schema
    },
  },
];
```

---

## Simple Property Editors

### Base Pattern

All property editors should:
1. Extend `UmbFormControlMixin` for validation support
2. Implement `UmbPropertyEditorUiElement` interface
3. Dispatch `UmbChangeEvent` on value changes

```typescript
import { customElement, property, state, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UmbFormControlMixin } from '@umbraco-cms/backoffice/validation';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import type {
  UmbPropertyEditorUiElement,
  UmbPropertyEditorConfigCollection
} from '@umbraco-cms/backoffice/property-editor';

@customElement('my-property-editor-ui')
export class MyPropertyEditorUiElement
  extends UmbFormControlMixin<string, typeof UmbLitElement, undefined>(UmbLitElement, undefined)
  implements UmbPropertyEditorUiElement
{
  // Required properties
  @property({ type: Boolean, reflect: true })
  readonly = false;

  @property({ type: Boolean })
  mandatory?: boolean;

  @property({ type: String })
  mandatoryMessage = 'This field is required';

  // Internal state from config
  @state()
  private _maxLength?: number;

  // Configuration handler
  public set config(config: UmbPropertyEditorConfigCollection | undefined) {
    this._maxLength = config?.getValueByAlias<number>('maxLength');
  }

  // Register form control for validation
  protected override firstUpdated(): void {
    this.addFormControlElement(this.shadowRoot!.querySelector('uui-input')!);
  }

  // Handle input changes
  #onInput(e: InputEvent) {
    this.value = (e.target as HTMLInputElement).value;
    this.dispatchEvent(new UmbChangeEvent());
  }

  override render() {
    return html`
      <uui-input
        .value=${this.value ?? ''}
        @input=${this.#onInput}
        ?required=${this.mandatory}
        .requiredMessage=${this.mandatoryMessage}
        ?readonly=${this.readonly}
        maxlength=${this._maxLength ?? nothing}>
      </uui-input>
    `;
  }

  static override styles = css`
    uui-input { width: 100%; }
  `;
}

export default MyPropertyEditorUiElement;
```

### Key Imports
```typescript
// Core
import { customElement, property, state, html, css, nothing } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';

// Validation
import { UmbFormControlMixin } from '@umbraco-cms/backoffice/validation';

// Events
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';

// Types
import type {
  UmbPropertyEditorUiElement,
  UmbPropertyEditorConfigCollection,
  ManifestPropertyEditorUi
} from '@umbraco-cms/backoffice/property-editor';
```

---

## Picker Property Editors

### Architecture

Pickers use a layered pattern for separation of concerns:

```
Property Editor UI (property-editor-ui-*.element.ts)
    │
    ├── Renders input component
    ├── Handles config
    └── Dispatches UmbChangeEvent
         │
         ▼
Input Component (input-*.element.ts) - Optional for complex pickers
    │
    ├── Manages selection array
    ├── Renders selected items
    ├── Add/remove buttons
    └── Opens picker modal
         │
         ▼
Modal Token (*.modal-token.ts)
    │
    └── Defines modal type, size, data structure
         │
         ▼
Modal Element (*-picker-modal.element.ts)
    │
    ├── Displays items to pick from
    ├── Handles selection
    └── Submit/reject
```

### Simple Picker (Single Selection)

For simple pickers, you can skip the input component layer:

```typescript
// collection-picker/property-editor-ui-collection-picker.element.ts
import { customElement, property, state, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UmbFormControlMixin } from '@umbraco-cms/backoffice/validation';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { UMB_MODAL_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/modal';
import type { UmbPropertyEditorUiElement } from '@umbraco-cms/backoffice/property-editor';
import { COLLECTION_PICKER_MODAL } from './collection-picker-modal.token.js';

@customElement('merchello-property-editor-ui-collection-picker')
export class MerchelloCollectionPickerElement
  extends UmbFormControlMixin<string, typeof UmbLitElement, undefined>(UmbLitElement, undefined)
  implements UmbPropertyEditorUiElement
{
  @property({ type: Boolean, reflect: true })
  readonly = false;

  @state()
  private _selectedName?: string;

  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (ctx) => {
      this.#modalManager = ctx;
    });
  }

  async #openPicker() {
    if (this.readonly || !this.#modalManager) return;

    const result = await this.#modalManager
      .open(this, COLLECTION_PICKER_MODAL, {
        data: { currentSelection: this.value },
      })
      .onSubmit()
      .catch(() => undefined);

    if (result) {
      this.value = result.id;
      this._selectedName = result.name;
      this.dispatchEvent(new UmbChangeEvent());
    }
  }

  #onClear() {
    this.value = undefined;
    this._selectedName = undefined;
    this.dispatchEvent(new UmbChangeEvent());
  }

  override render() {
    return html`
      <uui-input-lock ?locked=${this.readonly}>
        <uui-input
          .value=${this._selectedName ?? ''}
          placeholder="Select a collection..."
          readonly
          @click=${this.#openPicker}>
        </uui-input>
        ${this.value && !this.readonly
          ? html`<uui-button compact @click=${this.#onClear} label="Clear">
              <uui-icon name="icon-remove"></uui-icon>
            </uui-button>`
          : nothing}
        <uui-button compact @click=${this.#openPicker} label="Pick" ?disabled=${this.readonly}>
          <uui-icon name="icon-search"></uui-icon>
        </uui-button>
      </uui-input-lock>
    `;
  }
}
```

### Multi-Select Picker

For multiple selection with reordering:

```typescript
// filter-picker/property-editor-ui-filter-picker.element.ts
import { customElement, property, state, html, css, repeat, nothing } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UmbFormControlMixin } from '@umbraco-cms/backoffice/validation';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { UMB_MODAL_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/modal';
import { UmbSorterController } from '@umbraco-cms/backoffice/sorter';
import type { UmbPropertyEditorUiElement, UmbPropertyEditorConfigCollection } from '@umbraco-cms/backoffice/property-editor';
import { FILTER_PICKER_MODAL } from './filter-picker-modal.token.js';

interface SelectedFilter {
  id: string;
  name: string;
}

@customElement('merchello-property-editor-ui-filter-picker')
export class MerchelloFilterPickerElement
  extends UmbFormControlMixin<string, typeof UmbLitElement, undefined>(UmbLitElement, undefined)
  implements UmbPropertyEditorUiElement
{
  @property({ type: Boolean, reflect: true })
  readonly = false;

  @state()
  private _selection: SelectedFilter[] = [];

  @state()
  private _min = 0;

  @state()
  private _max = Infinity;

  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;

  // Sorter for drag-to-reorder
  #sorter = new UmbSorterController<SelectedFilter>(this, {
    getUniqueOfElement: (el) => el.getAttribute('data-id')!,
    getUniqueOfModel: (item) => item.id,
    identifier: 'Merchello.FilterPicker',
    itemSelector: '.filter-item',
    containerSelector: '.filter-list',
    onChange: ({ model }) => {
      this._selection = model;
      this.#updateValue();
    },
  });

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (ctx) => {
      this.#modalManager = ctx;
    });
  }

  public set config(config: UmbPropertyEditorConfigCollection | undefined) {
    this._min = config?.getValueByAlias<number>('minItems') ?? 0;
    this._max = config?.getValueByAlias<number>('maxItems') ?? Infinity;
  }

  // Value is stored as comma-separated IDs
  public override set value(val: string | undefined) {
    super.value = val;
    // Note: You'd typically load names via API here
  }

  #updateValue() {
    this.value = this._selection.map((s) => s.id).join(',');
    this.dispatchEvent(new UmbChangeEvent());
  }

  async #openPicker() {
    if (this.readonly || !this.#modalManager) return;

    const result = await this.#modalManager
      .open(this, FILTER_PICKER_MODAL, {
        data: {
          multiple: true,
          selection: this._selection.map((s) => s.id),
          max: this._max - this._selection.length,
        },
      })
      .onSubmit()
      .catch(() => undefined);

    if (result?.selection) {
      this._selection = [...this._selection, ...result.selection];
      this.#sorter.setModel(this._selection);
      this.#updateValue();
    }
  }

  #onRemove(id: string) {
    this._selection = this._selection.filter((s) => s.id !== id);
    this.#sorter.setModel(this._selection);
    this.#updateValue();
  }

  override render() {
    return html`
      <div class="filter-list">
        ${repeat(
          this._selection,
          (item) => item.id,
          (item) => html`
            <div class="filter-item" data-id=${item.id}>
              <uui-icon name="icon-navigation"></uui-icon>
              <span>${item.name}</span>
              ${!this.readonly
                ? html`<uui-button
                    compact
                    @click=${() => this.#onRemove(item.id)}
                    label="Remove">
                    <uui-icon name="icon-trash"></uui-icon>
                  </uui-button>`
                : nothing}
            </div>
          `
        )}
      </div>
      ${this._selection.length < this._max && !this.readonly
        ? html`<uui-button look="placeholder" @click=${this.#openPicker} label="Add filter">
            Add filter
          </uui-button>`
        : nothing}
    `;
  }

  static override styles = css`
    .filter-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }
    .filter-item {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }
    .filter-item span {
      flex: 1;
    }
  `;
}
```

---

## Modal Implementation

### Modal Token

Define the modal's data and return types:

```typescript
// collection-picker-modal.token.ts
import { UmbModalToken } from '@umbraco-cms/backoffice/modal';

export interface CollectionPickerModalData {
  currentSelection?: string;
  filter?: string;  // Optional filter
}

export interface CollectionPickerModalValue {
  id: string;
  name: string;
}

export const COLLECTION_PICKER_MODAL = new UmbModalToken<
  CollectionPickerModalData,
  CollectionPickerModalValue
>('Merchello.Modal.CollectionPicker', {
  modal: {
    type: 'sidebar',
    size: 'small',
  },
});
```

### Modal Element

```typescript
// collection-picker-modal.element.ts
import { customElement, state, html, css, repeat } from '@umbraco-cms/backoffice/external/lit';
import { UmbModalBaseElement } from '@umbraco-cms/backoffice/modal';
import type { CollectionPickerModalData, CollectionPickerModalValue } from './collection-picker-modal.token.js';
import { MerchelloApi } from '@api/merchello-api.js';

interface Collection {
  id: string;
  name: string;
}

@customElement('merchello-collection-picker-modal')
export class MerchelloCollectionPickerModalElement extends UmbModalBaseElement<
  CollectionPickerModalData,
  CollectionPickerModalValue
> {
  @state()
  private _collections: Category[] = [];

  @state()
  private _loading = true;

  @state()
  private _searchQuery = '';

  @state()
  private _selectedId?: string;

  override async connectedCallback() {
    super.connectedCallback();
    this._selectedId = this.data?.currentSelection;
    await this.#loadCollections();
  }

  async #loadCollections() {
    this._loading = true;
    const { data, error } = await MerchelloApi.getCollections();
    if (!error && data) {
      this._collections = data;
    }
    this._loading = false;
  }

  #onSelect(collection: Collection) {
    this._selectedId = collection.id;
  }

  #onSubmit() {
    const selected = this._collections.find((c) => c.id === this._selectedId);
    if (selected) {
      this.modalContext?.submit({ id: selected.id, name: selected.name });
    }
  }

  #onCancel() {
    this.modalContext?.reject();
  }

  get #filteredCollections() {
    if (!this._searchQuery) return this._collections;
    const query = this._searchQuery.toLowerCase();
    return this._collections.filter((c) => c.name.toLowerCase().includes(query));
  }

  override render() {
    return html`
      <umb-body-layout headline="Select Collection">
        <uui-box>
          <uui-input
            placeholder="Search collections..."
            .value=${this._searchQuery}
            @input=${(e: InputEvent) => (this._searchQuery = (e.target as HTMLInputElement).value)}>
            <uui-icon name="icon-search" slot="prepend"></uui-icon>
          </uui-input>

          ${this._loading
            ? html`<uui-loader-bar></uui-loader-bar>`
            : html`
                <uui-ref-list>
                  ${repeat(
                    this.#filteredCollections,
                    (cat) => cat.id,
                    (cat) => html`
                      <uui-ref-node
                        name=${cat.name}
                        ?selectable=${true}
                        ?selected=${cat.id === this._selectedId}
                        @selected=${() => this.#onSelect(cat)}>
                        <uui-icon slot="icon" name="icon-folder"></uui-icon>
                      </uui-ref-node>
                    `
                  )}
                </uui-ref-list>
              `}
        </uui-box>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this.#onCancel}></uui-button>
          <uui-button
            label="Select"
            look="primary"
            color="positive"
            ?disabled=${!this._selectedId}
            @click=${this.#onSubmit}>
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override styles = css`
    uui-input {
      width: 100%;
      margin-bottom: var(--uui-size-space-4);
    }
  `;
}

export default MerchelloCollectionPickerModalElement;
```

### Multi-Select Modal

```typescript
// filter-picker-modal.element.ts
import { customElement, state, html, css, repeat } from '@umbraco-cms/backoffice/external/lit';
import { UmbModalBaseElement } from '@umbraco-cms/backoffice/modal';
import type { FilterPickerModalData, FilterPickerModalValue } from './filter-picker-modal.token.js';
import { MerchelloApi } from '@api/merchello-api.js';

@customElement('merchello-filter-picker-modal')
export class MerchelloFilterPickerModalElement extends UmbModalBaseElement<
  FilterPickerModalData,
  FilterPickerModalValue
> {
  @state()
  private _items: Array<{ id: string; name: string }> = [];

  @state()
  private _selection = new Set<string>();

  @state()
  private _loading = true;

  override async connectedCallback() {
    super.connectedCallback();
    // Initialize with already selected items (to exclude them)
    if (this.data?.selection) {
      this._selection = new Set(this.data.selection);
    }
    await this.#loadItems();
  }

  async #loadItems() {
    this._loading = true;
    const { data } = await MerchelloApi.getFilters();
    if (data) {
      // Exclude already selected items
      this._items = data.filter((item) => !this.data?.selection?.includes(item.id));
    }
    this._loading = false;
  }

  #toggleSelection(id: string) {
    if (this._selection.has(id)) {
      this._selection.delete(id);
    } else {
      // Check max limit
      if (this.data?.max && this._selection.size >= this.data.max) return;
      this._selection.add(id);
    }
    this._selection = new Set(this._selection); // Trigger reactivity
  }

  #onSubmit() {
    const selected = this._items
      .filter((item) => this._selection.has(item.id))
      .map((item) => ({ id: item.id, name: item.name }));
    this.modalContext?.submit({ selection: selected });
  }

  override render() {
    return html`
      <umb-body-layout headline="Select Filters">
        <uui-box>
          ${this._loading
            ? html`<uui-loader-bar></uui-loader-bar>`
            : html`
                <uui-ref-list>
                  ${repeat(
                    this._items,
                    (item) => item.id,
                    (item) => html`
                      <uui-ref-node
                        name=${item.name}
                        selectable
                        ?selected=${this._selection.has(item.id)}
                        @selected=${() => this.#toggleSelection(item.id)}
                        @deselected=${() => this.#toggleSelection(item.id)}>
                        <uui-icon slot="icon" name="icon-filter"></uui-icon>
                      </uui-ref-node>
                    `
                  )}
                </uui-ref-list>
              `}
        </uui-box>

        <div slot="actions">
          <uui-button label="Cancel" @click=${() => this.modalContext?.reject()}></uui-button>
          <uui-button
            label="Add Selected (${this._selection.size})"
            look="primary"
            color="positive"
            ?disabled=${this._selection.size === 0}
            @click=${this.#onSubmit}>
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
}
```

### Register Modal in Manifest

```typescript
// manifest.ts
export const manifests = [
  // Property Editor UI
  {
    type: 'propertyEditorUi',
    alias: 'Merchello.PropertyEditorUi.CollectionPicker',
    name: 'Collection Picker',
    element: () => import('./property-editor-ui-collection-picker.element.js'),
    meta: {
      label: 'Collection Picker',
      icon: 'icon-folder',
      group: 'Merchello',
      propertyEditorSchemaAlias: 'Umbraco.Plain.String',
    },
  },
  // Modal
  {
    type: 'modal',
    alias: 'Merchello.Modal.CollectionPicker',
    name: 'Collection Picker Modal',
    element: () => import('./collection-picker-modal.element.js'),
  },
];
```

---

## Configuration & Settings

### Defining Settings in Manifest

```typescript
{
  type: 'propertyEditorUi',
  alias: 'Merchello.PropertyEditorUi.FilterPicker',
  meta: {
    label: 'Filter Picker',
    propertyEditorSchemaAlias: 'Umbraco.Plain.String',
    settings: {
      properties: [
        {
          alias: 'minItems',
          label: 'Minimum items',
          description: 'Minimum number of filters required',
          propertyEditorUiAlias: 'Umb.PropertyEditorUi.Integer',
          config: [{ alias: 'min', value: 0 }],
        },
        {
          alias: 'maxItems',
          label: 'Maximum items',
          description: 'Maximum number of filters allowed (0 = unlimited)',
          propertyEditorUiAlias: 'Umb.PropertyEditorUi.Integer',
          config: [{ alias: 'min', value: 0 }],
        },
        {
          alias: 'filterType',
          label: 'Filter Type',
          propertyEditorUiAlias: 'Umb.PropertyEditorUi.Dropdown',
          config: [
            {
              alias: 'items',
              value: ['All', 'Category', 'Price', 'Brand'],
            },
          ],
        },
      ],
      defaultData: [
        { alias: 'minItems', value: 0 },
        { alias: 'maxItems', value: 0 },
        { alias: 'filterType', value: 'All' },
      ],
    },
  },
}
```

### Accessing Configuration

```typescript
public set config(config: UmbPropertyEditorConfigCollection | undefined) {
  if (!config) return;

  // Simple values
  this._min = config.getValueByAlias<number>('minItems') ?? 0;
  this._max = config.getValueByAlias<number>('maxItems') || Infinity;
  this._filterType = config.getValueByAlias<string>('filterType') ?? 'All';

  // Complex objects
  const startNode = config.getValueByAlias<{ id: string; type: string }>('startNode');
  if (startNode) {
    this._rootId = startNode.id;
  }

  // Arrays
  const allowedTypes = config.getValueByAlias<string[]>('allowedTypes') ?? [];
}
```

### Built-in Property Editor UIs for Settings

| Alias | Use For |
|-------|---------|
| `Umb.PropertyEditorUi.TextBox` | Text input |
| `Umb.PropertyEditorUi.Integer` | Number input |
| `Umb.PropertyEditorUi.Toggle` | Boolean toggle |
| `Umb.PropertyEditorUi.Dropdown` | Select dropdown |
| `Umb.PropertyEditorUi.Label` | Display-only text |
| `Umb.PropertyEditorUi.MultipleTextString` | Multiple text values |

---

## Validation

### Mandatory Field

```typescript
@property({ type: Boolean })
mandatory?: boolean;

@property({ type: String })
mandatoryMessage = 'This field is required';

override render() {
  return html`
    <uui-input
      ?required=${this.mandatory}
      .requiredMessage=${this.mandatoryMessage}>
    </uui-input>
  `;
}
```

### Custom Validators

```typescript
protected override firstUpdated(): void {
  // Register the form control
  this.addFormControlElement(this.shadowRoot!.querySelector('uui-input')!);

  // Add custom validators
  this.addValidator(
    'customError',
    () => 'Must select at least 2 items',
    () => this._selection.length < 2
  );

  this.addValidator(
    'tooLong',
    () => `Maximum ${this._max} items allowed`,
    () => this._selection.length > this._max
  );
}
```

### Min/Max for Pickers

```typescript
public set config(config: UmbPropertyEditorConfigCollection | undefined) {
  this._min = config?.getValueByAlias<number>('minItems') ?? 0;
  this._max = config?.getValueByAlias<number>('maxItems') || Infinity;
}

protected override firstUpdated(): void {
  if (this._min > 0) {
    this.addValidator(
      'customError',
      () => `Select at least ${this._min} item(s)`,
      () => this._selection.length < this._min
    );
  }
}
```

---

## Backend (C#)

### Property Editor Schema Registration

For custom value types, register a property editor schema:

```csharp
// MerchelloCollectionPickerPropertyEditor.cs
using Umbraco.Cms.Core.PropertyEditors;

[DataEditor(
    alias: "Merchello.CollectionPicker",
    name: "Merchello Collection Picker",
    view: "~/App_Plugins/Merchello/property-editor-ui-collection-picker.element.js")]
public class MerchelloCollectionPickerPropertyEditor : DataEditor
{
    public MerchelloCollectionPickerPropertyEditor(
        IDataValueEditorFactory dataValueEditorFactory)
        : base(dataValueEditorFactory)
    {
        SupportsReadOnly = true;
    }

    protected override IDataValueEditor CreateValueEditor()
    {
        return DataValueEditorFactory.Create<TextOnlyValueEditor>(Attribute!);
    }
}
```

### Value Converter

Convert stored value to strongly-typed model:

```csharp
// CollectionPickerValueConverter.cs
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.PublishedCache;
using Merchello.Core.Collections;

public class CollectionPickerValueConverter : PropertyValueConverterBase
{
    private readonly ICollectionService _collectionService;

    public CollectionPickerValueConverter(ICollectionService categoryService)
    {
        _collectionService = categoryService;
    }

    public override bool IsConverter(IPublishedPropertyType propertyType)
    {
        return propertyType.EditorAlias == "Merchello.CollectionPicker";
    }

    public override Type GetPropertyValueType(IPublishedPropertyType propertyType)
    {
        return typeof(Collection);
    }

    public override object? ConvertSourceToIntermediate(
        IPublishedElement owner,
        IPublishedPropertyType propertyType,
        object? source,
        bool preview)
    {
        if (source is not string collectionId || string.IsNullOrEmpty(collectionId))
            return null;

        return Guid.TryParse(collectionId, out var id) ? id : (Guid?)null;
    }

    public override object? ConvertIntermediateToObject(
        IPublishedElement owner,
        IPublishedPropertyType propertyType,
        PropertyCacheLevel referenceCacheLevel,
        object? inter,
        bool preview)
    {
        if (inter is not Guid collectionId)
            return null;

        return _collectionService.GetById(collectionId);
    }
}
```

### Multi-Value Converter

```csharp
// FilterPickerValueConverter.cs
public class FilterPickerValueConverter : PropertyValueConverterBase
{
    private readonly IFilterService _filterService;

    public override Type GetPropertyValueType(IPublishedPropertyType propertyType)
    {
        return typeof(IEnumerable<Filter>);
    }

    public override object? ConvertSourceToIntermediate(
        IPublishedElement owner,
        IPublishedPropertyType propertyType,
        object? source,
        bool preview)
    {
        if (source is not string value || string.IsNullOrEmpty(value))
            return Array.Empty<Guid>();

        return value
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(id => Guid.TryParse(id.Trim(), out var guid) ? guid : (Guid?)null)
            .Where(g => g.HasValue)
            .Select(g => g!.Value)
            .ToArray();
    }

    public override object? ConvertIntermediateToObject(
        IPublishedElement owner,
        IPublishedPropertyType propertyType,
        PropertyCacheLevel referenceCacheLevel,
        object? inter,
        bool preview)
    {
        if (inter is not Guid[] filterIds || filterIds.Length == 0)
            return Enumerable.Empty<Filter>();

        return _filterService.GetByIds(filterIds);
    }
}
```

### Data Type Creation (Programmatic)

```csharp
// MerchelloDataTypeInitializer.cs
public class MerchelloDataTypeInitializer : INotificationHandler<UmbracoApplicationStartedNotification>
{
    private readonly IDataTypeService _dataTypeService;
    private readonly PropertyEditorCollection _propertyEditors;
    private readonly IConfigurationEditorJsonSerializer _serializer;

    public async Task Handle(UmbracoApplicationStartedNotification notification, CancellationToken cancellationToken)
    {
        await EnsureCollectionPickerDataTypeAsync();
    }

    private async Task EnsureCollectionPickerDataTypeAsync()
    {
        var key = new Guid("12345678-1234-1234-1234-123456789012");

        var existing = await _dataTypeService.GetAsync(key);
        if (existing != null) return;

        if (!_propertyEditors.TryGet("Merchello.CollectionPicker", out var editor))
            return;

        var dataType = new DataType(editor, _serializer, -1)
        {
            Key = key,
            Name = "Merchello Collection Picker",
            Configuration = new Dictionary<string, object>
            {
                { "minItems", 0 },
                { "maxItems", 1 },
            }
        };

        await _dataTypeService.CreateAsync(dataType, Constants.Security.SuperUserKey);
    }
}
```

---

## Merchello-Specific Patterns

### API Integration in Modal

```typescript
// Use Merchello's API layer
import { MerchelloApi } from '@api/merchello-api.js';

async #loadData() {
  this._loading = true;

  const { data, error } = await MerchelloApi.getCollections({
    parentId: this._rootId,
    includeChildren: true,
  });

  if (error) {
    // Handle error - show notification
    this.#notificationContext?.peek('danger', {
      data: { headline: 'Failed to load collections', message: error.message },
    });
    this._loading = false;
    return;
  }

  this._items = data ?? [];
  this._loading = false;
}
```

### Complete Collection Picker File Structure

```
src/property-editors/
└── collection-picker/
    ├── manifests.ts                              # All manifests
    ├── property-editor-ui-collection-picker.element.ts  # Main UI
    ├── collection-picker-modal.token.ts            # Modal token
    ├── collection-picker-modal.element.ts          # Modal element
    ├── types.ts                                  # TypeScript types
    └── index.ts                                  # Exports
```

### Register in Bundle

```typescript
// bundle.manifests.ts
import { manifests as categoryPicker } from './property-editors/collection-picker/manifests.js';
import { manifests as filterPicker } from './property-editors/filter-picker/manifests.js';

export const manifests = [
  ...categoryPicker,
  ...filterPicker,
  // ... other manifests
];
```

---

## Quick Reference

### Value Storage Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| Single string | Single ID | `"abc-123"` |
| Comma-separated | Multiple IDs | `"abc-123,def-456"` |
| JSON string | Complex data | `'{"id":"abc","name":"Test"}'` |

### Common Property Editor UIs to Extend/Reuse

| Alias | Description |
|-------|-------------|
| `Umb.PropertyEditorUi.TextBox` | Simple text |
| `Umb.PropertyEditorUi.ContentPicker` | Content selection |
| `Umb.PropertyEditorUi.MediaPicker` | Media selection |
| `Umb.PropertyEditorUi.Dropdown` | Dropdown list |
| `Umb.PropertyEditorUi.CheckboxList` | Multi-select checkboxes |

### Property Editor Schemas (for `propertyEditorSchemaAlias`)

| Schema | Value Type |
|--------|------------|
| `Umbraco.Plain.String` | String |
| `Umbraco.Plain.Integer` | Integer |
| `Umbraco.Plain.Json` | JSON object |
| `Umbraco.TextBox` | String with maxLength |
| `Umbraco.MultiNodeTreePicker` | Array of node references |

---

## Best Practices

1. **Use `UmbFormControlMixin`** for validation support
2. **Dispatch `UmbChangeEvent`** on all value changes
3. **Handle readonly state** in all interactive elements
4. **Load data in `connectedCallback`** for modals
5. **Use `UmbSorterController`** for reorderable lists
6. **Store IDs, not full objects** - resolve on read via value converter
7. **Provide meaningful error states** - loading, empty, error
8. **Use Merchello API layer** - don't fetch directly in components
