namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Product data sent to a fulfilment provider during sync.
/// </summary>
public record FulfilmentProduct
{
    public required Guid ProductId { get; init; }
    public required string Sku { get; init; }
    public required string Name { get; init; }
    public string? Barcode { get; init; }
    public decimal? Weight { get; init; }
    public decimal? Length { get; init; }
    public decimal? Width { get; init; }
    public decimal? Height { get; init; }
    public decimal? Cost { get; init; }
    public string? CountryOfOrigin { get; init; }
    public string? HsCode { get; init; }
    public Dictionary<string, object> ExtendedData { get; init; } = [];
}
