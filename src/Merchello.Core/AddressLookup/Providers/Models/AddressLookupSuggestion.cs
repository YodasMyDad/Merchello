namespace Merchello.Core.AddressLookup.Providers.Models;

/// <summary>
/// A single address lookup suggestion returned by a provider.
/// </summary>
public class AddressLookupSuggestion
{
    public AddressLookupSuggestion(string id, string label, string? description = null)
    {
        Id = id;
        Label = label;
        Description = description;
    }

    public string Id { get; }

    public string Label { get; }

    public string? Description { get; }
}
