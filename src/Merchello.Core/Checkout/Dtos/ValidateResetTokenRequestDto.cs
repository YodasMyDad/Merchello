namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Request to validate a password reset token.
/// </summary>
public class ValidateResetTokenRequestDto
{
    /// <summary>
    /// Email address of the account.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Reset token to validate.
    /// </summary>
    public string Token { get; set; } = string.Empty;
}
