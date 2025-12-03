using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Accounting.ExtensionMethods;

/// <summary>
/// Extension methods for seeding invoice/order data for development and testing
/// </summary>
public static class InvoiceSeedExtensions
{
    private static readonly Random Random = new(42); // Fixed seed for reproducibility

    /// <summary>
    /// Creates a copy of an Address. Required because EF Core owned types
    /// cannot be shared between multiple owners.
    /// </summary>
    private static Address CloneAddress(Address source) => new()
    {
        Name = source.Name,
        Company = source.Company,
        AddressOne = source.AddressOne,
        AddressTwo = source.AddressTwo,
        TownCity = source.TownCity,
        CountyState = new CountyState { Name = source.CountyState.Name, RegionCode = source.CountyState.RegionCode },
        PostalCode = source.PostalCode,
        Country = source.Country,
        CountryCode = source.CountryCode,
        Email = source.Email,
        Phone = source.Phone
    };

    /// <summary>
    /// Creates a complete invoice with orders, line items, payments, and notes.
    /// Adds to context but does NOT save - caller must call SaveChangesAsync.
    /// </summary>
    public static Invoice CreateInvoiceWithOrders(
        this MerchelloDbContext context,
        string invoiceNumber,
        Address billingAddress,
        Address shippingAddress,
        string channel,
        List<(string? sku, string? name, int qty, decimal price, decimal taxRate, Guid? productId)> lineItems,
        Warehouse warehouse,
        ShippingOption shippingOption,
        bool isPaid,
        OrderStatus orderStatus,
        List<InvoiceNote>? notes = null,
        DateTime? dateCreated = null)
    {
        var created = dateCreated ?? DateTime.UtcNow;
        var shippingCost = shippingOption.FixedCost ?? 0m;

        // Calculate totals
        var subTotal = lineItems.Sum(li => li.qty * li.price);
        var tax = lineItems.Sum(li => li.qty * li.price * (li.taxRate / 100m));
        var total = subTotal + tax + shippingCost;

        var invoice = new Invoice
        {
            Id = GuidExtensions.NewSequentialGuid,
            InvoiceNumber = invoiceNumber,
            BillingAddress = CloneAddress(billingAddress),
            ShippingAddress = CloneAddress(shippingAddress),
            Channel = channel,
            SubTotal = subTotal,
            Tax = Math.Round(tax, 2),
            Total = Math.Round(total, 2),
            AdjustedSubTotal = subTotal,
            DateCreated = created,
            DateUpdated = created,
            Notes = notes ?? [new InvoiceNote { DateCreated = created, Description = "Order created", Author = "System", VisibleToCustomer = false }]
        };

        // Create Order
        var order = new Order
        {
            Id = GuidExtensions.NewSequentialGuid,
            InvoiceId = invoice.Id,
            Invoice = invoice,
            WarehouseId = warehouse.Id,
            ShippingOptionId = shippingOption.Id,
            ShippingCost = shippingCost,
            Status = orderStatus,
            DateCreated = created,
            DateUpdated = created,
            LineItems = []
        };

        // Set status-related dates
        switch (orderStatus)
        {
            case OrderStatus.Processing:
                order.ProcessingStartedDate = created.AddHours(1);
                break;
            case OrderStatus.PartiallyShipped:
            case OrderStatus.Shipped:
                order.ProcessingStartedDate = created.AddHours(1);
                order.ShippedDate = created.AddDays(1);
                break;
            case OrderStatus.Completed:
                order.ProcessingStartedDate = created.AddHours(1);
                order.ShippedDate = created.AddDays(1);
                order.CompletedDate = created.AddDays(3);
                break;
            case OrderStatus.Cancelled:
                order.CancelledDate = created.AddHours(2);
                order.CancellationReason = "Customer requested cancellation";
                break;
        }

        // Create line items
        foreach (var (sku, name, qty, price, taxRate, productId) in lineItems)
        {
            var lineItem = new LineItem
            {
                Id = GuidExtensions.NewSequentialGuid,
                OrderId = order.Id,
                Order = order,
                ProductId = productId,
                Sku = sku,
                Name = name,
                Quantity = qty,
                Amount = price,
                IsTaxable = taxRate > 0,
                TaxRate = taxRate,
                LineItemType = LineItemType.Product,
                DateCreated = created,
                DateUpdated = created
            };
            order.LineItems.Add(lineItem);
            context.LineItems.Add(lineItem);
        }

        // Add shipping line item
        if (shippingCost > 0)
        {
            var shippingLineItem = new LineItem
            {
                Id = GuidExtensions.NewSequentialGuid,
                OrderId = order.Id,
                Order = order,
                Sku = "SHIPPING",
                Name = shippingOption.Name,
                Quantity = 1,
                Amount = shippingCost,
                IsTaxable = false,
                TaxRate = 0,
                LineItemType = LineItemType.Shipping,
                DateCreated = created,
                DateUpdated = created
            };
            order.LineItems.Add(shippingLineItem);
            context.LineItems.Add(shippingLineItem);
        }

        invoice.Orders = [order];

        // Create payment if paid
        if (isPaid)
        {
            var payment = new Payment
            {
                Id = GuidExtensions.NewSequentialGuid,
                InvoiceId = invoice.Id,
                Invoice = invoice,
                Amount = Math.Round(total, 2), // Must match invoice.Total to avoid precision issues
                PaymentMethod = "Credit Card",
                TransactionId = $"TXN-{Guid.NewGuid().ToString()[..8].ToUpper()}",
                PaymentSuccess = true,
                Description = "Payment received",
                DateCreated = created.AddMinutes(5)
            };
            invoice.Payments = [payment];
            context.Payments.Add(payment);

            // Add payment note
            invoice.Notes.Add(new InvoiceNote
            {
                DateCreated = created.AddMinutes(5),
                Description = $"Payment of {total:C} received via Credit Card",
                Author = "System",
                VisibleToCustomer = true
            });
        }

        // Add status change notes
        if (orderStatus >= OrderStatus.Processing)
        {
            invoice.Notes.Add(new InvoiceNote
            {
                DateCreated = created.AddHours(1),
                Description = "Order is being processed",
                Author = "Warehouse",
                VisibleToCustomer = false
            });
        }

        if (orderStatus >= OrderStatus.Shipped)
        {
            invoice.Notes.Add(new InvoiceNote
            {
                DateCreated = created.AddDays(1),
                Description = "Order has been shipped",
                Author = "Warehouse",
                VisibleToCustomer = true
            });
        }

        if (orderStatus == OrderStatus.Completed)
        {
            invoice.Notes.Add(new InvoiceNote
            {
                DateCreated = created.AddDays(3),
                Description = "Order delivered successfully",
                Author = "System",
                VisibleToCustomer = true
            });
        }

        // Add to context
        context.Invoices.Add(invoice);
        context.Orders.Add(order);

        return invoice;
    }

    /// <summary>
    /// Seeds sample invoice data for development/testing using real products and warehouses.
    /// </summary>
    /// <param name="context">The database context</param>
    /// <param name="invoicePrefix">Invoice number prefix</param>
    /// <param name="products">Real products from the database</param>
    /// <param name="warehouses">Real warehouses with their shipping options</param>
    /// <param name="taxRate">Tax rate to apply (default 20% UK VAT)</param>
    /// <param name="count">Number of invoices to create (default 100)</param>
    public static void SeedSampleInvoices(
        this MerchelloDbContext context,
        string invoicePrefix,
        List<Product> products,
        List<Warehouse> warehouses,
        decimal taxRate = 20m,
        int count = 100)
    {
        var customers = GetSampleCustomers();
        var channels = new[] { "Online Store", "Online Store", "Online Store", "Shop", "POS", "Draft order" };

        for (var i = 1; i <= count; i++)
        {
            // Pick status based on weighted distribution
            var (status, isPaid, minDays, maxDays) = PickWeightedStatus(i, count);

            // Pick random customer and channel
            var customer = customers[Random.Next(customers.Count)];
            var channel = channels[Random.Next(channels.Length)];

            // Pick random warehouse and one of its shipping options
            var warehouse = warehouses[Random.Next(warehouses.Count)];
            var shippingOptions = warehouse.ShippingOptions.ToList();
            var shippingOption = shippingOptions.Count > 0
                ? shippingOptions[Random.Next(shippingOptions.Count)]
                : throw new InvalidOperationException($"Warehouse {warehouse.Name} has no shipping options");

            // Pick 1-5 random products for line items
            var numItems = Random.Next(1, 6);
            var selectedProducts = products.OrderBy(_ => Random.Next()).Take(numItems).ToList();

            var lineItems = selectedProducts.Select(p => (
                sku: p.Sku,
                name: p.Name,
                qty: Random.Next(1, 4),
                price: p.Price,
                taxRate: taxRate,
                productId: (Guid?)p.Id
            )).ToList();

            // Create date within the range for this status
            var daysAgo = Random.Next(minDays, maxDays + 1);
            var dateCreated = DateTime.UtcNow.AddDays(-daysAgo).AddHours(-Random.Next(0, 24));

            context.CreateInvoiceWithOrders(
                invoiceNumber: $"{invoicePrefix}{i:D4}",
                billingAddress: customer.billing,
                shippingAddress: customer.shipping ?? customer.billing,
                channel: channel,
                lineItems: lineItems,
                warehouse: warehouse,
                shippingOption: shippingOption,
                isPaid: isPaid,
                orderStatus: status,
                dateCreated: dateCreated
            );
        }
    }

    /// <summary>
    /// Picks a weighted status based on position in the count to ensure good distribution.
    /// </summary>
    private static (OrderStatus status, bool isPaid, int minDays, int maxDays) PickWeightedStatus(int index, int total)
    {
        // Distribution: 8% Pending, 10% ReadyToFulfill, 12% Processing, 15% Shipped,
        //               5% PartiallyShipped, 40% Completed, 4% OnHold, 3% AwaitingStock, 3% Cancelled
        var percent = index * 100 / total;

        return percent switch
        {
            < 4 => (OrderStatus.Pending, false, 0, 2),        // 4% unpaid pending
            < 8 => (OrderStatus.Pending, true, 0, 2),         // 4% paid pending
            < 18 => (OrderStatus.ReadyToFulfill, true, 0, 3), // 10% ready to fulfill
            < 30 => (OrderStatus.Processing, true, 1, 5),     // 12% processing
            < 45 => (OrderStatus.Shipped, true, 3, 14),       // 15% shipped
            < 50 => (OrderStatus.PartiallyShipped, true, 5, 10), // 5% partially shipped
            < 90 => (OrderStatus.Completed, true, 7, 60),     // 40% completed
            < 94 => (OrderStatus.OnHold, true, 5, 15),        // 4% on hold
            < 97 => (OrderStatus.AwaitingStock, true, 3, 10), // 3% awaiting stock
            _ => (OrderStatus.Cancelled, false, 2, 20)        // 3% cancelled
        };
    }

    private static List<(Address billing, Address? shipping)> GetSampleCustomers()
    {
        return
        [
            // UK Customers
            (new Address
            {
                Name = "John Smith",
                Email = "john.smith@example.com",
                Phone = "+44 20 7946 0958",
                AddressOne = "123 High Street",
                TownCity = "London",
                CountyState = new CountyState { Name = "Greater London", RegionCode = "LND" },
                PostalCode = "SW1A 1AA",
                Country = "United Kingdom",
                CountryCode = "GB"
            }, null),

            (new Address
            {
                Name = "Sarah Johnson",
                Email = "sarah.j@example.com",
                Phone = "+44 161 496 0123",
                Company = "Johnson & Co Ltd",
                AddressOne = "45 Market Street",
                AddressTwo = "Suite 200",
                TownCity = "Manchester",
                CountyState = new CountyState { Name = "Greater Manchester", RegionCode = "MAN" },
                PostalCode = "M1 1AE",
                Country = "United Kingdom",
                CountryCode = "GB"
            }, null),

            (new Address
            {
                Name = "Emma Williams",
                Email = "emma.w@example.com",
                Phone = "+44 131 496 0456",
                AddressOne = "78 Royal Mile",
                TownCity = "Edinburgh",
                CountyState = new CountyState { Name = "Edinburgh", RegionCode = "EDH" },
                PostalCode = "EH1 2NG",
                Country = "United Kingdom",
                CountryCode = "GB"
            }, null),

            (new Address
            {
                Name = "James Brown",
                Email = "james.b@example.com",
                Phone = "+44 29 2087 0789",
                AddressOne = "12 Castle Street",
                TownCity = "Cardiff",
                CountyState = new CountyState { Name = "Cardiff", RegionCode = "CRF" },
                PostalCode = "CF10 1BW",
                Country = "United Kingdom",
                CountryCode = "GB"
            }, null),

            (new Address
            {
                Name = "Oliver Davis",
                Email = "oliver.d@example.com",
                Phone = "+44 113 496 0321",
                Company = "Davis Enterprises",
                AddressOne = "56 The Headrow",
                TownCity = "Leeds",
                CountyState = new CountyState { Name = "West Yorkshire", RegionCode = "WYK" },
                PostalCode = "LS1 8EQ",
                Country = "United Kingdom",
                CountryCode = "GB"
            }, null),

            // US Customers
            (new Address
            {
                Name = "Michael Anderson",
                Email = "m.anderson@example.com",
                Phone = "+1 212 555 0147",
                AddressOne = "350 Fifth Avenue",
                AddressTwo = "Apt 4B",
                TownCity = "New York",
                CountyState = new CountyState { Name = "New York", RegionCode = "NY" },
                PostalCode = "10118",
                Country = "United States",
                CountryCode = "US"
            }, null),

            (new Address
            {
                Name = "Emily Martinez",
                Email = "emily.m@example.com",
                Phone = "+1 310 555 0198",
                AddressOne = "8500 Wilshire Blvd",
                TownCity = "Beverly Hills",
                CountyState = new CountyState { Name = "California", RegionCode = "CA" },
                PostalCode = "90211",
                Country = "United States",
                CountryCode = "US"
            }, null),

            (new Address
            {
                Name = "David Wilson",
                Email = "d.wilson@example.com",
                Phone = "+1 312 555 0276",
                Company = "Wilson Tech Inc",
                AddressOne = "233 S Wacker Dr",
                TownCity = "Chicago",
                CountyState = new CountyState { Name = "Illinois", RegionCode = "IL" },
                PostalCode = "60606",
                Country = "United States",
                CountryCode = "US"
            }, null),

            // Customer with different shipping address
            (new Address
            {
                Name = "Sophie Taylor",
                Email = "sophie.t@example.com",
                Phone = "+44 117 496 0654",
                AddressOne = "89 Queen Square",
                TownCity = "Bristol",
                CountyState = new CountyState { Name = "Bristol", RegionCode = "BST" },
                PostalCode = "BS1 4LH",
                Country = "United Kingdom",
                CountryCode = "GB"
            }, new Address
            {
                Name = "Sophie Taylor (Work)",
                Email = "sophie.t@example.com",
                Phone = "+44 117 496 0654",
                Company = "Taylor Designs",
                AddressOne = "15 Temple Way",
                TownCity = "Bristol",
                CountyState = new CountyState { Name = "Bristol", RegionCode = "BST" },
                PostalCode = "BS2 0BY",
                Country = "United Kingdom",
                CountryCode = "GB"
            }),

            (new Address
            {
                Name = "Lucy Thompson",
                Email = "lucy.t@example.com",
                Phone = "+44 121 496 0987",
                AddressOne = "42 New Street",
                TownCity = "Birmingham",
                CountyState = new CountyState { Name = "West Midlands", RegionCode = "WMD" },
                PostalCode = "B2 4QA",
                Country = "United Kingdom",
                CountryCode = "GB"
            }, null)
        ];
    }
}
