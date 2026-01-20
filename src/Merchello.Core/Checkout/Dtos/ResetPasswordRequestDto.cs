namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Request to complete a password reset.
/// </summary>
public class ResetPasswordRequestDto
{
    /// <summary>
    /// Email address of the account.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Reset token from the email link.
    /// </summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// The new password.
    /// </summary>
    public string NewPassword { get; set; } = string.Empty;
}
