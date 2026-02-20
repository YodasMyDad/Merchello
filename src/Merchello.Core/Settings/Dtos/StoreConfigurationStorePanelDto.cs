namespace Merchello.Core.Settings.Dtos;

public class StoreConfigurationStorePanelDto
{
    public string InvoiceNumberPrefix { get; set; } = "INV-";

    public string Name { get; set; } = "Acme Store";

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? WebsiteUrl { get; set; }

    public string Address { get; set; } = "123 Commerce Street\nNew York, NY 10001\nUnited States";

    public Guid? LogoMediaKey { get; set; }

    public string? LogoUrl { get; set; }

    public bool DisplayPricesIncTax { get; set; } = true;

    public bool ShowStockLevels { get; set; } = true;

    public int LowStockThreshold { get; set; } = 5;
}
