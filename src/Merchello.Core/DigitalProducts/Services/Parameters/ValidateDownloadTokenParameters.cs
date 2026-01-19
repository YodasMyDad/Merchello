namespace Merchello.Core.DigitalProducts.Services.Parameters;

/// <summary>
/// Parameters for validating a download token.
/// </summary>
public class ValidateDownloadTokenParameters
{
    /// <summary>
    /// The download token to validate.
    /// </summary>
    public required string Token { get; init; }

    /// <summary>
    /// Optional customer ID to verify ownership.
    /// If provided, verifies the link belongs to this customer.
    /// </summary>
    public Guid? CustomerId { get; init; }
}
