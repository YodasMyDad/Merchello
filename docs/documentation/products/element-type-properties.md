# Element Type Properties

Merchello lets you extend products with custom properties by attaching an Umbraco Element Type. This means you can add any Umbraco property editor -- rich text, media picker, color picker, tags, content picker, and more -- to your products without modifying the database or writing custom code.

## What are Element Types?

In Umbraco, an **Element Type** is a document type that is marked as "Is an Element Type". Unlike regular document types, element types do not create content nodes -- they define a schema of properties that can be embedded in other contexts.

Merchello uses element types to let you define custom product properties. For example, you might create an element type called "Product Details" with properties like:

- `productDescription` (Rich Text Editor)
- `specifications` (Block List)
- `relatedLinks` (Multi URL Picker)
- `warranty` (Textstring)

## How It Works

### 1. Create an Element Type in Umbraco

1. Go to **Settings > Document Types** in the Umbraco backoffice
2. Create a new document type
3. Check **"Is an Element Type"**
4. Add whatever properties you need using any Umbraco property editor
5. Save

### 2. Assign to a Product

In the Merchello backoffice, each product root has two relevant fields:

- **Element Type Alias** (`ElementTypeAlias`) -- the alias of your element type (e.g., `"productDetails"`)
- **Element Property Data** (`ElementPropertyData`) -- the JSON-serialized property values

When you select an element type for a product, the backoffice workspace renders the element type's property editors inline, and the values are stored as JSON in `ElementPropertyData`.

### 3. Access in Views

In your product Razor views, element type properties are accessible through `Model.Content`, which implements `IPublishedContent`:

```html
@model MerchelloProductViewModel
@using Umbraco.Cms.Core.Strings

@{
    // Type-safe access via Value<T>()
    var description = Model.Content.Value<IHtmlEncodedString>("productDescription");
    var warranty = Model.Content.Value<string>("warranty");
    var links = Model.Content.Value<IEnumerable<Umbraco.Cms.Core.Models.Link>>("relatedLinks");
}

@if (description != null)
{
    <div class="product-description">@description</div>
}

@if (!string.IsNullOrEmpty(warranty))
{
    <p><strong>Warranty:</strong> @warranty</p>
}
```

You can also iterate over all properties:

```html
@foreach (var property in Model.Properties)
{
    <p>@property.Alias: @property.GetValue()</p>
}
```

## Under the Hood

### MerchelloPublishedElementFactory

When `ProductContentFinder` resolves a product, it checks if the `ProductRoot` has an `ElementTypeAlias`. If so, it uses `MerchelloPublishedElementFactory` to create an `IPublishedElement` from the stored JSON:

```csharp
// In ProductContentFinder:
if (!string.IsNullOrEmpty(elementTypeAlias))
{
    var propertyValues = productService.DeserializeElementProperties(
        productRoot.ElementPropertyData);

    if (propertyValues.Count > 0)
    {
        element = elementFactory.CreateElement(
            elementTypeAlias,
            productRoot.Id,
            propertyValues);
    }
}
```

The factory:
1. Looks up the element type by alias via Umbraco's `IContentTypeService`
2. Verifies it is actually an element type
3. Gets the published content type from the cache
4. Normalizes the stored JSON values through Umbraco's property editor value conversion pipeline
5. Creates a `PublishedElement` with properly converted property values

This means your element properties go through the same value conversion that regular Umbraco content properties do. Media pickers return media objects, rich text returns `IHtmlEncodedString`, etc.

### Value Normalization

Stored values go through normalization to handle edge cases:

- **JsonElement unwrapping** -- raw JSON values from deserialization are converted to CLR types
- **Editor format conversion** -- values stored in editor format are converted to source format via `propertyEditor.GetValueEditor().FromEditor()`
- **Special editor handling** -- some editors like `MultipleTextstring`, `CheckBoxList`, and `DropDownListFlexible` skip the conversion when they are already in the correct format

### MerchelloPublishedProduct Integration

The `MerchelloPublishedProduct` class (which implements `IPublishedContent`) delegates property access to the element:

```csharp
public IEnumerable<IPublishedProperty> Properties =>
    _element?.Properties ?? Enumerable.Empty<IPublishedProperty>();

public IPublishedProperty? GetProperty(string alias) =>
    _element?.GetProperty(alias);
```

When an element type is configured, the content type becomes a hybrid -- the base content type alias is still `"MerchelloProduct"` (for route hijacking), but property type definitions come from the element type.

## Practical Examples

### Product with Specifications Table

Create an element type `productSpecs` with a Block List property called `specifications`:

```html
@{
    var specs = Model.Content.Value<Umbraco.Cms.Core.Models.Blocks.BlockListModel>("specifications");
}

@if (specs != null && specs.Any())
{
    <table class="specs-table">
        @foreach (var item in specs)
        {
            <tr>
                <td>@item.Content.Value<string>("label")</td>
                <td>@item.Content.Value<string>("value")</td>
            </tr>
        }
    </table>
}
```

### Product with Video

Create an element type with a media picker for video:

```html
@inject Umbraco.Cms.Core.PublishedCache.IPublishedMediaCache MediaCache
@{
    var videoKey = Model.Content.Value<Guid?>("productVideo");
    var video = videoKey.HasValue ? MediaCache.GetById(videoKey.Value) : null;
}

@if (video != null)
{
    <video controls>
        <source src="@video.MediaUrl()" type="video/mp4" />
    </video>
}
```

## Important Notes

- Element properties are **optional**. Products work perfectly without an element type. Only add one when you need custom properties beyond what the standard product model provides.

- If the element type is deleted or renamed in Umbraco, the stored property data remains on the product but will not be rendered (the factory logs a warning and continues without element properties).

- Property values are stored as JSON in `ProductRoot.ElementPropertyData`. There is no separate database table -- everything is serialized inline.

- The `ProductRoot.Description` field (rich text stored directly on the product model) is separate from any element type rich text property. You can use both.

## Next Steps

- [Building Product Views](./product-views.md) -- rendering product pages
- [Product Routing](./product-routing.md) -- how the routing pipeline creates the published element
- [Products Overview](./products-overview.md) -- the full product data model
