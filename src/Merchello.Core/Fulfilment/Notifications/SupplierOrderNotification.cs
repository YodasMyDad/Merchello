using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Fulfilment.Notifications;

/// <summary>
/// Notification published when an order is ready to be sent to a supplier.
/// Handled by EmailNotificationHandler to queue the supplier order email.
/// </summary>
public class SupplierOrderNotification : MerchelloNotification
{
    /// <summary>
    /// Initializes a new instance of the <see cref="SupplierOrderNotification"/> class.
    /// </summary>
    /// <param name="order">The fulfilment order request containing order details.</param>
    /// <param name="supplierName">The name of the supplier receiving the order.</param>
    /// <param name="supplierEmail">The email address of the supplier.</param>
    /// <param name="emailSubject">The resolved email subject line.</param>
    public SupplierOrderNotification(
        FulfilmentOrderRequest order,
        string supplierName,
        string supplierEmail,
        string emailSubject)
    {
        Order = order;
        SupplierName = supplierName;
        SupplierEmail = supplierEmail;
        EmailSubject = emailSubject;
    }

    /// <summary>
    /// Gets the fulfilment order request containing all order details.
    /// </summary>
    public FulfilmentOrderRequest Order { get; }

    /// <summary>
    /// Gets the name of the supplier receiving the order.
    /// </summary>
    public string SupplierName { get; }

    /// <summary>
    /// Gets the email address of the supplier.
    /// </summary>
    public string SupplierEmail { get; }

    /// <summary>
    /// Gets the resolved email subject line.
    /// </summary>
    public string EmailSubject { get; }

    /// <summary>
    /// Gets the order ID.
    /// </summary>
    public Guid OrderId => Order.OrderId;

    /// <summary>
    /// Gets the order number.
    /// </summary>
    public string OrderNumber => Order.OrderNumber;

    /// <summary>
    /// Gets the line items in the order.
    /// </summary>
    public IReadOnlyList<FulfilmentLineItem> LineItems => Order.LineItems;

    /// <summary>
    /// Gets the shipping address.
    /// </summary>
    public FulfilmentAddress ShippingAddress => Order.ShippingAddress;

    /// <summary>
    /// Gets the customer email (if available).
    /// </summary>
    public string? CustomerEmail => Order.CustomerEmail;
}
