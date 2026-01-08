namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Request to sign in with an existing member account during checkout.
/// </summary>
public class SignInRequestDto
{
    /// <summary>
    /// The member's email address.
    /// </summary>
    public required string Email { get; set; }

    /// <summary>
    /// The member's password.
    /// </summary>
    public required string Password { get; set; }
}
