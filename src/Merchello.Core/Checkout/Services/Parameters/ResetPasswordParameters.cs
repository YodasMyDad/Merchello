namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for resetting a member's password.
/// </summary>
public class ResetPasswordParameters
{
    /// <summary>
    /// The member's email address.
    /// </summary>
    public required string Email { get; set; }

    /// <summary>
    /// The password reset token.
    /// </summary>
    public required string Token { get; set; }

    /// <summary>
    /// The new password.
    /// </summary>
    public required string NewPassword { get; set; }
}
