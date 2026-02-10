namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// Per-supplier CSV settings for Supplier Direct FTP/SFTP deliveries.
/// </summary>
public class CsvDeliverySettingsDto
{
    /// <summary>
    /// Ordered mapping of field key to output header label.
    /// </summary>
    public Dictionary<string, string>? Columns { get; set; }

    /// <summary>
    /// Static columns to append to each CSV row (header/value).
    /// </summary>
    public Dictionary<string, string>? StaticColumns { get; set; }
}
