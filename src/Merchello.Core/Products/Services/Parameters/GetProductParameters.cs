namespace Merchello.Core.Products.Services.Parameters;

public class GetProductParameters
{
    public Guid ProductId { get; set; }
    public bool IncludeProductRoot { get; set; } = true;
    public bool IncludeVariants { get; set; } = false;
    public bool IncludeTaxGroup { get; set; } = false;
    public bool IncludeProductFilters { get; set; } = false;
    public bool IncludeProductWarehouses { get; set; } = false;
    public bool IncludeProductRootWarehouses { get; set; } = false;
    public bool IncludeShippingRestrictions { get; set; } = false;

    public bool NoTracking { get; set; } = true;
}

