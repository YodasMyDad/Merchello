using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Shipping.Models;

/// <summary>
/// Stores persisted settings for a shipping provider implementation.
/// </summary>
public class ShippingProviderConfiguration
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public string ProviderKey { get; set; } = null!;
    public string? DisplayName { get; set; }
    public bool IsEnabled { get; set; }
    public string? SettingsJson { get; set; }
    public DateTime UpdateDate { get; set; } = DateTime.UtcNow;
    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
}
