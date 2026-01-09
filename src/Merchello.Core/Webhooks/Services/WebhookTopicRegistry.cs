using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Services.Interfaces;

namespace Merchello.Core.Webhooks.Services;

/// <summary>
/// Registry of available webhook topics that map to internal notifications.
/// </summary>
public class WebhookTopicRegistry : IWebhookTopicRegistry
{
    private static readonly Dictionary<string, WebhookTopic> _topics = new()
    {
        // Orders
        [Constants.WebhookTopics.OrderCreated] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.OrderCreated,
            DisplayName = "Order Created",
            Description = "Triggered when a new order is placed",
            Category = "Orders",
            SamplePayload = """{"id":"...","invoiceNumber":"INV-0001","status":"Pending","total":99.99}"""
        },
        [Constants.WebhookTopics.OrderUpdated] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.OrderUpdated,
            DisplayName = "Order Updated",
            Description = "Triggered when an order is modified",
            Category = "Orders"
        },
        [Constants.WebhookTopics.OrderStatusChanged] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.OrderStatusChanged,
            DisplayName = "Order Status Changed",
            Description = "Triggered when an order's status changes",
            Category = "Orders",
            SamplePayload = """{"order":{},"previousStatus":"Pending","newStatus":"ReadyToFulfill"}"""
        },
        [Constants.WebhookTopics.OrderCancelled] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.OrderCancelled,
            DisplayName = "Order Cancelled",
            Description = "Triggered when an order is cancelled",
            Category = "Orders"
        },

        // Invoices
        [Constants.WebhookTopics.InvoiceCreated] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.InvoiceCreated,
            DisplayName = "Invoice Created",
            Description = "Triggered when an invoice is created",
            Category = "Invoices"
        },
        [Constants.WebhookTopics.InvoicePaid] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.InvoicePaid,
            DisplayName = "Invoice Paid",
            Description = "Triggered when an invoice is fully paid",
            Category = "Invoices"
        },
        [Constants.WebhookTopics.InvoiceRefunded] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.InvoiceRefunded,
            DisplayName = "Invoice Refunded",
            Description = "Triggered when a refund is processed",
            Category = "Invoices"
        },
        [Constants.WebhookTopics.InvoiceDeleted] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.InvoiceDeleted,
            DisplayName = "Invoice Deleted",
            Description = "Triggered when an invoice is deleted",
            Category = "Invoices"
        },

        // Products
        [Constants.WebhookTopics.ProductCreated] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.ProductCreated,
            DisplayName = "Product Created",
            Description = "Triggered when a new product is created",
            Category = "Products"
        },
        [Constants.WebhookTopics.ProductUpdated] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.ProductUpdated,
            DisplayName = "Product Updated",
            Description = "Triggered when a product is modified",
            Category = "Products"
        },
        [Constants.WebhookTopics.ProductDeleted] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.ProductDeleted,
            DisplayName = "Product Deleted",
            Description = "Triggered when a product is deleted",
            Category = "Products"
        },

        // Inventory
        [Constants.WebhookTopics.InventoryAdjusted] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.InventoryAdjusted,
            DisplayName = "Inventory Adjusted",
            Description = "Triggered when stock levels are adjusted",
            Category = "Inventory"
        },
        [Constants.WebhookTopics.InventoryLowStock] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.InventoryLowStock,
            DisplayName = "Low Stock Alert",
            Description = "Triggered when stock falls below threshold",
            Category = "Inventory"
        },
        [Constants.WebhookTopics.InventoryReserved] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.InventoryReserved,
            DisplayName = "Stock Reserved",
            Description = "Triggered when stock is reserved for an order",
            Category = "Inventory"
        },
        [Constants.WebhookTopics.InventoryAllocated] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.InventoryAllocated,
            DisplayName = "Stock Allocated",
            Description = "Triggered when stock is allocated for shipment",
            Category = "Inventory"
        },

        // Customers
        [Constants.WebhookTopics.CustomerCreated] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.CustomerCreated,
            DisplayName = "Customer Created",
            Description = "Triggered when a new customer is created",
            Category = "Customers"
        },
        [Constants.WebhookTopics.CustomerUpdated] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.CustomerUpdated,
            DisplayName = "Customer Updated",
            Description = "Triggered when a customer is modified",
            Category = "Customers"
        },
        [Constants.WebhookTopics.CustomerDeleted] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.CustomerDeleted,
            DisplayName = "Customer Deleted",
            Description = "Triggered when a customer is deleted",
            Category = "Customers"
        },

        // Shipments
        [Constants.WebhookTopics.ShipmentCreated] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.ShipmentCreated,
            DisplayName = "Shipment Created",
            Description = "Triggered when a shipment is created",
            Category = "Shipments"
        },
        [Constants.WebhookTopics.ShipmentUpdated] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.ShipmentUpdated,
            DisplayName = "Shipment Updated",
            Description = "Triggered when a shipment is modified",
            Category = "Shipments"
        },

        // Discounts
        [Constants.WebhookTopics.DiscountCreated] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.DiscountCreated,
            DisplayName = "Discount Created",
            Description = "Triggered when a discount is created",
            Category = "Discounts"
        },
        [Constants.WebhookTopics.DiscountUpdated] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.DiscountUpdated,
            DisplayName = "Discount Updated",
            Description = "Triggered when a discount is modified",
            Category = "Discounts"
        },
        [Constants.WebhookTopics.DiscountDeleted] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.DiscountDeleted,
            DisplayName = "Discount Deleted",
            Description = "Triggered when a discount is deleted",
            Category = "Discounts"
        },

        // Checkout
        [Constants.WebhookTopics.CheckoutAbandoned] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.CheckoutAbandoned,
            DisplayName = "Checkout Abandoned",
            Description = "Triggered when a checkout session is abandoned",
            Category = "Checkout"
        },
        [Constants.WebhookTopics.CheckoutAbandonedFirst] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.CheckoutAbandonedFirst,
            DisplayName = "Cart Recovery - First Email",
            Description = "Triggered when the first recovery email is due for an abandoned cart",
            Category = "Checkout"
        },
        [Constants.WebhookTopics.CheckoutAbandonedReminder] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.CheckoutAbandonedReminder,
            DisplayName = "Cart Recovery - Reminder",
            Description = "Triggered when the reminder email is due for an abandoned cart",
            Category = "Checkout"
        },
        [Constants.WebhookTopics.CheckoutAbandonedFinal] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.CheckoutAbandonedFinal,
            DisplayName = "Cart Recovery - Final Notice",
            Description = "Triggered when the final recovery email is due for an abandoned cart",
            Category = "Checkout"
        },
        [Constants.WebhookTopics.CheckoutRecovered] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.CheckoutRecovered,
            DisplayName = "Checkout Recovered",
            Description = "Triggered when an abandoned checkout is recovered",
            Category = "Checkout"
        },
        [Constants.WebhookTopics.CheckoutConverted] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.CheckoutConverted,
            DisplayName = "Recovery Converted",
            Description = "Triggered when a recovered checkout is converted to an order",
            Category = "Checkout"
        },

        // Baskets
        [Constants.WebhookTopics.BasketCreated] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.BasketCreated,
            DisplayName = "Basket Created",
            Description = "Triggered when a new basket is created",
            Category = "Baskets"
        },
        [Constants.WebhookTopics.BasketUpdated] = new WebhookTopic
        {
            Key = Constants.WebhookTopics.BasketUpdated,
            DisplayName = "Basket Updated",
            Description = "Triggered when a basket is modified",
            Category = "Baskets"
        }
    };

    public IEnumerable<WebhookTopic> GetAllTopics() => _topics.Values;

    public WebhookTopic? GetTopic(string key) =>
        _topics.TryGetValue(key, out var topic) ? topic : null;

    public bool TopicExists(string key) => _topics.ContainsKey(key);
}
