namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Result of a sign-in attempt during checkout.
/// </summary>
public class SignInResultDto
{
    /// <summary>
    /// Whether the sign-in was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Number of failed login attempts in the current session.
    /// </summary>
    public int FailedAttempts { get; set; }

    /// <summary>
    /// Whether to show the forgot password link (after multiple failures).
    /// </summary>
    public bool ShowForgotPassword { get; set; }

    /// <summary>
    /// Error message if sign-in failed.
    /// </summary>
    public string? ErrorMessage { get; set; }
}
