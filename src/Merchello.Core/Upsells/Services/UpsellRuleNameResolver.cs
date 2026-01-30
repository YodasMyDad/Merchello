using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Suppliers.Services.Interfaces;
using Merchello.Core.Upsells.Dtos;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;

namespace Merchello.Core.Upsells.Services;

/// <summary>
/// Resolves GUIDs to display names for the admin UI.
/// Follows the DiscountRuleNameResolver pattern.
/// </summary>
public class UpsellRuleNameResolver(
    IProductService productService,
    IProductFilterService productFilterService,
    IProductTypeService productTypeService,
    IProductCollectionService productCollectionService,
    ISupplierService supplierService,
    ICustomerService customerService,
    ICustomerSegmentService customerSegmentService) : IUpsellRuleNameResolver
{
    /// <inheritdoc />
    public async Task ResolveTriggerRuleNamesAsync(List<UpsellTriggerRuleDto> rules, CancellationToken ct = default)
    {
        foreach (var rule in rules)
        {
            if (rule.TriggerIds == null || rule.TriggerIds.Count == 0)
            {
                rule.TriggerNames = [];
                continue;
            }

            rule.TriggerNames = rule.TriggerType switch
            {
                UpsellTriggerType.SpecificProducts => await GetProductNamesAsync(rule.TriggerIds, ct),
                UpsellTriggerType.Collections => await GetCollectionNamesAsync(rule.TriggerIds, ct),
                UpsellTriggerType.ProductTypes => await GetProductTypeNamesAsync(rule.TriggerIds, ct),
                UpsellTriggerType.ProductFilters => await GetFilterNamesAsync(rule.TriggerIds, ct),
                UpsellTriggerType.Suppliers => await GetSupplierNamesAsync(rule.TriggerIds, ct),
                _ => []
            };

            // Resolve extract filter value names
            if (rule.ExtractFilterIds is { Count: > 0 })
            {
                rule.ExtractFilterNames = await GetFilterNamesWithGroupAsync(rule.ExtractFilterIds, ct);
            }
            else
            {
                rule.ExtractFilterNames = [];
            }
        }
    }

    /// <inheritdoc />
    public async Task ResolveRecommendationRuleNamesAsync(List<UpsellRecommendationRuleDto> rules, CancellationToken ct = default)
    {
        foreach (var rule in rules)
        {
            if (rule.RecommendationIds == null || rule.RecommendationIds.Count == 0)
            {
                rule.RecommendationNames = [];
                continue;
            }

            rule.RecommendationNames = rule.RecommendationType switch
            {
                UpsellRecommendationType.SpecificProducts => await GetProductNamesAsync(rule.RecommendationIds, ct),
                UpsellRecommendationType.Collections => await GetCollectionNamesAsync(rule.RecommendationIds, ct),
                UpsellRecommendationType.ProductTypes => await GetProductTypeNamesAsync(rule.RecommendationIds, ct),
                UpsellRecommendationType.ProductFilters => await GetFilterNamesAsync(rule.RecommendationIds, ct),
                UpsellRecommendationType.Suppliers => await GetSupplierNamesAsync(rule.RecommendationIds, ct),
                _ => []
            };

            // Resolve match filter value names
            if (rule.MatchFilterIds is { Count: > 0 })
            {
                rule.MatchFilterNames = await GetFilterNamesWithGroupAsync(rule.MatchFilterIds, ct);
            }
            else
            {
                rule.MatchFilterNames = [];
            }
        }
    }

    /// <inheritdoc />
    public async Task ResolveEligibilityRuleNamesAsync(List<UpsellEligibilityRuleDto> rules, CancellationToken ct = default)
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
                UpsellEligibilityType.SpecificCustomers => await GetCustomerNamesAsync(rule.EligibilityIds, ct),
                UpsellEligibilityType.CustomerSegments => await GetCustomerSegmentNamesAsync(rule.EligibilityIds, ct),
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

    private async Task<List<string>> GetFilterNamesWithGroupAsync(List<Guid> ids, CancellationToken ct)
    {
        var filters = await productFilterService.GetFiltersByIds(ids, ct);
        return filters
            .Select(f => f.ParentGroup?.Name != null
                ? $"{f.ParentGroup.Name}: {f.Name ?? "Unknown"}"
                : f.Name ?? "Unknown Filter")
            .ToList();
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
