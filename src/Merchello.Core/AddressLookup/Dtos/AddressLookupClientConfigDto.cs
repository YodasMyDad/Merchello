namespace Merchello.Core.AddressLookup.Dtos;

public class AddressLookupClientConfigDto
{
    public bool IsEnabled { get; init; }

    public string? ProviderAlias { get; init; }

    public string? ProviderName { get; init; }

    public string? ProviderDescription { get; init; }

    public IReadOnlyCollection<string>? SupportedCountries { get; init; }

    public int MinQueryLength { get; init; }

    public int MaxSuggestions { get; init; }
}
