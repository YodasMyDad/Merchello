namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Result of checking a customer's credit limit status during checkout.
/// </summary>
public class CreditCheckResultDto
{
    /// <summary>
    /// Whether the customer has a credit limit configured.
    /// </summary>
    public bool HasCreditLimit { get; set; }

    /// <summary>
    /// Whether the customer's outstanding balance exceeds their credit limit.
    /// </summary>
    public bool CreditLimitExceeded { get; set; }
}
