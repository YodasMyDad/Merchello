using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Discounts.Dtos;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Suppliers.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;

namespace Merchello.Core.Discounts.Services;

/// <summary>
/// Resolves display names for discount rule target and eligibility IDs.
/// </summary>
public class DiscountRuleNameResolver(
    IProductService productService,
    IProductFilterService productFilterService,
    IProductTypeService productTypeService,
    IProductCollectionService productCollectionService,
    ISupplierService supplierService,
    IWarehouseService warehouseService,
    ICustomerService customerService,
    ICustomerSegmentService customerSegmentService) : IDiscountRuleNameResolver
{
    /// <inheritdoc />
    public async Task ResolveTargetRuleNamesAsync(List<DiscountTargetRuleDto> rules, CancellationToken ct = default)
    {
        foreach (var rule in rules)
        {
            if (rule.TargetIds == null || rule.TargetIds.Count == 0)
            {
                rule.TargetNames = [];
                continue;
            }

            rule.TargetNames = rule.TargetType switch
            {
                DiscountTargetType.SpecificProducts => await GetProductNamesAsync(rule.TargetIds, ct),
                DiscountTargetType.Collections => await GetCollectionNamesAsync(rule.TargetIds, ct),
                DiscountTargetType.ProductTypes => await GetProductTypeNamesAsync(rule.TargetIds, ct),
                DiscountTargetType.ProductFilters => await GetFilterNamesAsync(rule.TargetIds, ct),
                DiscountTargetType.Suppliers => await GetSupplierNamesAsync(rule.TargetIds, ct),
                DiscountTargetType.Warehouses => await GetWarehouseNamesAsync(rule.TargetIds, ct),
                _ => []
            };
        }
    }

    /// <inheritdoc />
    public async Task ResolveEligibilityRuleNamesAsync(List<DiscountEligibilityRuleDto> rules, CancellationToken ct = default)
    {
        foreach (var rule in rules)
        {
            if (rule.EligibilityIds == null || rule.EligibilityIds.Count == 0)
            {
                rule.EligibilityNames = [];
                continue;
            }

            rule.EligibilityNames = rule.EligibilityType switch
            {
                DiscountEligibilityType.SpecificCustomers => await GetCustomerNamesAsync(rule.EligibilityIds, ct),
                DiscountEligibilityType.CustomerSegments => await GetCustomerSegmentNamesAsync(rule.EligibilityIds, ct),
                _ => []
            };
        }
    }

    private async Task<List<string>> GetProductNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var namesByIds = await productService.GetProductNamesByIdsAsync(ids, ct);
        return ids.Where(namesByIds.ContainsKey).Select(id => namesByIds[id]).ToList();
    }

    private async Task<List<string>> GetCollectionNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var allCollections = await productCollectionService.GetProductCollections(ct);
        if (allCollections.Count == 0) return [];

        var idSet = ids.ToHashSet();
        return allCollections
            .Where(c => idSet.Contains(c.Id))
            .Select(c => c.Name ?? "Unknown Collection")
            .ToList();
    }

    private async Task<List<string>> GetProductTypeNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var allTypes = await productTypeService.GetProductTypes(ct);
        if (allTypes.Count == 0) return [];

        var idSet = ids.ToHashSet();
        return allTypes
            .Where(t => idSet.Contains(t.Id))
            .Select(t => t.Name ?? "Unknown Type")
            .ToList();
    }

    private async Task<List<string>> GetFilterNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var filters = await productFilterService.GetFiltersByIds(ids, ct);
        return filters.Select(f => f.Name ?? "Unknown Filter").ToList();
    }

    private async Task<List<string>> GetSupplierNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var allSuppliers = await supplierService.GetSuppliersAsync(ct);
        if (allSuppliers.Count == 0) return [];

        var idSet = ids.ToHashSet();
        return allSuppliers
            .Where(s => idSet.Contains(s.Id))
            .Select(s => s.Name)
            .ToList();
    }

    private async Task<List<string>> GetWarehouseNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var allWarehouses = await warehouseService.GetWarehouses(ct);
        if (allWarehouses.Count == 0) return [];

        var idSet = ids.ToHashSet();
        return allWarehouses
            .Where(w => idSet.Contains(w.Id))
            .Select(w => w.Name ?? "Unknown Warehouse")
            .ToList();
    }

    private async Task<List<string>> GetCustomerNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var customers = await customerService.GetByIdsAsync(ids, ct);
        if (customers.Count == 0) return [];

        var idSet = ids.ToHashSet();
        return customers
            .Where(c => idSet.Contains(c.Id))
            .Select(c => !string.IsNullOrEmpty(c.FirstName) || !string.IsNullOrEmpty(c.LastName)
                ? $"{c.FirstName} {c.LastName}".Trim()
                : c.Email)
            .ToList();
    }

    private async Task<List<string>> GetCustomerSegmentNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var allSegments = await customerSegmentService.GetAllAsync(ct);
        if (allSegments.Count == 0) return [];

        var idSet = ids.ToHashSet();
        return allSegments
            .Where(s => idSet.Contains(s.Id))
            .Select(s => s.Name)
            .ToList();
    }
}
