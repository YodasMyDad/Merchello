using System.Text.Json;

namespace Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv;

/// <summary>
/// Configurable column mapping for CSV generation.
/// Allows suppliers to define their own column order and headers.
/// </summary>
public record CsvColumnMapping
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <summary>
    /// Ordered list of columns to include.
    /// Keys are internal field names, values are output column headers.
    /// </summary>
    public Dictionary<string, string> Columns { get; init; } = new()
    {
        ["OrderNumber"] = "Order Number",
        ["Sku"] = "SKU",
        ["ProductName"] = "Product Name",
        ["Quantity"] = "Quantity",
        ["UnitPrice"] = "Unit Price",
        ["RecipientName"] = "Ship To Name",
        ["Company"] = "Company",
        ["AddressOne"] = "Address Line 1",
        ["AddressTwo"] = "Address Line 2",
        ["TownCity"] = "City",
        ["CountyState"] = "State/Province",
        ["PostalCode"] = "Postal Code",
        ["CountryCode"] = "Country",
        ["Phone"] = "Phone"
    };

    /// <summary>
    /// Static columns to add to every row.
    /// Keys are column headers, values are the fixed values.
    /// </summary>
    public Dictionary<string, string> StaticColumns { get; init; } = [];

    /// <summary>
    /// Gets the default column mapping.
    /// </summary>
    public static CsvColumnMapping Default => new();

    /// <summary>
    /// Parses a column mapping from JSON.
    /// </summary>
    public static CsvColumnMapping? FromJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<CsvColumnMapping>(json, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// Serializes the column mapping to JSON.
    /// </summary>
    public string ToJson() => JsonSerializer.Serialize(this, JsonOptions);
}
