namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Result of a reset token validation.
/// </summary>
public class ValidateResetTokenResultDto
{
    /// <summary>
    /// Whether the token is valid.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// Email address associated with the token (if valid).
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Error message if the token is invalid.
    /// </summary>
    public string? ErrorMessage { get; set; }
}
