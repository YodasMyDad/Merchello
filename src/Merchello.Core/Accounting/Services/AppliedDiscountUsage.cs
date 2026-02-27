namespace Merchello.Core.Accounting.Services;

internal sealed record AppliedDiscountUsage(
    Guid DiscountId,
    decimal Amount,
    int? TotalUsageLimit,
    int? PerCustomerUsageLimit,
    string? Code);
