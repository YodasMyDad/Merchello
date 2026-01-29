using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;

namespace Merchello.Core.Upsells.Services;

/// <summary>
/// Builds enriched upsell context line items from basket or invoice data.
/// </summary>
public class UpsellContextBuilder(IProductService productService) : IUpsellContextBuilder
{
    public async Task<List<UpsellContextLineItem>> BuildLineItemsAsync(IEnumerable<LineItem> lineItems, CancellationToken ct = default)
    {
        var items = lineItems
            .Where(li => li.ProductId.HasValue)
            .ToList();

        if (items.Count == 0)
        {
            return [];
        }

        var productIds = items
            .Select(li => li.ProductId!.Value)
            .Distinct()
            .ToList();

        var products = await productService.GetVariantsByIds(productIds, ct);
        var productLookup = products.ToDictionary(p => p.Id);

        var enriched = new List<UpsellContextLineItem>();
        foreach (var lineItem in items)
        {
            if (!productLookup.TryGetValue(lineItem.ProductId!.Value, out var product))
            {
                continue;
            }

            enriched.Add(MapLineItem(lineItem, product));
        }

        return enriched;
    }

    public async Task<UpsellContextLineItem?> BuildLineItemAsync(
        Guid productId,
        int quantity,
        decimal unitPrice,
        CancellationToken ct = default)
    {
        var products = await productService.GetVariantsByIds([productId], ct);
        var product = products.FirstOrDefault();
        if (product == null)
        {
            return null;
        }

        var resolvedUnitPrice = unitPrice <= 0 ? product.Price : unitPrice;
        return MapLineItem(product, quantity, resolvedUnitPrice, Guid.NewGuid());
    }

    private static UpsellContextLineItem MapLineItem(LineItem lineItem, Product product)
    {
        return MapLineItem(product, lineItem.Quantity, lineItem.Amount, lineItem.Id, lineItem.Sku);
    }

    private static UpsellContextLineItem MapLineItem(
        Product product,
        int quantity,
        decimal unitPrice,
        Guid lineItemId,
        string? skuOverride = null)
    {
        var filters = product.Filters?.ToList() ?? [];

        return new UpsellContextLineItem
        {
            LineItemId = lineItemId,
            ProductId = product.Id,
            ProductRootId = product.ProductRootId,
            ProductTypeId = product.ProductRoot?.ProductTypeId,
            CollectionIds = product.ProductRoot?.Collections?.Select(c => c.Id).ToList() ?? [],
            ProductFilterIds = filters.Select(f => f.Id).ToList(),
            FiltersByGroup = filters
                .GroupBy(f => f.ProductFilterGroupId)
                .ToDictionary(g => g.Key, g => g.Select(f => f.Id).ToList()),
            SupplierId = ResolveSupplierId(product),
            Sku = skuOverride ?? product.Sku ?? string.Empty,
            Quantity = quantity,
            UnitPrice = unitPrice
        };
    }

    private static Guid? ResolveSupplierId(Product product)
    {
        var rootWarehouses = product.ProductRoot?.ProductRootWarehouses?
            .OrderBy(prw => prw.PriorityOrder)
            .Select(prw => prw.Warehouse)
            .Where(w => w?.SupplierId.HasValue == true)
            .ToList();

        var rootSupplier = rootWarehouses?
            .Select(w => w!.SupplierId)
            .FirstOrDefault();

        if (rootSupplier.HasValue)
        {
            return rootSupplier.Value;
        }

        var productSupplier = product.ProductWarehouses?
            .Select(pw => pw.Warehouse)
            .Where(w => w?.SupplierId.HasValue == true)
            .Select(w => w!.SupplierId)
            .FirstOrDefault();

        return productSupplier;
    }
}
