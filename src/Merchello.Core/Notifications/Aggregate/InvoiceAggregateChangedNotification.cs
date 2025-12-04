using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Aggregate;

/// <summary>
/// Published whenever any entity within the Invoice aggregate is changed.
/// This provides a single hook point for reacting to any change within an invoice,
/// including changes to orders, line items, payments, and shipments.
/// </summary>
/// <remarks>
/// Use this notification when you need to:
/// - Audit all changes to an invoice and its related entities
/// - Synchronize invoice data to external systems
/// - Trigger workflows based on any invoice-related change
/// </remarks>
/// <example>
/// public class AuditLogHandler : INotificationAsyncHandler&lt;InvoiceAggregateChangedNotification&gt;
/// {
///     public async Task HandleAsync(InvoiceAggregateChangedNotification notification, CancellationToken ct)
///     {
///         await auditService.LogAsync(new AuditEntry
///         {
///             EntityType = notification.Source.ToString(),
///             Action = notification.ChangeType.ToString(),
///             InvoiceId = notification.Invoice.Id
///         });
///     }
/// }
/// </example>
public class InvoiceAggregateChangedNotification(
    Accounting.Models.Invoice invoice,
    AggregateChangeType changeType,
    AggregateChangeSource source,
    object? changedEntity = null) : MerchelloNotification
{
    /// <summary>
    /// Gets the invoice that was affected by the change.
    /// </summary>
    public Accounting.Models.Invoice Invoice { get; } = invoice;

    /// <summary>
    /// Gets the type of change that occurred (Created, Updated, or Deleted).
    /// </summary>
    public AggregateChangeType ChangeType { get; } = changeType;

    /// <summary>
    /// Gets the source entity type that triggered this notification.
    /// </summary>
    public AggregateChangeSource Source { get; } = source;

    /// <summary>
    /// Gets the specific entity that was changed.
    /// Cast to the appropriate type based on <see cref="Source"/>:
    /// - Invoice: <see cref="Accounting.Models.Invoice"/>
    /// - Order: <see cref="Accounting.Models.Order"/>
    /// - LineItem: <see cref="Accounting.Models.LineItem"/>
    /// - Payment: <see cref="Accounting.Models.Payment"/>
    /// - Shipment: <see cref="Shipping.Models.Shipment"/>
    /// </summary>
    public object? ChangedEntity { get; } = changedEntity;
}
