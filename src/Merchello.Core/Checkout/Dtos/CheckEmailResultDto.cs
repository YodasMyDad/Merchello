namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Result of checking if an email has an existing member account.
/// </summary>
public class CheckEmailResultDto
{
    /// <summary>
    /// Whether a member account exists with this email.
    /// </summary>
    public bool HasExistingAccount { get; set; }
}
