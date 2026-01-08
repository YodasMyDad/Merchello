namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Result of password validation against Umbraco's password requirements.
/// </summary>
public class ValidatePasswordResultDto
{
    /// <summary>
    /// Whether the password meets all requirements.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// List of validation error messages if password is invalid.
    /// </summary>
    public List<string> Errors { get; set; } = [];
}
