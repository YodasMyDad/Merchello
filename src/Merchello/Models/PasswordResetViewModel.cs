namespace Merchello.Models;

/// <summary>
/// View model for the password reset page.
/// </summary>
public class PasswordResetViewModel
{
    /// <summary>
    /// Email address from the reset link.
    /// </summary>
    public string Email { get; set; } = "";

    /// <summary>
    /// Reset token from the reset link.
    /// </summary>
    public string Token { get; set; } = "";

    /// <summary>
    /// Whether the token is valid.
    /// </summary>
    public bool TokenValid { get; set; }

    /// <summary>
    /// Error message if the token is invalid or expired.
    /// </summary>
    public string? ErrorMessage { get; set; }
}
