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

    // Store currency amounts (internal)
    public decimal SubTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public decimal Shipping { get; set; }
    public decimal Total { get; set; }
    public string FormattedSubTotal { get; set; } = "";
    public string FormattedDiscount { get; set; } = "";
    public string FormattedTax { get; set; } = "";
    public string FormattedTotal { get; set; } = "";
    public string CurrencySymbol { get; set; } = "";

    // Display amounts (in customer's selected currency)
    public decimal DisplaySubTotal { get; set; }
    public decimal DisplayDiscount { get; set; }
    public decimal DisplayTax { get; set; }
    public decimal DisplayShipping { get; set; }
    public decimal DisplayTotal { get; set; }
    public string FormattedDisplaySubTotal { get; set; } = "";
    public string FormattedDisplayDiscount { get; set; } = "";
    public string FormattedDisplayTax { get; set; } = "";
    public string FormattedDisplayShipping { get; set; } = "";
    public string FormattedDisplayTotal { get; set; } = "";

    // Customer's selected currency info
    public string DisplayCurrencyCode { get; set; } = "";
    public string DisplayCurrencySymbol { get; set; } = "";
    public decimal ExchangeRate { get; set; } = 1.0m;

    public int ItemCount { get; set; }
    public bool IsEmpty { get; set; }
}

public class BasketLineItemDto
{
    public Guid Id { get; set; }
    public string Sku { get; set; } = "";
    public string Name { get; set; } = "";
    public int Quantity { get; set; }

    // Store currency amounts
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string FormattedUnitPrice { get; set; } = "";
    public string FormattedLineTotal { get; set; } = "";

    // Display amounts (in customer's selected currency)
    public decimal DisplayUnitPrice { get; set; }
    public decimal DisplayLineTotal { get; set; }
    public string FormattedDisplayUnitPrice { get; set; } = "";
    public string FormattedDisplayLineTotal { get; set; } = "";

    public string LineItemType { get; set; } = "";
    public string? DependantLineItemSku { get; set; }
}
