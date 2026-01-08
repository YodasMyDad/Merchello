namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for creating an Umbraco member during checkout.
/// </summary>
public class CreateCheckoutMemberParameters
{
    /// <summary>
    /// The member's email address (also used as username).
    /// </summary>
    public required string Email { get; init; }

    /// <summary>
    /// The member's password.
    /// </summary>
    public required string Password { get; init; }

    /// <summary>
    /// The member's display name.
    /// </summary>
    public required string Name { get; init; }
}
