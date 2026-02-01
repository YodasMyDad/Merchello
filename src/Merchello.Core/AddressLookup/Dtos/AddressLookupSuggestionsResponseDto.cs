namespace Merchello.Core.AddressLookup.Dtos;

public class AddressLookupSuggestionsResponseDto
{
    public bool Success { get; init; }

    public string? ErrorMessage { get; init; }

    public List<AddressLookupSuggestionDto> Suggestions { get; init; } = [];
}
