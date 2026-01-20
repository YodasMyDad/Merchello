namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Result of a password reset attempt.
/// </summary>
public class ResetPasswordResultDto
{
    /// <summary>
    /// Whether the password was reset successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if the reset failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Password validation errors if the new password doesn't meet requirements.
    /// </summary>
    public List<string> ValidationErrors { get; set; } = [];
}
