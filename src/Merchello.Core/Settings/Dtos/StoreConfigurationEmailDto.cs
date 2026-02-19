namespace Merchello.Core.Settings.Dtos;

public class StoreConfigurationEmailDto
{
    public string? DefaultFromAddress { get; set; }

    public string? DefaultFromName { get; set; }

    public StoreConfigurationEmailThemeDto Theme { get; set; } = new();
}
