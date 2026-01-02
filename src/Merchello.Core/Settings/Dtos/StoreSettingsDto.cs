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

    /// <summary>
    /// Default length for auto-generated discount codes.
    /// </summary>
    public int DiscountCodeLength { get; set; } = 8;

    /// <summary>
    /// Default priority for newly created discounts.
    /// Lower numbers = higher priority.
    /// </summary>
    public int DefaultDiscountPriority { get; set; } = 1000;

    /// <summary>
    /// Default number of items per page in list views.
    /// </summary>
    public int DefaultPaginationPageSize { get; set; } = 50;

    /// <summary>
    /// Quick-select refund amount percentages shown in the refund modal.
    /// E.g., [50] shows a "50%" button, [25, 50, 75] shows three buttons.
    /// </summary>
    public int[] RefundQuickAmountPercentages { get; set; } = [50];
}
