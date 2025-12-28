namespace Merchello.Site.Storefront.Models;

public class BasketResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public int ItemCount { get; set; }
    public decimal Total { get; set; }
    public string? FormattedTotal { get; set; }
}

public class BasketCountResponse
{
    public int ItemCount { get; set; }
    public decimal Total { get; set; }
    public string? FormattedTotal { get; set; }
}

public class FullBasketResponse
{
    public List<BasketLineItemDto> Items { get; set; } = [];
    public decimal SubTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public string FormattedSubTotal { get; set; } = "";
    public string FormattedDiscount { get; set; } = "";
    public string FormattedTax { get; set; } = "";
    public string FormattedTotal { get; set; } = "";
    public string CurrencySymbol { get; set; } = "";
    public int ItemCount { get; set; }
    public bool IsEmpty { get; set; }
}

public class BasketLineItemDto
{
    public Guid Id { get; set; }
    public string Sku { get; set; } = "";
    public string Name { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string FormattedUnitPrice { get; set; } = "";
    public string FormattedLineTotal { get; set; } = "";
    public string LineItemType { get; set; } = "";
    public string? DependantLineItemSku { get; set; }
}
