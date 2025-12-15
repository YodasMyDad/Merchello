# Product Render - Template/View Selection for ProductRoot

This document outlines how to add template/view selection capability to Merchello products, similar to how Umbraco document types can select a Razor view for rendering.

## Problem Statement

Currently, ProductRoot has no property to store which view/template should render the product on the front-end. Umbraco document types have `AllowedTemplates` and `DefaultTemplate` properties that allow users to select which Razor view renders their content.

---

## Research: How Umbraco Handles Template Selection

### Database Schema

Umbraco uses a **junction table** pattern to associate templates with document types:

**Table: `cmsDocumentType`** (ContentTypeTemplateDto)
| Column | Type | Description |
|--------|------|-------------|
| `contentTypeNodeId` | int | FK to content type |
| `templateNodeId` | int | FK to template |
| `IsDefault` | bool | Marks the default template |

This allows:
- Multiple templates per document type (`AllowedTemplates`)
- One designated default template (`DefaultTemplate`)
- Users can select which template to use when creating content

### C# Model Properties

**IContentType interface** (`Umbraco.Core/Models/ContentType.cs`):

```csharp
// Default template for the content type
public ITemplate? DefaultTemplate { get; }
public int DefaultTemplateId { get; set; }

// All templates allowed for this content type
public IEnumerable<ITemplate>? AllowedTemplates { get; set; }

// Methods
bool IsAllowedTemplate(int templateId);
bool IsAllowedTemplate(string templateAlias);
void SetDefaultTemplate(ITemplate? template);
bool RemoveTemplate(ITemplate template);
```

### API Models

**Response Model:**
```csharp
public IEnumerable<ReferenceByIdModel> AllowedTemplates { get; set; }
public ReferenceByIdModel? DefaultTemplate { get; set; }
```

Uses GUID-based references for clean API contracts.

### Loading Templates

From `ContentTypeCommonRepository.MapTemplates()`:
1. Fetch all ContentTypeTemplateDto rows from junction table
2. For each content type, iterate matching template associations
3. Populate `AllowedTemplates` list with ITemplate objects
4. Identify default template by `IsDefault = true`

---

## Reusable Umbraco Template Picker Components

### Template Picker Modal

**Location:** `/Umbraco.Web.UI.Client/src/packages/templating/templates/modals/`

```typescript
// template-picker-modal.token.ts
export const UMB_TEMPLATE_PICKER_MODAL = new UmbModalToken<
  UmbTemplatePickerModalData,
  UmbTemplatePickerModalValue
>(UMB_TREE_PICKER_MODAL_ALIAS, {
  modal: {
    type: 'sidebar',
    size: 'small',
  },
  data: {
    hideTreeRoot: true,
    treeAlias: 'Umb.Tree.Template',
  },
});
```

### Input Template Component

**Location:** `/Umbraco.Web.UI.Client/src/packages/templating/templates/global-components/input-template/`

**Component:** `umb-input-template`

Features:
- Multiple template selection
- Template cards with default designation
- Modal picker integration
- Min/max validation support

**Usage Pattern:**
```typescript
@customElement('umb-input-template')
export class UmbInputTemplateElement extends UUIFormControlMixin(UmbLitElement, '') {
  async #openPicker() {
    const value = await umbOpenModal(this, UMB_TEMPLATE_PICKER_MODAL, {
      data: {
        multiple: true,
        pickableFilter: (template) => !this.#selection.includes(template.unique),
      },
    }).catch(() => undefined);
    // Handle selection...
  }
}
```

### Generic Tree Picker Modal (Foundation)

**Location:** `/Umbraco.Web.UI.Client/src/packages/core/tree/tree-picker-modal/`

The base infrastructure that all picker modals use:
- Generic tree-based item selection
- Search support
- Multiple/single selection modes
- Customizable filtering

### Can We Reuse Umbraco's Components?

**Yes, partially.** Umbraco's `UMB_TEMPLATE_PICKER_MODAL` is designed for Umbraco's template tree (`Umb.Tree.Template`). However:

1. **For selecting Umbraco templates** - We can directly use `umb-input-template` if ProductRoot templates should be Umbraco templates
2. **For custom view selection** - We can follow the same pattern to create our own picker

---

## Current ProductRoot State

### Existing Properties

ProductRoot currently has no template/view properties. The model includes:
- Core: `Id`, `RootName`, `ProductType`, `TaxGroup`
- Media: `RootImages`, `Videos`
- SEO: `MetaDescription`, `PageTitle`, `NoIndex`, `OpenGraphImage`, `CanonicalUrl`
- Config: `IsDigitalProduct`, `ProductOptions`, `DefaultPackageConfigurations`

### UI Structure

The product editor (`product-detail.element.ts`) has tabs:
1. Details
2. Basic Info
3. Media
4. Shipping
5. SEO
6. Feed
7. Stock
8. Variants
9. Options
10. Filters

---

## Design Decision: Template Source

### Option A: Use Umbraco Templates Directly

Link products to Umbraco's template system (`cmsTemplate` table).

**Pros:**
- Reuse Umbraco's template picker UI components
- Templates managed in one place
- Familiar to Umbraco developers

**Cons:**
- Tight coupling to Umbraco's template system
- Templates must exist in Umbraco backoffice
- May be overkill for simple product rendering

### Option B: Custom View Alias (Recommended)

Store a view alias/path string that references files in `/Views/Products/` folder.

**Pros:**
- Simpler implementation
- Decoupled from Umbraco's template system
- More flexible for custom product rendering scenarios
- Products can reference any Razor view

**Cons:**
- Need to build our own view picker UI
- Views must be managed outside Umbraco backoffice

**Recommendation:** Option B - Simple view alias on ProductRoot.

---

## Implementation Plan

### Phase 1: Backend Model Changes

#### 1.1 Add Property to ProductRoot

**File:** `src/Merchello.Core/Products/Models/ProductRoot.cs`

```csharp
/// <summary>
/// The view alias used to render this product on the front-end.
/// Example: "ProductDetail" -> /Views/Products/ProductDetail.cshtml
/// </summary>
[MaxLength(200)]
public string? ViewAlias { get; set; }
```

#### 1.2 Database Migration

Create migration to add column:
- `merchelloProductRoots.ViewAlias` (nvarchar 200, nullable)

### Phase 2: DTO & API Changes

#### 2.1 Update DTOs

**ProductRootDetailDto:**
```csharp
public string? ViewAlias { get; set; }
```

**UpdateProductRootDto:**
```csharp
public string? ViewAlias { get; set; }
```

#### 2.2 API Endpoint for Available Views

Create endpoint to list available product views:

**File:** `src/Merchello/Controllers/ProductsApiController.cs`

```csharp
[HttpGet("views")]
public async Task<IActionResult> GetAvailableViews()
{
    // Scan /Views/Products/ folder for .cshtml files
    // Return list of view aliases
}
```

### Phase 3: TypeScript Types

**File:** `src/Merchello/Client/src/products/types/product.types.ts`

```typescript
interface ProductRootDetailDto {
  // ... existing properties
  viewAlias?: string;
}

interface UpdateProductRootDto {
  // ... existing properties
  viewAlias?: string;
}

interface ProductViewDto {
  alias: string;
  displayName: string;
  path: string;
}
```

### Phase 4: UI Components

#### 4.1 View Picker Modal

**File:** `src/Merchello/Client/src/products/modals/view-picker-modal.element.ts`

```typescript
@customElement('merchello-view-picker-modal')
export class MerchelloViewPickerModalElement extends UmbLitElement {
  // List available views
  // Allow single selection
  // Return selected view alias
}
```

**File:** `src/Merchello/Client/src/products/modals/view-picker-modal.token.ts`

```typescript
export const MERCHELLO_VIEW_PICKER_MODAL = new UmbModalToken<...>(...);
```

#### 4.2 Add to Product Detail Editor

**File:** `src/Merchello/Client/src/products/components/product-detail.element.ts`

Add view selection to the Details tab:
- Label: "Product View"
- Description: "Select the Razor view used to render this product"
- Input: Button that opens view picker modal
- Display: Currently selected view (or "Default" if not set)

### Phase 5: Front-End Rendering

#### 5.1 Create View Resolution Service

**File:** `src/Merchello.Core/Products/Services/ProductViewResolver.cs`

```csharp
public class ProductViewResolver : IProductViewResolver
{
    public string ResolveViewPath(ProductRoot product)
    {
        // Use ProductRoot.ViewAlias if set, otherwise fall back to "Default"
        var alias = product.ViewAlias ?? "Default";
        return $"~/Views/Products/{alias}.cshtml";
    }
}
```

#### 5.2 Default Product Views

Create starter views:
- `/Views/Products/Default.cshtml` - Basic product display
- `/Views/Products/Gallery.cshtml` - Image-focused layout
- `/Views/Products/Technical.cshtml` - Spec-heavy products

---

## Files to Modify

### Backend (.NET)

| File | Change |
|------|--------|
| `src/Merchello.Core/Products/Models/ProductRoot.cs` | Add `ViewAlias` property |
| `src/Merchello.Core/Products/Dtos/ProductRootDetailDto.cs` | Add `ViewAlias` |
| `src/Merchello.Core/Products/Dtos/UpdateProductRootDto.cs` | Add `ViewAlias` |
| `src/Merchello.Core/Products/Mapping/ProductRootDbMapping.cs` | Map new property |
| `src/Merchello.Core/Products/Factories/ProductRootFactory.cs` | Include in factory |
| `src/Merchello/Controllers/ProductsApiController.cs` | Add views endpoint |
| `migrations.ps1` | Run for new migration |

### Frontend (TypeScript/Lit)

| File | Change |
|------|--------|
| `src/Merchello/Client/src/products/types/product.types.ts` | Add `viewAlias` |
| `src/Merchello/Client/src/products/components/product-detail.element.ts` | Add view picker UI |
| `src/Merchello/Client/src/products/modals/view-picker-modal.element.ts` | New file |
| `src/Merchello/Client/src/products/modals/view-picker-modal.token.ts` | New file |
| `src/Merchello/Client/src/api/merchello-api.ts` | Add getProductViews() |

---

## Open Questions

1. **Should variants have individual views?** Or is ProductRoot-level sufficient?
2. **Should views be validated on save?** (check file exists)
3. **Should we integrate with Umbraco's template system** for users who prefer that?

---

## Summary

This implementation adds a simple but powerful view selection system:

1. **ProductRoot.ViewAlias** - Stores the selected view per product
2. **View Picker Modal** - UI for selecting available views
3. **View Resolver Service** - Resolves final view path (falls back to "Default")
4. **Starter Views** - Basic templates to get started

The approach is intentionally simpler than Umbraco's template system (no junction table, no multiple allowed templates) because products typically need one view, not multiple options per content instance.
