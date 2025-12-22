namespace Merchello.Core.Settings.Dtos;

/// <summary>
/// Store settings exposed to the admin UI
/// </summary>
public class StoreSettingsDto
{
    /// <summary>
    /// Store currency code (ISO 4217), e.g., "GBP", "USD", "EUR"
    /// </summary>
    public string CurrencyCode { get; set; } = string.Empty;

    /// <summary>
    /// Store currency symbol, e.g., "£", "$", "€"
    /// </summary>
    public string CurrencySymbol { get; set; } = string.Empty;

    /// <summary>
    /// Invoice number prefix, e.g., "INV-"
    /// </summary>
    public string InvoiceNumberPrefix { get; set; } = string.Empty;

    /// <summary>
    /// Stock threshold below which items are considered "low stock".
    /// Products with stock at or below this value (but greater than 0) display a warning badge.
    /// </summary>
    public int LowStockThreshold { get; set; } = 10;
}
