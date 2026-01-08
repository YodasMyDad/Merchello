namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Request to check if an email has an existing member account.
/// </summary>
public class CheckEmailRequestDto
{
    /// <summary>
    /// The email address to check.
    /// </summary>
    public required string Email { get; set; }
}
