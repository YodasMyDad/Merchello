using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace Merchello.Core.Shipping.Models;

/// <summary>
/// Per-warehouse configuration for a dynamic shipping provider.
/// Controls markup, service exclusions, and delivery time overrides
/// for a specific provider at a specific warehouse.
/// </summary>
[NotMapped]
public class WarehouseProviderConfig
{
    public Guid Id { get; set; }

    /// <summary>
    /// The warehouse this configuration applies to.
    /// </summary>
    public Guid WarehouseId { get; set; }

    /// <summary>
    /// The provider key (e.g., "fedex", "ups").
    /// </summary>
    public string ProviderKey { get; set; } = null!;

    /// <summary>
    /// Whether this provider is enabled for the warehouse.
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// Default markup percentage applied to all services from this provider.
    /// E.g., 10 = 10% markup on carrier rates.
    /// </summary>
    public decimal DefaultMarkupPercent { get; set; }

    /// <summary>
    /// JSON-serialized per-service markup overrides.
    /// Format: {"FEDEX_GROUND": 5, "FEDEX_2_DAY": 15}
    /// </summary>
    public string? ServiceMarkupsJson { get; set; }

    /// <summary>
    /// JSON-serialized list of excluded service type codes.
    /// Format: ["FIRST_OVERNIGHT", "PRIORITY_OVERNIGHT"]
    /// </summary>
    public string? ExcludedServiceTypesJson { get; set; }

    /// <summary>
    /// Optional override for minimum delivery days (replaces carrier estimate).
    /// </summary>
    public int? DefaultDaysFromOverride { get; set; }

    /// <summary>
    /// Optional override for maximum delivery days (replaces carrier estimate).
    /// </summary>
    public int? DefaultDaysToOverride { get; set; }

    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
    public DateTime UpdateDate { get; set; } = DateTime.UtcNow;

    private Dictionary<string, decimal>? _serviceMarkupsCache;
    private List<string>? _excludedServiceTypesCache;

    /// <summary>
    /// Deserialized per-service markup overrides (cached after first access).
    /// </summary>
    public Dictionary<string, decimal> ServiceMarkups =>
        _serviceMarkupsCache ??= string.IsNullOrEmpty(ServiceMarkupsJson)
            ? []
            : JsonSerializer.Deserialize<Dictionary<string, decimal>>(ServiceMarkupsJson) ?? [];

    /// <summary>
    /// Deserialized list of excluded service type codes (cached after first access).
    /// </summary>
    public List<string> ExcludedServiceTypes =>
        _excludedServiceTypesCache ??= string.IsNullOrEmpty(ExcludedServiceTypesJson)
            ? []
            : JsonSerializer.Deserialize<List<string>>(ExcludedServiceTypesJson) ?? [];

    /// <summary>
    /// Gets the effective markup percentage for a specific service code.
    /// Returns the per-service override if available, otherwise the default.
    /// </summary>
    public decimal GetMarkupForService(string serviceCode)
    {
        var markups = ServiceMarkups;
        return markups.GetValueOrDefault(serviceCode, DefaultMarkupPercent);
    }

    /// <summary>
    /// Determines whether a service code is excluded by this configuration.
    /// </summary>
    public bool IsServiceExcluded(string serviceCode)
    {
        var excluded = ExcludedServiceTypes;
        return excluded.Contains(serviceCode, StringComparer.OrdinalIgnoreCase);
    }
}
