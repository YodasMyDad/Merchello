namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Result of a password reset request.
/// Always returns success to prevent email enumeration attacks.
/// </summary>
public class ForgotPasswordResultDto
{
    /// <summary>
    /// Always true to prevent email enumeration attacks.
    /// </summary>
    public bool Success { get; set; } = true;

    /// <summary>
    /// User-friendly message.
    /// </summary>
    public string Message { get; set; } = "If an account exists with this email, you will receive a password reset link shortly.";
}
