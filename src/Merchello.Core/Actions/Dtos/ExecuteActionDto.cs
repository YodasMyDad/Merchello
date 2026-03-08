namespace Merchello.Core.Actions.Dtos;

/// <summary>
/// Request DTO for executing a server-side or download action.
/// </summary>
public record ExecuteActionDto
{
    public required string ActionKey { get; init; }

    public Guid? InvoiceId { get; init; }

    public Guid? OrderId { get; init; }

    public Guid? ProductRootId { get; init; }

    public Guid? ProductId { get; init; }

    public Guid? CustomerId { get; init; }

    public Guid? WarehouseId { get; init; }

    public Guid? SupplierId { get; init; }

    public Dictionary<string, object>? Data { get; init; }
}
