namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request DTO for Apple Pay merchant validation.
/// </summary>
public class ApplePayValidationRequestDto
{
    /// <summary>
    /// The validation URL provided by Apple Pay during the onvalidatemerchant event.
    /// This URL is specific to each transaction and must be called to validate the merchant.
    /// </summary>
    public required string ValidationUrl { get; init; }

    /// <summary>
    /// Optional display name to show in the Apple Pay payment sheet.
    /// If not provided, the store name from settings will be used.
    /// </summary>
    public string? DisplayName { get; init; }
}
