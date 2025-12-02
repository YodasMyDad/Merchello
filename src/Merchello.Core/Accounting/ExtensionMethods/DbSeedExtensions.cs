using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Extensions;

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
        List<(string sku, string name, int qty, decimal price, decimal taxRate)> lineItems,
        decimal shippingCost,
        bool isPaid,
        OrderStatus orderStatus,
        List<InvoiceNote>? notes = null,
        DateTime? dateCreated = null)
    {
        var created = dateCreated ?? DateTime.UtcNow;

        // Calculate totals
        decimal subTotal = lineItems.Sum(li => li.qty * li.price);
        decimal tax = lineItems.Sum(li => li.qty * li.price * (li.taxRate / 100m));
        decimal total = subTotal + tax + shippingCost;

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
            Notes = notes ?? new List<InvoiceNote>
            {
                new() { DateCreated = created, Description = "Order created", Author = "System", VisibleToCustomer = false }
            }
        };

        // Create Order
        var order = new Order
        {
            Id = GuidExtensions.NewSequentialGuid,
            InvoiceId = invoice.Id,
            Invoice = invoice,
            WarehouseId = Guid.Empty, // No real warehouse for seed data
            ShippingOptionId = Guid.Empty,
            ShippingCost = shippingCost,
            Status = orderStatus,
            DateCreated = created,
            DateUpdated = created,
            LineItems = new List<LineItem>()
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
        foreach (var (sku, name, qty, price, taxRate) in lineItems)
        {
            var lineItem = new LineItem
            {
                Id = GuidExtensions.NewSequentialGuid,
                OrderId = order.Id,
                Order = order,
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
                Name = "Standard Shipping",
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

        invoice.Orders = new List<Order> { order };

        // Create payment if paid
        if (isPaid)
        {
            var payment = new Payment
            {
                Id = GuidExtensions.NewSequentialGuid,
                InvoiceId = invoice.Id,
                Invoice = invoice,
                Amount = total,
                PaymentMethod = "Credit Card",
                TransactionId = $"TXN-{Guid.NewGuid().ToString()[..8].ToUpper()}",
                PaymentSuccess = true,
                Description = "Payment received",
                DateCreated = created.AddMinutes(5)
            };
            invoice.Payments = new List<Payment> { payment };
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
    /// Seeds sample invoice data for development/testing
    /// </summary>
    public static void SeedSampleInvoices(this MerchelloDbContext context, string invoicePrefix = "INV-")
    {
        var customers = GetSampleCustomers();
        var products = GetSampleProducts();
        var invoiceNumber = 1;

        // Create varied orders across different statuses and dates
        var scenarios = new List<(OrderStatus status, bool isPaid, int daysAgo, string channel)>
        {
            // Today's orders
            (OrderStatus.Pending, false, 0, "Online Store"),
            (OrderStatus.Pending, true, 0, "Online Store"),
            (OrderStatus.ReadyToFulfill, true, 0, "Online Store"),

            // Yesterday's orders
            (OrderStatus.Processing, true, 1, "Online Store"),
            (OrderStatus.Processing, true, 1, "Shop"),
            (OrderStatus.ReadyToFulfill, true, 1, "Online Store"),
            (OrderStatus.Pending, false, 1, "Draft order"),

            // This week
            (OrderStatus.Shipped, true, 2, "Online Store"),
            (OrderStatus.Shipped, true, 3, "Online Store"),
            (OrderStatus.PartiallyShipped, true, 3, "Online Store"),
            (OrderStatus.Completed, true, 4, "Online Store"),
            (OrderStatus.Completed, true, 5, "Shop"),
            (OrderStatus.Cancelled, false, 4, "Online Store"),

            // Last week
            (OrderStatus.Completed, true, 7, "Online Store"),
            (OrderStatus.Completed, true, 8, "Online Store"),
            (OrderStatus.Completed, true, 9, "POS"),
            (OrderStatus.Completed, true, 10, "Online Store"),
            (OrderStatus.OnHold, true, 8, "Online Store"),
            (OrderStatus.AwaitingStock, true, 9, "Online Store"),

            // Last month
            (OrderStatus.Completed, true, 14, "Online Store"),
            (OrderStatus.Completed, true, 18, "Online Store"),
            (OrderStatus.Completed, true, 21, "Shop"),
            (OrderStatus.Completed, true, 25, "Online Store"),
            (OrderStatus.Completed, true, 28, "Online Store"),
        };

        foreach (var (status, isPaid, daysAgo, channel) in scenarios)
        {
            var customer = customers[Random.Next(customers.Count)];
            var numItems = Random.Next(1, 4);
            var selectedProducts = products.OrderBy(_ => Random.Next()).Take(numItems).ToList();

            var lineItems = selectedProducts.Select(p => (
                sku: p.sku,
                name: p.name,
                qty: Random.Next(1, 3),
                price: p.price,
                taxRate: 20m // UK VAT
            )).ToList();

            var shippingCost = Random.Next(0, 2) == 0 ? 0m : Random.Next(5, 15);
            var dateCreated = DateTime.UtcNow.AddDays(-daysAgo).AddHours(-Random.Next(0, 12));

            context.CreateInvoiceWithOrders(
                invoiceNumber: $"{invoicePrefix}{invoiceNumber:D4}",
                billingAddress: customer.billing,
                shippingAddress: customer.shipping ?? customer.billing,
                channel: channel,
                lineItems: lineItems,
                shippingCost: shippingCost,
                isPaid: isPaid,
                orderStatus: status,
                dateCreated: dateCreated
            );

            invoiceNumber++;
        }
    }

    private static List<(Address billing, Address? shipping)> GetSampleCustomers()
    {
        return new List<(Address billing, Address? shipping)>
        {
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
            }, null),
        };
    }

    private static List<(string sku, string name, decimal price)> GetSampleProducts()
    {
        return new List<(string sku, string name, decimal price)>
        {
            ("TSH-BLK-M", "Classic T-Shirt - Black - Medium", 24.99m),
            ("TSH-WHT-L", "Classic T-Shirt - White - Large", 24.99m),
            ("TSH-NVY-S", "Classic T-Shirt - Navy - Small", 24.99m),
            ("TSH-GRY-XL", "Classic T-Shirt - Grey - XL", 24.99m),
            ("HOD-BLK-M", "Premium Hoodie - Black - Medium", 59.99m),
            ("HOD-NVY-L", "Premium Hoodie - Navy - Large", 59.99m),
            ("HOD-GRY-S", "Premium Hoodie - Grey - Small", 59.99m),
            ("CAP-BLK", "Snapback Cap - Black", 19.99m),
            ("CAP-NVY", "Snapback Cap - Navy", 19.99m),
            ("CAP-WHT", "Snapback Cap - White", 19.99m),
            ("BAG-TOT-BLK", "Canvas Tote Bag - Black", 14.99m),
            ("BAG-TOT-NAT", "Canvas Tote Bag - Natural", 14.99m),
            ("MUG-WHT", "Ceramic Mug - White", 12.99m),
            ("MUG-BLK", "Ceramic Mug - Black", 12.99m),
            ("STK-PACK", "Sticker Pack (10 pcs)", 9.99m),
            ("GFT-25", "Gift Card - £25", 25.00m),
            ("GFT-50", "Gift Card - £50", 50.00m),
            ("POL-BLU-M", "Polo Shirt - Blue - Medium", 34.99m),
            ("POL-WHT-L", "Polo Shirt - White - Large", 34.99m),
            ("JKT-BLK-M", "Bomber Jacket - Black - Medium", 89.99m),
        };
    }
}
