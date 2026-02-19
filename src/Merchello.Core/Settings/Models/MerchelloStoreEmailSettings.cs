namespace Merchello.Core.Settings.Models;

public class MerchelloStoreEmailSettings
{
    public string? DefaultFromAddress { get; set; }

    public string? DefaultFromName { get; set; }

    public MerchelloStoreEmailThemeSettings Theme { get; set; } = new();
}
