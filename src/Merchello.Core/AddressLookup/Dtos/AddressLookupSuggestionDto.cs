namespace Merchello.Core.AddressLookup.Dtos;

public class AddressLookupSuggestionDto
{
    public required string Id { get; init; }

    public required string Label { get; init; }

    public string? Description { get; init; }
}
