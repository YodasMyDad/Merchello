namespace Merchello.Core.AddressLookup.Dtos;

/// <summary>
/// DTO for address lookup provider information.
/// </summary>
public class AddressLookupProviderDto
{
    public required string Alias { get; init; }

    public required string DisplayName { get; init; }

    public string? Icon { get; init; }

    public string? IconSvg { get; init; }

    public string? Description { get; init; }

    public bool RequiresApiCredentials { get; init; }

    public string? SetupInstructions { get; init; }

    public IReadOnlyCollection<string>? SupportedCountries { get; init; }

    public bool IsActive { get; init; }

    public Dictionary<string, string>? Configuration { get; init; }
}
