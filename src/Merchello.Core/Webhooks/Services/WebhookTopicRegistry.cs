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
        ["order.created"] = new WebhookTopic
        {
            Key = "order.created",
            DisplayName = "Order Created",
            Description = "Triggered when a new order is placed",
            Category = "Orders",
            SamplePayload = """{"id":"...","invoiceNumber":"INV-0001","status":"Pending","total":99.99}"""
        },
        ["order.updated"] = new WebhookTopic
        {
            Key = "order.updated",
            DisplayName = "Order Updated",
            Description = "Triggered when an order is modified",
            Category = "Orders"
        },
        ["order.status_changed"] = new WebhookTopic
        {
            Key = "order.status_changed",
            DisplayName = "Order Status Changed",
            Description = "Triggered when an order's status changes",
            Category = "Orders",
            SamplePayload = """{"order":{},"previousStatus":"Pending","newStatus":"ReadyToFulfill"}"""
        },
        ["order.cancelled"] = new WebhookTopic
        {
            Key = "order.cancelled",
            DisplayName = "Order Cancelled",
            Description = "Triggered when an order is cancelled",
            Category = "Orders"
        },

        // Invoices
        ["invoice.created"] = new WebhookTopic
        {
            Key = "invoice.created",
            DisplayName = "Invoice Created",
            Description = "Triggered when an invoice is created",
            Category = "Invoices"
        },
        ["invoice.paid"] = new WebhookTopic
        {
            Key = "invoice.paid",
            DisplayName = "Invoice Paid",
            Description = "Triggered when an invoice is fully paid",
            Category = "Invoices"
        },
        ["invoice.refunded"] = new WebhookTopic
        {
            Key = "invoice.refunded",
            DisplayName = "Invoice Refunded",
            Description = "Triggered when a refund is processed",
            Category = "Invoices"
        },

        // Products
        ["product.created"] = new WebhookTopic
        {
            Key = "product.created",
            DisplayName = "Product Created",
            Description = "Triggered when a new product is created",
            Category = "Products"
        },
        ["product.updated"] = new WebhookTopic
        {
            Key = "product.updated",
            DisplayName = "Product Updated",
            Description = "Triggered when a product is modified",
            Category = "Products"
        },
        ["product.deleted"] = new WebhookTopic
        {
            Key = "product.deleted",
            DisplayName = "Product Deleted",
            Description = "Triggered when a product is deleted",
            Category = "Products"
        },

        // Inventory
        ["inventory.adjusted"] = new WebhookTopic
        {
            Key = "inventory.adjusted",
            DisplayName = "Inventory Adjusted",
            Description = "Triggered when stock levels are adjusted",
            Category = "Inventory"
        },
        ["inventory.low_stock"] = new WebhookTopic
        {
            Key = "inventory.low_stock",
            DisplayName = "Low Stock Alert",
            Description = "Triggered when stock falls below threshold",
            Category = "Inventory"
        },
        ["inventory.reserved"] = new WebhookTopic
        {
            Key = "inventory.reserved",
            DisplayName = "Stock Reserved",
            Description = "Triggered when stock is reserved for an order",
            Category = "Inventory"
        },
        ["inventory.allocated"] = new WebhookTopic
        {
            Key = "inventory.allocated",
            DisplayName = "Stock Allocated",
            Description = "Triggered when stock is allocated for shipment",
            Category = "Inventory"
        },

        // Customers
        ["customer.created"] = new WebhookTopic
        {
            Key = "customer.created",
            DisplayName = "Customer Created",
            Description = "Triggered when a new customer is created",
            Category = "Customers"
        },
        ["customer.updated"] = new WebhookTopic
        {
            Key = "customer.updated",
            DisplayName = "Customer Updated",
            Description = "Triggered when a customer is modified",
            Category = "Customers"
        },
        ["customer.deleted"] = new WebhookTopic
        {
            Key = "customer.deleted",
            DisplayName = "Customer Deleted",
            Description = "Triggered when a customer is deleted",
            Category = "Customers"
        },

        // Shipments
        ["shipment.created"] = new WebhookTopic
        {
            Key = "shipment.created",
            DisplayName = "Shipment Created",
            Description = "Triggered when a shipment is created",
            Category = "Shipments"
        },
        ["shipment.updated"] = new WebhookTopic
        {
            Key = "shipment.updated",
            DisplayName = "Shipment Updated",
            Description = "Triggered when a shipment is modified",
            Category = "Shipments"
        },

        // Discounts
        ["discount.created"] = new WebhookTopic
        {
            Key = "discount.created",
            DisplayName = "Discount Created",
            Description = "Triggered when a discount is created",
            Category = "Discounts"
        },
        ["discount.updated"] = new WebhookTopic
        {
            Key = "discount.updated",
            DisplayName = "Discount Updated",
            Description = "Triggered when a discount is modified",
            Category = "Discounts"
        },
        ["discount.deleted"] = new WebhookTopic
        {
            Key = "discount.deleted",
            DisplayName = "Discount Deleted",
            Description = "Triggered when a discount is deleted",
            Category = "Discounts"
        },

        // Checkout
        ["checkout.abandoned"] = new WebhookTopic
        {
            Key = "checkout.abandoned",
            DisplayName = "Checkout Abandoned",
            Description = "Triggered when a checkout session is abandoned",
            Category = "Checkout"
        },
        ["checkout.recovered"] = new WebhookTopic
        {
            Key = "checkout.recovered",
            DisplayName = "Checkout Recovered",
            Description = "Triggered when an abandoned checkout is recovered",
            Category = "Checkout"
        },

        // Baskets
        ["basket.created"] = new WebhookTopic
        {
            Key = "basket.created",
            DisplayName = "Basket Created",
            Description = "Triggered when a new basket is created",
            Category = "Baskets"
        },
        ["basket.updated"] = new WebhookTopic
        {
            Key = "basket.updated",
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
