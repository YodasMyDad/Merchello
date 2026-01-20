namespace Merchello.Controllers.Dtos;

/// <summary>
/// DTO for batch mark as paid response
/// </summary>
public record BatchMarkAsPaidResultDto
{
    public int SuccessCount { get; init; }
    public List<string> Messages { get; init; } = [];
    public List<Guid> PaymentIds { get; init; } = [];
}
