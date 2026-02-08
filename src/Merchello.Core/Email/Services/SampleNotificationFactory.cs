using Merchello.Core.Accounting.Models;
using Merchello.Core.Customers.Models;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.DigitalProducts.Notifications;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications.Base;
using Merchello.Core.Notifications.CheckoutNotifications;
using Merchello.Core.Notifications.CustomerNotifications;
using Merchello.Core.Notifications.Inventory;
using Merchello.Core.Notifications.Invoice;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Notifications.Shipment;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Email.Services;

/// <summary>
/// Factory for creating sample notification instances for email preview and testing.
/// </summary>
public class SampleNotificationFactory : ISampleNotificationFactory
{
    private const string SamplePurchaseOrder = "PO-10001";

    private readonly IEmailTopicRegistry _topicRegistry;
    private readonly Dictionary<Type, Func<MerchelloNotification>> _sampleProviders;

    public SampleNotificationFactory(IEmailTopicRegistry topicRegistry)
    {
        _topicRegistry = topicRegistry;
        _sampleProviders = BuildSampleProviders();
    }

    /// <inheritdoc />
    public MerchelloNotification? CreateSampleNotification(string topic)
    {
        var notificationType = _topicRegistry.GetNotificationType(topic);
        if (notificationType == null)
            return null;

        // Check if we have an explicit provider for this type
        if (_sampleProviders.TryGetValue(notificationType, out var provider))
            return provider();

        // Try reflection for types with settable properties (like CheckoutAbandonedNotificationBase subclasses)
        return TryCreateViaReflection(notificationType);
    }

    private Dictionary<Type, Func<MerchelloNotification>> BuildSampleProviders()
    {
        return new Dictionary<Type, Func<MerchelloNotification>>
        {
            // Invoice notifications
            [typeof(InvoiceSavedNotification)] = () => new InvoiceSavedNotification(CreateSampleInvoice()),
            [typeof(InvoiceDeletedNotification)] = () => new InvoiceDeletedNotification(CreateSampleInvoice()),
            [typeof(InvoiceCancelledNotification)] = () => new InvoiceCancelledNotification(CreateSampleInvoice(), "Customer requested cancellation", 1),
            [typeof(InvoiceReminderNotification)] = () => new InvoiceReminderNotification(CreateSampleInvoice(), 7),
            [typeof(InvoiceOverdueNotification)] = () => new InvoiceOverdueNotification(CreateSampleInvoice(), 5, 1),

            // Payment notifications
            [typeof(PaymentCreatedNotification)] = () => new PaymentCreatedNotification(CreateSamplePayment()),
            [typeof(PaymentRefundedNotification)] = () => new PaymentRefundedNotification(CreateSamplePayment(), CreateSampleRefundPayment()),

            // Order notifications
            [typeof(OrderCreatedNotification)] = () => new OrderCreatedNotification(CreateSampleOrder()),
            [typeof(OrderSavedNotification)] = () => new OrderSavedNotification(CreateSampleOrder()),
            [typeof(OrderStatusChangedNotification)] = () => new OrderStatusChangedNotification(CreateSampleOrder(), OrderStatus.Pending, OrderStatus.Processing),

            // Shipment notifications
            [typeof(ShipmentCreatedNotification)] = () => new ShipmentCreatedNotification(CreateSampleShipment()),
            [typeof(ShipmentSavedNotification)] = () => new ShipmentSavedNotification(CreateSampleShipment()),
            [typeof(ShipmentStatusChangedNotification)] = () => new ShipmentStatusChangedNotification(CreateSampleShipment(), ShipmentStatus.Preparing, ShipmentStatus.Shipped),

            // Customer notifications
            [typeof(CustomerCreatedNotification)] = () => new CustomerCreatedNotification(CreateSampleCustomer()),
            [typeof(CustomerSavedNotification)] = () => new CustomerSavedNotification(CreateSampleCustomer()),
            [typeof(CustomerPasswordResetRequestedNotification)] = () => new CustomerPasswordResetRequestedNotification(
                CreateSampleCustomer(),
                "sample-reset-token-abc123",
                "https://example.com/reset-password?token=sample-reset-token-abc123",
                DateTime.UtcNow.AddHours(24)),

            // Inventory notifications
            [typeof(LowStockNotification)] = () => new LowStockNotification(
                Guid.NewGuid(),
                Guid.NewGuid(),
                "Sample Product",
                3,
                5),

            // Checkout notifications
            [typeof(CheckoutAbandonedNotification)] = () => new CheckoutAbandonedNotification(
                Guid.NewGuid(),
                Guid.NewGuid(),
                "customer@example.com",
                "John Doe",
                99.99m,
                "USD",
                "https://example.com/recover?token=abc123"),
            [typeof(CheckoutAbandonedFirstNotification)] = CreateAbandonedCheckoutNotification<CheckoutAbandonedFirstNotification>,
            [typeof(CheckoutAbandonedReminderNotification)] = CreateAbandonedCheckoutNotification<CheckoutAbandonedReminderNotification>,
            [typeof(CheckoutAbandonedFinalNotification)] = CreateAbandonedCheckoutNotification<CheckoutAbandonedFinalNotification>,
            [typeof(CheckoutRecoveredNotification)] = () => new CheckoutRecoveredNotification(
                Guid.NewGuid(),
                Guid.NewGuid(),
                "customer@example.com",
                99.99m,
                DateTime.UtcNow.AddDays(-1)),
            [typeof(CheckoutRecoveryConvertedNotification)] = () => new CheckoutRecoveryConvertedNotification(
                Guid.NewGuid(),
                Guid.NewGuid(),
                "customer@example.com",
                99.99m,
                DateTime.UtcNow.AddDays(-2),
                DateTime.UtcNow.AddDays(-1)),

            // Digital product notifications
            [typeof(DigitalProductDeliveredNotification)] = () => new DigitalProductDeliveredNotification(
                CreateSampleInvoice(),
                CreateSampleDownloadLinks())
        };
    }

    private MerchelloNotification? TryCreateViaReflection(Type notificationType)
    {
        // Check for parameterless constructor
        var parameterlessCtor = notificationType.GetConstructor(Type.EmptyTypes);
        if (parameterlessCtor == null)
            return null;

        try
        {
            var instance = Activator.CreateInstance(notificationType) as MerchelloNotification;
            if (instance == null)
                return null;

            // Populate settable properties with sample values
            PopulateSampleProperties(instance);
            return instance;
        }
        catch
        {
            return null;
        }
    }

    private void PopulateSampleProperties(object instance)
    {
        var properties = instance.GetType().GetProperties()
            .Where(p => p.CanWrite && p.GetSetMethod() != null);

        foreach (var prop in properties)
        {
            var value = GetSampleValueForProperty(prop.Name, prop.PropertyType);
            if (value != null)
            {
                try
                {
                    prop.SetValue(instance, value);
                }
                catch
                {
                    // Ignore properties that can't be set
                }
            }
        }
    }

    private object? GetSampleValueForProperty(string propertyName, Type propertyType)
    {
        var nameLower = propertyName.ToLowerInvariant();

        if (propertyType == typeof(string))
        {
            return nameLower switch
            {
                "customeremail" or "email" => "customer@example.com",
                "customername" or "name" => "John Doe",
                "currencycode" => "USD",
                "currencysymbol" => "$",
                "recoverylink" => "https://example.com/recover?token=abc123",
                "formattedtotal" => "$99.99",
                _ => "Sample Value"
            };
        }

        if (propertyType == typeof(decimal))
        {
            return nameLower switch
            {
                "baskettotal" or "total" => 99.99m,
                _ => 0m
            };
        }

        if (propertyType == typeof(int))
        {
            return nameLower switch
            {
                "itemcount" => 3,
                "emailsequencenumber" => 1,
                _ => 0
            };
        }

        if (propertyType == typeof(Guid))
            return Guid.NewGuid();

        if (propertyType == typeof(Guid?))
            return Guid.NewGuid();

        return null;
    }

    private Invoice CreateSampleInvoice()
    {
        var invoiceId = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        var lineItems = new List<LineItem>
        {
            new()
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                Sku = "SKU-001",
                Name = "Sample Product",
                Quantity = 1,
                Amount = 49.99m,
                LineItemType = LineItemType.Product
            },
            new()
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                Sku = "SKU-002",
                Name = "Another Product",
                Quantity = 2,
                Amount = 19.99m,
                LineItemType = LineItemType.Product
            }
        };

        var order = new Accounting.Models.Order
        {
            Id = orderId,
            InvoiceId = invoiceId,
            WarehouseId = Guid.NewGuid(),
            Status = OrderStatus.Pending,
            ShippingCost = 9.99m,
            LineItems = lineItems
        };

        return new Invoice
        {
            Id = invoiceId,
            CustomerId = Guid.NewGuid(),
            InvoiceNumber = "INV-00001",
            PurchaseOrder = SamplePurchaseOrder,
            BillingAddress = CreateSampleAddress(),
            ShippingAddress = CreateSampleAddress(),
            Orders = [order],
            SubTotal = 89.97m,
            Tax = 9.00m,
            Total = 108.96m,
            CurrencyCode = "USD",
            CurrencySymbol = "$",
            DueDate = DateTime.UtcNow.AddDays(30)
        };
    }

    private Accounting.Models.Order CreateSampleOrder()
    {
        var orderId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();

        var lineItems = new List<LineItem>
        {
            new()
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                InvoiceId = invoiceId,
                Sku = "SKU-001",
                Name = "Sample Product",
                Quantity = 1,
                Amount = 49.99m,
                LineItemType = LineItemType.Product
            }
        };

        var order = new Accounting.Models.Order
        {
            Id = orderId,
            InvoiceId = invoiceId,
            WarehouseId = Guid.NewGuid(),
            Status = OrderStatus.Processing,
            ShippingCost = 9.99m,
            LineItems = lineItems,
            Invoice = new Invoice
            {
                Id = invoiceId,
                CustomerId = Guid.NewGuid(),
                InvoiceNumber = "INV-00001",
                PurchaseOrder = SamplePurchaseOrder,
                BillingAddress = CreateSampleAddress(),
                ShippingAddress = CreateSampleAddress(),
                SubTotal = 49.99m,
                Tax = 5.00m,
                Total = 64.98m,
                CurrencyCode = "USD",
                CurrencySymbol = "$"
            }
        };

        return order;
    }

    private Payment CreateSamplePayment()
    {
        var invoiceId = Guid.NewGuid();

        return new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoiceId,
            Amount = 99.99m,
            CurrencyCode = "USD",
            PaymentMethod = "Credit Card",
            PaymentProviderAlias = "stripe",
            PaymentSuccess = true,
            TransactionId = "txn_sample123",
            Invoice = new Invoice
            {
                Id = invoiceId,
                CustomerId = Guid.NewGuid(),
                InvoiceNumber = "INV-00001",
                PurchaseOrder = SamplePurchaseOrder,
                BillingAddress = CreateSampleAddress(),
                ShippingAddress = CreateSampleAddress(),
                SubTotal = 89.99m,
                Tax = 10.00m,
                Total = 99.99m,
                CurrencyCode = "USD",
                CurrencySymbol = "$"
            }
        };
    }

    private Payment CreateSampleRefundPayment()
    {
        return new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = Guid.NewGuid(),
            Amount = -25.00m,
            CurrencyCode = "USD",
            PaymentMethod = "Credit Card",
            PaymentProviderAlias = "stripe",
            PaymentType = Payments.Models.PaymentType.Refund,
            PaymentSuccess = true,
            RefundReason = "Customer requested partial refund",
            TransactionId = "txn_refund123"
        };
    }

    private Shipment CreateSampleShipment()
    {
        var shipmentId = Guid.NewGuid();
        var orderId = Guid.NewGuid();

        return new Shipment
        {
            Id = shipmentId,
            OrderId = orderId,
            WarehouseId = Guid.NewGuid(),
            Address = CreateSampleAddress(),
            TrackingNumber = "1Z999AA10123456784",
            TrackingUrl = "https://www.ups.com/track?tracknum=1Z999AA10123456784",
            Carrier = "UPS",
            Status = ShipmentStatus.Shipped,
            ShippedDate = DateTime.UtcNow,
            LineItems =
            [
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    OrderId = orderId,
                    Sku = "SKU-001",
                    Name = "Sample Product",
                    Quantity = 1,
                    Amount = 49.99m
                }
            ]
        };
    }

    private Customer CreateSampleCustomer()
    {
        return new Customer
        {
            Id = Guid.NewGuid(),
            Email = "customer@example.com",
            FirstName = "John",
            LastName = "Doe",
            AcceptsMarketing = true
        };
    }

    private Address CreateSampleAddress()
    {
        return new Address
        {
            Name = "John Doe",
            AddressOne = "123 Main Street",
            AddressTwo = "Apt 4B",
            TownCity = "New York",
            CountyState = new CountyState
            {
                Name = "New York",
                RegionCode = "NY"
            },
            PostalCode = "10001",
            Country = "United States",
            CountryCode = "US",
            Email = "customer@example.com",
            Phone = "+1 (555) 123-4567"
        };
    }

    private List<DownloadLink> CreateSampleDownloadLinks()
    {
        return
        [
            new DownloadLink
            {
                Id = Guid.NewGuid(),
                InvoiceId = Guid.NewGuid(),
                LineItemId = Guid.NewGuid(),
                CustomerId = Guid.NewGuid(),
                MediaId = "12345",
                FileName = "Digital Product Guide.pdf",
                Token = "sample-download-token-abc123",
                ExpiresUtc = DateTime.UtcNow.AddDays(7),
                MaxDownloads = 5,
                DownloadCount = 0,
                DateCreated = DateTime.UtcNow,
                DownloadUrl = "https://example.com/download?token=sample-download-token-abc123"
            }
        ];
    }

    private static T CreateAbandonedCheckoutNotification<T>() where T : CheckoutAbandonedNotificationBase, new()
    {
        var notification = new T
        {
            AbandonedCheckoutId = Guid.NewGuid(),
            BasketId = Guid.NewGuid(),
            CustomerEmail = "customer@example.com",
            CustomerName = "John Doe",
            BasketTotal = 99.99m,
            CurrencyCode = "USD",
            CurrencySymbol = "$",
            RecoveryLink = "https://example.com/recover?token=abc123",
            FormattedTotal = "$99.99",
            ItemCount = 3
        };
        // EmailSequenceNumber is set by the constructor of T
        return notification;
    }
}
