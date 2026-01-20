namespace Merchello.Controllers.Dtos;

/// <summary>
/// DTO for batch mark as paid request
/// </summary>
public record BatchMarkAsPaidDto
{
    public List<Guid> InvoiceIds { get; init; } = [];
    public string PaymentMethod { get; init; } = string.Empty;
    public string? Reference { get; init; }
    public DateTime? DateReceived { get; init; }
}
