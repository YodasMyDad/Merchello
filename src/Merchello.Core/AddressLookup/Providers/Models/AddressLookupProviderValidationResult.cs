namespace Merchello.Core.AddressLookup.Providers.Models;

/// <summary>
/// Result of validating an address lookup provider configuration.
/// </summary>
public sealed class AddressLookupProviderValidationResult
{
    private AddressLookupProviderValidationResult(bool isValid, string? errorMessage, Dictionary<string, string>? details)
    {
        IsValid = isValid;
        ErrorMessage = errorMessage;
        Details = details;
    }

    public bool IsValid { get; }

    public string? ErrorMessage { get; }

    public Dictionary<string, string>? Details { get; }

    public static AddressLookupProviderValidationResult Valid(Dictionary<string, string>? details = null)
        => new(true, null, details);

    public static AddressLookupProviderValidationResult Invalid(string errorMessage, Dictionary<string, string>? details = null)
        => new(false, errorMessage, details);
}
