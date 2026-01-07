namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Parameters for generating a customer statement.
/// </summary>
public record GenerateStatementParameters
{
    /// <summary>
    /// The customer ID to generate the statement for.
    /// </summary>
    public required Guid CustomerId { get; init; }

    /// <summary>
    /// Start of the statement period. If null, includes all historical transactions.
    /// </summary>
    public DateTime? PeriodStart { get; init; }

    /// <summary>
    /// End of the statement period. If null, defaults to current date.
    /// </summary>
    public DateTime? PeriodEnd { get; init; }

    /// <summary>
    /// Company name to display on the statement header.
    /// </summary>
    public string? CompanyName { get; init; }

    /// <summary>
    /// Company address to display on the statement header.
    /// </summary>
    public string? CompanyAddress { get; init; }
}
