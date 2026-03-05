namespace Merchello.Core.Actions.Models;

/// <summary>
/// Context passed to action execution containing the relevant entity IDs.
/// </summary>
public record ActionContext
{
    public ActionCategory Category { get; init; }

    public Guid? InvoiceId { get; init; }

    public Guid? OrderId { get; init; }

    public Guid? ProductRootId { get; init; }

    public Guid? ProductId { get; init; }

    /// <summary>
    /// Optional free-form data from the frontend.
    /// </summary>
    public Dictionary<string, object>? Data { get; init; }
}
