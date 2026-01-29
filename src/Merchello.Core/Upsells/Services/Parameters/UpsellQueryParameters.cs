using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Services.Parameters;

/// <summary>
/// Parameters for querying upsell rules with filtering, sorting, and pagination.
/// </summary>
public class UpsellQueryParameters
{
    public UpsellStatus? Status { get; set; }
    public string? SearchTerm { get; set; }
    public UpsellDisplayLocation? DisplayLocation { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public UpsellOrderBy OrderBy { get; set; } = UpsellOrderBy.DateCreated;
    public bool Descending { get; set; } = true;
}
