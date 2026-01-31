using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Returns.Models;

public class ReturnLineItem
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid ReturnId { get; set; }
    public virtual Return? Return { get; set; }

    public Guid OriginalLineItemId { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? WarehouseId { get; set; }

    public string? Sku { get; set; }
    public string? Name { get; set; }
    public int QuantityRequested { get; set; }
    public int QuantityReceived { get; set; }
    public int QuantityRestocked { get; set; }

    public decimal UnitPrice { get; set; }
    public decimal RefundAmount { get; set; }

    public Guid ReturnReasonId { get; set; }
    public virtual ReturnReason? ReturnReason { get; set; }
    public string? CustomerComments { get; set; }

    public ReturnLineItemCondition Condition { get; set; } = ReturnLineItemCondition.Unknown;
    public bool ShouldRestock { get; set; } = true;

    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
}
