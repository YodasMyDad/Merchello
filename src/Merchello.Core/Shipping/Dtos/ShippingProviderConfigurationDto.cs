namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Persisted provider configuration
/// </summary>
public class ShippingProviderConfigurationDto
{
    public Guid Id { get; set; }
    public required string ProviderKey { get; set; }
    public required string DisplayName { get; set; }
    public bool IsEnabled { get; set; }
    public bool IsTestMode { get; set; }
    public Dictionary<string, string>? Configuration { get; set; }
    public int SortOrder { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }

    /// <summary>
    /// Provider metadata
    /// </summary>
    public ShippingProviderDto? Provider { get; set; }
}
