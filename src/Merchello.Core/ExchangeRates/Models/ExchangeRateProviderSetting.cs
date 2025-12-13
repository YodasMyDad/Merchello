using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.ExchangeRates.Models;

public class ExchangeRateProviderSetting
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public string ProviderAlias { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? ConfigurationJson { get; set; }

    public DateTime? LastFetchedAt { get; set; }

    /// <summary>
    /// JSON snapshot of last successful rates for fallback when cache/provider is unavailable.
    /// </summary>
    public string? LastRatesJson { get; set; }

    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
    public DateTime UpdateDate { get; set; } = DateTime.UtcNow;
}

