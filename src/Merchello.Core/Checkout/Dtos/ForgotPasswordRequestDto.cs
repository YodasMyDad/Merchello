namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Request to initiate a password reset.
/// </summary>
public class ForgotPasswordRequestDto
{
    /// <summary>
    /// Email address of the account to reset.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Base URL for the reset link (e.g., "https://shop.example.com/checkout").
    /// If not provided, uses MerchelloSettings.WebsiteUrl + "/checkout/reset-password".
    /// </summary>
    public string? ResetBaseUrl { get; set; }
}
