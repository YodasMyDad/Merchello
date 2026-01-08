namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Request to validate a password against Umbraco's password requirements.
/// </summary>
public class ValidatePasswordRequestDto
{
    /// <summary>
    /// The password to validate.
    /// </summary>
    public required string Password { get; set; }
}
