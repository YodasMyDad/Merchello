using Merchello.Core.DigitalProducts.Notifications;
using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Fulfilment.Notifications;
using Merchello.Core.Notifications.CheckoutNotifications;
using Merchello.Core.Notifications.CustomerNotifications;
using Merchello.Core.Notifications.Inventory;
using Merchello.Core.Notifications.Invoice;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Notifications.Shipment;

namespace Merchello.Core.Email.Services;

/// <summary>
/// Registry of email topics that map to internal notifications.
/// These are the topics that can trigger automated emails.
/// </summary>
public class EmailTopicRegistry : IEmailTopicRegistry
{
    private readonly Dictionary<string, EmailTopic> _topics;

    public EmailTopicRegistry()
    {
        _topics = new Dictionary<string, EmailTopic>
        {
            // Orders
            [Constants.EmailTopics.OrderCreated] = new EmailTopic
            {
                Topic = Constants.EmailTopics.OrderCreated,
                DisplayName = "Order Created",
                Description = "Triggered when a new order is placed. Use for order confirmation emails.",
                Category = "Orders",
                NotificationType = typeof(OrderCreatedNotification)
            },
            [Constants.EmailTopics.OrderStatusChanged] = new EmailTopic
            {
                Topic = Constants.EmailTopics.OrderStatusChanged,
                DisplayName = "Order Status Changed",
                Description = "Triggered when an order's status changes. Use for status update emails.",
                Category = "Orders",
                NotificationType = typeof(OrderStatusChangedNotification)
            },
            [Constants.EmailTopics.OrderCancelled] = new EmailTopic
            {
                Topic = Constants.EmailTopics.OrderCancelled,
                DisplayName = "Order Cancelled",
                Description = "Triggered when an invoice is cancelled. Use for cancellation notice emails.",
                Category = "Orders",
                NotificationType = typeof(InvoiceCancelledNotification)
            },

            // Invoices
            [Constants.EmailTopics.InvoiceCreated] = new EmailTopic
            {
                Topic = Constants.EmailTopics.InvoiceCreated,
                DisplayName = "Invoice Created",
                Description = "Triggered when a new invoice is created. Use for invoice notification emails.",
                Category = "Invoices",
                NotificationType = typeof(InvoiceSavedNotification)
            },
            [Constants.EmailTopics.InvoicePaid] = new EmailTopic
            {
                Topic = Constants.EmailTopics.InvoicePaid,
                DisplayName = "Invoice Paid",
                Description = "Triggered when an invoice is paid. Use for payment confirmation emails.",
                Category = "Invoices",
                NotificationType = typeof(PaymentCreatedNotification)
            },
            [Constants.EmailTopics.InvoiceRefunded] = new EmailTopic
            {
                Topic = Constants.EmailTopics.InvoiceRefunded,
                DisplayName = "Invoice Refunded",
                Description = "Triggered when a refund is processed. Use for refund notification emails.",
                Category = "Invoices",
                NotificationType = typeof(PaymentRefundedNotification)
            },
            [Constants.EmailTopics.InvoiceDeleted] = new EmailTopic
            {
                Topic = Constants.EmailTopics.InvoiceDeleted,
                DisplayName = "Invoice Deleted",
                Description = "Triggered when an invoice is deleted. Use for admin notification emails.",
                Category = "Invoices",
                NotificationType = typeof(InvoiceDeletedNotification)
            },
            [Constants.EmailTopics.InvoiceReminder] = new EmailTopic
            {
                Topic = Constants.EmailTopics.InvoiceReminder,
                DisplayName = "Payment Due Reminder",
                Description = "Triggered when an invoice payment is due soon. Use for payment reminder emails.",
                Category = "Invoices",
                NotificationType = typeof(InvoiceReminderNotification)
            },
            [Constants.EmailTopics.InvoiceOverdue] = new EmailTopic
            {
                Topic = Constants.EmailTopics.InvoiceOverdue,
                DisplayName = "Payment Overdue",
                Description = "Triggered when an invoice payment is past due. Use for overdue reminder emails.",
                Category = "Invoices",
                NotificationType = typeof(InvoiceOverdueNotification)
            },

            // Payments
            [Constants.EmailTopics.PaymentCreated] = new EmailTopic
            {
                Topic = Constants.EmailTopics.PaymentCreated,
                DisplayName = "Payment Received",
                Description = "Triggered when a payment is received. Use for payment receipt emails.",
                Category = "Payments",
                NotificationType = typeof(PaymentCreatedNotification)
            },
            [Constants.EmailTopics.PaymentRefunded] = new EmailTopic
            {
                Topic = Constants.EmailTopics.PaymentRefunded,
                DisplayName = "Payment Refunded",
                Description = "Triggered when a refund is processed. Use for refund confirmation emails.",
                Category = "Payments",
                NotificationType = typeof(PaymentRefundedNotification)
            },

            // Shipping
            [Constants.EmailTopics.ShipmentCreated] = new EmailTopic
            {
                Topic = Constants.EmailTopics.ShipmentCreated,
                DisplayName = "Shipment Created",
                Description = "Triggered when a shipment is created. Use for shipping confirmation emails.",
                Category = "Shipping",
                NotificationType = typeof(ShipmentCreatedNotification)
            },
            [Constants.EmailTopics.ShipmentUpdated] = new EmailTopic
            {
                Topic = Constants.EmailTopics.ShipmentUpdated,
                DisplayName = "Shipment Updated",
                Description = "Triggered when a shipment is updated. Use for tracking update emails.",
                Category = "Shipping",
                NotificationType = typeof(ShipmentSavedNotification)
            },
            [Constants.EmailTopics.ShipmentPreparing] = new EmailTopic
            {
                Topic = Constants.EmailTopics.ShipmentPreparing,
                DisplayName = "Shipment Preparing",
                Description = "Triggered when a shipment is created and being prepared. Use for 'preparing your order' emails.",
                Category = "Shipping",
                NotificationType = typeof(ShipmentCreatedNotification)
            },
            [Constants.EmailTopics.ShipmentShipped] = new EmailTopic
            {
                Topic = Constants.EmailTopics.ShipmentShipped,
                DisplayName = "Shipment Shipped",
                Description = "Triggered when a shipment is marked as shipped. Use for shipping notification emails with tracking info.",
                Category = "Shipping",
                NotificationType = typeof(ShipmentStatusChangedNotification)
            },
            [Constants.EmailTopics.ShipmentDelivered] = new EmailTopic
            {
                Topic = Constants.EmailTopics.ShipmentDelivered,
                DisplayName = "Shipment Delivered",
                Description = "Triggered when a shipment is marked as delivered. Use for delivery confirmation emails.",
                Category = "Shipping",
                NotificationType = typeof(ShipmentStatusChangedNotification)
            },
            [Constants.EmailTopics.ShipmentCancelled] = new EmailTopic
            {
                Topic = Constants.EmailTopics.ShipmentCancelled,
                DisplayName = "Shipment Cancelled",
                Description = "Triggered when a shipment is cancelled. Use for cancellation notification emails.",
                Category = "Shipping",
                NotificationType = typeof(ShipmentStatusChangedNotification)
            },

            // Customers
            [Constants.EmailTopics.CustomerCreated] = new EmailTopic
            {
                Topic = Constants.EmailTopics.CustomerCreated,
                DisplayName = "Customer Created",
                Description = "Triggered when a new customer account is created. Use for welcome emails.",
                Category = "Customers",
                NotificationType = typeof(CustomerCreatedNotification)
            },
            [Constants.EmailTopics.CustomerUpdated] = new EmailTopic
            {
                Topic = Constants.EmailTopics.CustomerUpdated,
                DisplayName = "Customer Updated",
                Description = "Triggered when a customer's account is updated. Use for account update confirmation.",
                Category = "Customers",
                NotificationType = typeof(CustomerSavedNotification)
            },
            [Constants.EmailTopics.CustomerPasswordReset] = new EmailTopic
            {
                Topic = Constants.EmailTopics.CustomerPasswordReset,
                DisplayName = "Password Reset Requested",
                Description = "Triggered when a customer requests a password reset. Use for password reset emails.",
                Category = "Customers",
                NotificationType = typeof(CustomerPasswordResetRequestedNotification)
            },

            // Inventory (typically admin-only emails)
            [Constants.EmailTopics.InventoryLowStock] = new EmailTopic
            {
                Topic = Constants.EmailTopics.InventoryLowStock,
                DisplayName = "Low Stock Alert",
                Description = "Triggered when product stock falls below threshold. Use for admin alerts.",
                Category = "Inventory",
                NotificationType = typeof(LowStockNotification)
            },

            // Checkout - Legacy (generic abandoned notification)
            [Constants.EmailTopics.CheckoutAbandoned] = new EmailTopic
            {
                Topic = Constants.EmailTopics.CheckoutAbandoned,
                DisplayName = "Checkout Abandoned (Generic)",
                Description = "Generic abandoned checkout notification. For 3-email sequences, use the specific first/reminder/final topics instead.",
                Category = "Checkout",
                NotificationType = typeof(CheckoutAbandonedNotification)
            },

            // Checkout - 3-email recovery sequence
            [Constants.EmailTopics.CheckoutAbandonedFirst] = new EmailTopic
            {
                Topic = Constants.EmailTopics.CheckoutAbandonedFirst,
                DisplayName = "Cart Recovery - First Email",
                Description = "First email in the abandoned cart recovery sequence. Sent shortly after abandonment is detected.",
                Category = "Checkout",
                NotificationType = typeof(CheckoutAbandonedFirstNotification)
            },
            [Constants.EmailTopics.CheckoutAbandonedReminder] = new EmailTopic
            {
                Topic = Constants.EmailTopics.CheckoutAbandonedReminder,
                DisplayName = "Cart Recovery - Reminder",
                Description = "Second email in the abandoned cart recovery sequence. Sent 24 hours after the first email (configurable).",
                Category = "Checkout",
                NotificationType = typeof(CheckoutAbandonedReminderNotification)
            },
            [Constants.EmailTopics.CheckoutAbandonedFinal] = new EmailTopic
            {
                Topic = Constants.EmailTopics.CheckoutAbandonedFinal,
                DisplayName = "Cart Recovery - Final Notice",
                Description = "Final email in the abandoned cart recovery sequence. Sent 48 hours after the reminder (configurable).",
                Category = "Checkout",
                NotificationType = typeof(CheckoutAbandonedFinalNotification)
            },

            // Checkout - Recovery outcomes
            [Constants.EmailTopics.CheckoutRecovered] = new EmailTopic
            {
                Topic = Constants.EmailTopics.CheckoutRecovered,
                DisplayName = "Checkout Recovered",
                Description = "Triggered when a customer returns via recovery link. Use for internal analytics.",
                Category = "Checkout",
                NotificationType = typeof(CheckoutRecoveredNotification)
            },
            [Constants.EmailTopics.CheckoutConverted] = new EmailTopic
            {
                Topic = Constants.EmailTopics.CheckoutConverted,
                DisplayName = "Recovery Converted",
                Description = "Triggered when a recovered checkout is converted to an order. Use for success tracking.",
                Category = "Checkout",
                NotificationType = typeof(CheckoutRecoveryConvertedNotification)
            },

            // Digital Products
            [Constants.EmailTopics.DigitalProductDelivered] = new EmailTopic
            {
                Topic = Constants.EmailTopics.DigitalProductDelivered,
                DisplayName = "Digital Product Delivered",
                Description = "Triggered when download links are ready for digital products. Use for delivery emails with download links.",
                Category = "Digital Products",
                NotificationType = typeof(DigitalProductDeliveredNotification)
            },

            // Fulfilment
            [Constants.EmailTopics.FulfilmentSupplierOrder] = new EmailTopic
            {
                Topic = Constants.EmailTopics.FulfilmentSupplierOrder,
                DisplayName = "Supplier Order",
                Description = "Triggered when an order is ready to be sent to a supplier. Use for supplier notification emails with order details.",
                Category = "Fulfilment",
                NotificationType = typeof(SupplierOrderNotification)
            }
        };
    }

    public IReadOnlyList<EmailTopic> GetAllTopics() => _topics.Values.ToList();

    public EmailTopic? GetTopic(string topic) =>
        _topics.TryGetValue(topic, out var emailTopic) ? emailTopic : null;

    public Type? GetNotificationType(string topic) =>
        _topics.TryGetValue(topic, out var emailTopic) ? emailTopic.NotificationType : null;

    public bool TopicExists(string topic) => _topics.ContainsKey(topic);

    public IEnumerable<IGrouping<string, EmailTopic>> GetTopicsByCategory() =>
        _topics.Values.GroupBy(t => t.Category);
}
