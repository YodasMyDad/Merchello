namespace Merchello.Core;

public static class Constants
{
    public const string DefaultPagingVariable = "p";
    public const string ApiName = "merchello";
    public const string FallbackCountryCode = "US";

    public static class Cookies
    {
        public const string BasketId = "MerchBasketId";
        public const string ShippingCountry = "Merchello.ShippingCountry";
        public const string ShippingRegion = "Merchello.ShippingRegion";
        public const string Currency = "Merchello.Currency";
        public const string ConfirmationToken = "Merchello.ConfirmationToken";
    }

    public static class ExtendedDataKeys
    {
        public const string DiscountValueType = "DiscountValueType";
        public const string DiscountValue = "DiscountValue";
        public const string Reason = "Reason";
        public const string VisibleToCustomer = "VisibleToCustomer";
        public const string IsPhysicalProduct = "IsPhysicalProduct";

        // Promotional discount keys
        public const string DiscountId = "DiscountId";
        public const string DiscountCode = "DiscountCode";
        public const string DiscountName = "DiscountName";
        public const string DiscountCategory = "DiscountCategory";
        public const string ApplyAfterTax = "ApplyAfterTax";

        // Product metadata for discount matching
        public const string ProductRootId = "ProductRootId";
        public const string ProductTypeId = "ProductTypeId";
        public const string SupplierId = "SupplierId";
        public const string WarehouseId = "WarehouseId";
        public const string CollectionIds = "CollectionIds";
        public const string FilterIds = "FilterIds";

        // Product options and add-ons
        public const string OptionId = "OptionId";
        public const string OptionValueId = "OptionValueId";
        public const string CostAdjustment = "CostAdjustment";
        public const string IsAddon = "IsAddon";
        public const string ParentLineItemId = "ParentLineItemId";
        public const string AddonSelectionSignature = "AddonSelectionSignature";
        public const string ImageUrl = "ImageUrl";

        // Product display name data
        public const string ProductRootName = "ProductRootName";
        public const string VariantName = "VariantName";
        public const string SelectedOptions = "SelectedOptions";

        // Tax
        public const string TaxGroupId = "TaxGroupId";
        public const string TaxGroupName = "TaxGroupName";
        public const string EffectiveShippingTaxRate = "EffectiveShippingTaxRate";
        public const string TaxProviderAlias = "TaxProviderAlias";
        public const string TaxProviderTransactionId = "TaxProviderTransactionId";
        public const string TaxIsEstimated = "TaxIsEstimated";
        public const string TaxEstimationReason = "TaxEstimationReason";

        // Physical dimensions
        public const string WeightKg = "WeightKg";
        public const string LengthCm = "LengthCm";
        public const string WidthCm = "WidthCm";
        public const string HeightCm = "HeightCm";

        // Currency conversion audit trail
        public const string OriginalCurrency = "OriginalCurrency";
        public const string OriginalAmount = "OriginalAmount";

        // Upsells
        public const string UpsellImpressions = "MerchelloUpsellImpressions";  // JSON array of upsell impression records
        public const string AutoAddedByUpsellRule = "MerchelloAutoAddedByUpsellRule";  // Upsell rule ID that auto-added this line item

        // Digital products
        public const string DigitalDeliveryMethod = "DigitalDeliveryMethod";    // "InstantDownload" or "EmailDelivered"
        public const string DigitalFileIds = "DigitalFileIds";                  // JSON array of Umbraco Media IDs
        public const string DownloadLinkExpiryDays = "DownloadLinkExpiryDays";  // int as string, 0 = unlimited
        public const string MaxDownloadsPerLink = "MaxDownloadsPerLink";        // int as string, 0 = unlimited
    }

    /// <summary>
    /// Keys used in InvoiceSource.Metadata for UCP-specific data.
    /// </summary>
    public static class UcpMetadataKeys
    {
        /// <summary>
        /// Webhook URL for order lifecycle updates, extracted from agent profile.
        /// </summary>
        public const string WebhookUrl = "WebhookUrl";

        /// <summary>
        /// Agent's display name from profile.
        /// </summary>
        public const string AgentName = "AgentName";

        /// <summary>
        /// Capabilities supported by the agent.
        /// </summary>
        public const string AgentCapabilities = "AgentCapabilities";
    }

    public static class CacheKeys
    {
        public const string ExchangeRatesPrefix = "merchello:exchange-rates:";
        public const string ShippingQuotePrefix = "shipping-quote:";
        public const string LocalityPrefix = "merchello:locality:";
        public const string LocalityRegionsPrefix = "merchello:locality:regions:";
        public const string TaxRatePrefix = "merchello:tax-rate:";
        public const string GoogleShoppingTaxonomyPrefix = "merchello:products:google-shopping-taxonomy:";
        public const string CheckoutSessionPrefix = "MerchelloCheckout_";
        public const string BasketSessionKey = "Basket";
    }

    public static class CacheTags
    {
        public const string ExchangeRates = "merchello-exchange-rates";
        public const string ShippingQuotes = "shipping-quotes";
        public const string Locality = "merchello:locality:";
        public const string Tax = "merchello:tax";
        public const string GoogleShoppingTaxonomy = "merchello:products:google-shopping-taxonomy";
    }

    public static class PaymentProviders
    {
        public static class Aliases
        {
            public const string Manual = "manual";
            public const string PurchaseOrder = "purchaseorder";
            public const string Stripe = "stripe";
            public const string PayPal = "paypal";
            public const string Braintree = "braintree";
        }

        public static class MethodAliases
        {
            public const string Cards = "cards";
            public const string CardsElements = "cards-elements";
            public const string ApplePay = "applepay";
            public const string GooglePay = "googlepay";
            public const string Link = "link";
            public const string PayLater = "paylater";
            public const string Venmo = "venmo";
            public const string Ideal = "ideal";
            public const string Bancontact = "bancontact";
            public const string Sepa = "sepa";
            public const string Eps = "eps";
            public const string P24 = "p24";
        }

        public static class ConfigKeys
        {
            public const string SecretKey = "secretKey";
            public const string PublishableKey = "publishableKey";
            public const string WebhookSecret = "webhookSecret";
            public const string ClientId = "clientId";
            public const string ClientSecret = "clientSecret";
            public const string WebhookId = "webhookId";
            public const string BrandName = "brandName";
            public const string MerchantId = "merchantId";
            public const string PublicKey = "publicKey";
            public const string PrivateKey = "privateKey";
            public const string MerchantAccountId = "merchantAccountId";
        }

        public static class MetadataKeys
        {
            public const string InvoiceId = "invoiceId";
            public const string Amount = "amount";
            public const string Currency = "currency";
            public const string ReturnUrl = "returnUrl";
            public const string MethodAlias = "methodAlias";
            public const string Source = "source";
            public const string Mode = "mode";
        }

        public static class Icons
        {
            public const string Wallet = "icon-wallet";
            public const string Document = "icon-document";
            public const string CreditCard = "icon-credit-card";
            public const string PayPal = "icon-paypal";
            public const string Apple = "icon-apple";
            public const string Google = "icon-google";
            public const string Venmo = "icon-venmo";
            public const string Bank = "icon-bank";
        }

        public static class Modes
        {
            public const string Payment = "payment";
        }
    }

    public static class ShippingProviders
    {
        public static class ConfigKeys
        {
            public const string ClientId = "clientId";
            public const string ClientSecret = "clientSecret";
            public const string AccountNumber = "accountNumber";
            public const string Environment = "environment";
            public const string UseNegotiatedRates = "useNegotiatedRates";
            public const string Markup = "markup";
            public const string Name = "name";
        }

        public static class Environments
        {
            public const string Sandbox = "sandbox";
            public const string Production = "production";
        }

        public static class Aliases
        {
            public const string FlatRate = "flat-rate";
        }

        public static class Icons
        {
            public const string Truck = "icon-truck";
        }
    }

    public static class WebhookTopics
    {
        // Orders
        public const string OrderCreated = "order.created";
        public const string OrderUpdated = "order.updated";
        public const string OrderStatusChanged = "order.status_changed";
        public const string OrderCancelled = "order.cancelled";

        // Invoices
        public const string InvoiceCreated = "invoice.created";
        public const string InvoicePaid = "invoice.paid";
        public const string InvoiceRefunded = "invoice.refunded";
        public const string InvoiceDeleted = "invoice.deleted";

        // Products
        public const string ProductCreated = "product.created";
        public const string ProductUpdated = "product.updated";
        public const string ProductDeleted = "product.deleted";

        // Inventory
        public const string InventoryAdjusted = "inventory.adjusted";
        public const string InventoryLowStock = "inventory.low_stock";
        public const string InventoryReserved = "inventory.reserved";
        public const string InventoryAllocated = "inventory.allocated";

        // Customers
        public const string CustomerCreated = "customer.created";
        public const string CustomerUpdated = "customer.updated";
        public const string CustomerDeleted = "customer.deleted";

        // Shipments
        public const string ShipmentCreated = "shipment.created";
        public const string ShipmentUpdated = "shipment.updated";

        // Discounts
        public const string DiscountCreated = "discount.created";
        public const string DiscountUpdated = "discount.updated";
        public const string DiscountDeleted = "discount.deleted";

        // Checkout
        public const string CheckoutAbandoned = "checkout.abandoned";
        public const string CheckoutAbandonedFirst = "checkout.abandoned.first";
        public const string CheckoutAbandonedReminder = "checkout.abandoned.reminder";
        public const string CheckoutAbandonedFinal = "checkout.abandoned.final";
        public const string CheckoutRecovered = "checkout.recovered";
        public const string CheckoutConverted = "checkout.converted";

        // Baskets
        public const string BasketCreated = "basket.created";
        public const string BasketUpdated = "basket.updated";

        // Test
        public const string TestPing = "test.ping";

        // Digital Products
        public const string DigitalDelivered = "digital.delivered";

        // Fulfilment
        public const string FulfilmentSubmitted = "fulfilment.submitted";
        public const string FulfilmentFailed = "fulfilment.failed";
        public const string FulfilmentInventoryUpdated = "fulfilment.inventory_updated";
        public const string FulfilmentProductSynced = "fulfilment.product_synced";
    }

    public static class EmailTopics
    {
        // Orders
        public const string OrderCreated = "order.created";
        public const string OrderStatusChanged = "order.status_changed";
        public const string OrderCancelled = "order.cancelled";

        // Invoices
        public const string InvoiceCreated = "invoice.created";
        public const string InvoicePaid = "invoice.paid";
        public const string InvoiceRefunded = "invoice.refunded";
        public const string InvoiceDeleted = "invoice.deleted";
        public const string InvoiceReminder = "invoice.reminder";
        public const string InvoiceOverdue = "invoice.overdue";

        // Payments
        public const string PaymentCreated = "payment.created";
        public const string PaymentRefunded = "payment.refunded";

        // Shipments
        public const string ShipmentCreated = "shipment.created";
        public const string ShipmentUpdated = "shipment.updated";
        public const string ShipmentPreparing = "shipment.preparing";
        public const string ShipmentShipped = "shipment.shipped";
        public const string ShipmentDelivered = "shipment.delivered";
        public const string ShipmentCancelled = "shipment.cancelled";

        // Customers
        public const string CustomerCreated = "customer.created";
        public const string CustomerUpdated = "customer.updated";
        public const string CustomerPasswordReset = "customer.password_reset";

        // Inventory
        public const string InventoryLowStock = "inventory.low_stock";

        // Checkout
        public const string CheckoutAbandoned = "checkout.abandoned";
        public const string CheckoutAbandonedFirst = "checkout.abandoned.first";
        public const string CheckoutAbandonedReminder = "checkout.abandoned.reminder";
        public const string CheckoutAbandonedFinal = "checkout.abandoned.final";
        public const string CheckoutRecovered = "checkout.recovered";
        public const string CheckoutConverted = "checkout.converted";

        // Digital Products
        public const string DigitalProductDelivered = "digital.delivered";

        // Fulfilment
        public const string FulfilmentSupplierOrder = "fulfilment.supplier_order";
    }

    public static class StatusLabels
    {
        public static class Fulfillment
        {
            public const string Unfulfilled = "Unfulfilled";
            public const string Fulfilled = "Fulfilled";
            public const string Partial = "Partial";
        }

        public static class Payment
        {
            public const string Paid = "Paid";
            public const string PartiallyPaid = "Partially Paid";
            public const string PartiallyRefunded = "Partially Refunded";
            public const string Refunded = "Refunded";
            public const string AwaitingPayment = "Awaiting Payment";
            public const string Unpaid = "Unpaid";
        }

        public static class Order
        {
            public const string Pending = "Pending";
            public const string AwaitingStock = "Awaiting Stock";
            public const string ReadyToFulfill = "Ready to Fulfill";
            public const string Processing = "Processing";
            public const string PartiallyShipped = "Partially Shipped";
            public const string Shipped = "Shipped";
            public const string Completed = "Completed";
            public const string Cancelled = "Cancelled";
            public const string OnHold = "On Hold";
        }

        public static class Balance
        {
            public const string Balanced = "Balanced";
        }

        public static class CssClasses
        {
            public const string Positive = "positive";
            public const string Warning = "warning";
            public const string Default = "default";
            public const string Cancelled = "cancelled";
            public const string Shipped = "shipped";
            public const string Unfulfilled = "unfulfilled";
        }

        public static class RiskLevel
        {
            public const string High = "high";
            public const string Medium = "medium";
            public const string Low = "low";
            public const string Minimal = "minimal";
        }
    }

    public static class QueryFilters
    {
        public static class PaymentStatus
        {
            public const string Paid = "paid";
            public const string Unpaid = "unpaid";
        }

        public static class FulfillmentStatus
        {
            public const string Fulfilled = "fulfilled";
            public const string Unfulfilled = "unfulfilled";
        }

        public static class CancellationStatus
        {
            public const string Cancelled = "cancelled";
            public const string Active = "active";
        }

        public static class SortDirection
        {
            public const string Ascending = "asc";
            public const string Descending = "desc";
        }

        public static class SortBy
        {
            public const string Date = "date";
            public const string Total = "total";
            public const string Customer = "customer";
            public const string InvoiceNumber = "invoicenumber";
        }
    }

    public static class FormFields
    {
        public const string PurchaseOrderNumber = "purchaseOrderNumber";
        public const string PaymentMethod = "paymentMethod";
        public const string Reference = "reference";
        public const string Notes = "notes";
        public const string DeviceData = "deviceData";
    }

    public static class LineItemTypes
    {
        public const string Product = "Product";
        public const string Shipping = "shipping";
    }

    public static class InvoiceChannels
    {
        public const string ManualOrder = "Manual order";
    }

    /// <summary>
    /// Well-known invoice source types for tracking order origins.
    /// </summary>
    public static class InvoiceSources
    {
        /// <summary>
        /// Traditional web checkout.
        /// </summary>
        public const string Web = "web";

        /// <summary>
        /// Universal Commerce Protocol (AI agents like Google Gemini, ChatGPT).
        /// </summary>
        public const string Ucp = "ucp";

        /// <summary>
        /// Direct API integration.
        /// </summary>
        public const string Api = "api";

        /// <summary>
        /// Point of Sale system.
        /// </summary>
        public const string Pos = "pos";

        /// <summary>
        /// Admin-created draft order.
        /// </summary>
        public const string Draft = "draft";

        /// <summary>
        /// Legacy alias for draft admin-created orders.
        /// Prefer <see cref="Draft"/>.
        /// </summary>
        public const string Manual = Draft;

        /// <summary>
        /// Mobile application.
        /// </summary>
        public const string Mobile = "mobile";

        /// <summary>
        /// Import from external system.
        /// </summary>
        public const string Import = "import";

        /// <summary>
        /// Unknown/other source.
        /// </summary>
        public const string Other = "other";
    }
}
