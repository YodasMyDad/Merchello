namespace Merchello.Core.AddressLookup.Providers.Models;

/// <summary>
/// Result of an address lookup suggestion query.
/// </summary>
public class AddressLookupSuggestionsResult
{
    private AddressLookupSuggestionsResult(bool success, IReadOnlyCollection<AddressLookupSuggestion> suggestions, string? errorMessage)
    {
        Success = success;
        Suggestions = suggestions;
        ErrorMessage = errorMessage;
    }

    public bool Success { get; }

    public IReadOnlyCollection<AddressLookupSuggestion> Suggestions { get; }

    public string? ErrorMessage { get; }

    public static AddressLookupSuggestionsResult Ok(IEnumerable<AddressLookupSuggestion> suggestions)
        => new(true, suggestions.ToList(), null);

    public static AddressLookupSuggestionsResult Fail(string errorMessage)
        => new(false, Array.Empty<AddressLookupSuggestion>(), errorMessage);
}
