namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Persisted provider configuration
/// </summary>
public class PaymentProviderSettingDto
{
    public Guid Id { get; set; }
    public required string ProviderAlias { get; set; }
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
    public PaymentProviderDto? Provider { get; set; }
}
