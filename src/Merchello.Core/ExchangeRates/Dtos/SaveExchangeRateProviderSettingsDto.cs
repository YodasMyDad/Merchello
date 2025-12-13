namespace Merchello.Core.ExchangeRates.Dtos;

/// <summary>
/// Request to save exchange rate provider settings
/// </summary>
public class SaveExchangeRateProviderSettingsDto
{
    /// <summary>
    /// Configuration values (API keys, etc.)
    /// </summary>
    public Dictionary<string, string> Configuration { get; set; } = new();
}
