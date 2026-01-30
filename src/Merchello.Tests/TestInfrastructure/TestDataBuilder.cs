using Merchello.Core;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Customers.Factories;
using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Data;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Locality.Models;
using Merchello.Core.Payments.Factories;
using Merchello.Core.Payments.Models;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Suppliers.Factories;
using Merchello.Core.Suppliers.Models;
using Merchello.Core.Warehouses.Factories;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Fluent builder for creating test data with sensible defaults.
/// Automatically tracks entities in DbContext for persistence.
/// Uses domain factories to ensure consistency with production code.
/// </summary>
public class TestDataBuilder
{
    private readonly MerchelloDbContext _dbContext;

    // Simple factories (no dependencies)
    private readonly SupplierFactory _supplierFactory = new();
    private readonly WarehouseFactory _warehouseFactory = new();
    private readonly TaxGroupFactory _taxGroupFactory = new();
    private readonly ProductTypeFactory _productTypeFactory = new();
    private readonly CustomerFactory _customerFactory = new();
    private readonly OrderFactory _orderFactory = new();
    private readonly AddressFactory _addressFactory = new();
    private readonly ShipmentFactory _shipmentFactory = new();
    private readonly CustomerSegmentFactory _customerSegmentFactory = new();

    // Factories requiring ICurrencyService
    private readonly InvoiceFactory _invoiceFactory;
    private readonly PaymentFactory _paymentFactory;
    private readonly LineItemFactory _lineItemFactory;

    public TestDataBuilder(MerchelloDbContext dbContext, ICurrencyService currencyService)
    {
        _dbContext = dbContext;
        _invoiceFactory = new InvoiceFactory(currencyService);
        _paymentFactory = new PaymentFactory(currencyService);
        _lineItemFactory = new LineItemFactory(currencyService);
    }

    /// <summary>
    /// Creates a Supplier with the specified name
    /// </summary>
    public Supplier CreateSupplier(string name = "Test Supplier", string? code = null)
    {
        var supplier = _supplierFactory.Create(name);
        supplier.Id = Guid.NewGuid(); // Pre-generate ID for FK relationships
        supplier.Code = code;
        _dbContext.Suppliers.Add(supplier);
        return supplier;
    }

    /// <summary>
    /// Creates a TaxGroup with the specified name and percentage
    /// </summary>
    public TaxGroup CreateTaxGroup(string name = "Standard VAT", decimal percentage = 20m)
    {
        var taxGroup = _taxGroupFactory.Create(name, percentage);
        taxGroup.Id = Guid.NewGuid(); // Pre-generate ID for FK relationships
        _dbContext.TaxGroups.Add(taxGroup);
        return taxGroup;
    }

    /// <summary>
    /// Creates a ProductType with the specified name and alias
    /// </summary>
    public ProductType CreateProductType(string name = "Test Type", string alias = "test")
    {
        var productType = _productTypeFactory.Create(name, alias);
        productType.Id = Guid.NewGuid(); // Pre-generate ID for FK relationships
        _dbContext.ProductTypes.Add(productType);
        return productType;
    }

    /// <summary>
    /// Creates a Warehouse with the specified name and country code, optionally linked to a supplier
    /// </summary>
    public Warehouse CreateWarehouse(string name = "Test Warehouse", string countryCode = "GB", Supplier? supplier = null)
    {
        var warehouse = _warehouseFactory.Create(name, new Address { CountryCode = countryCode });
        warehouse.Id = Guid.NewGuid(); // Pre-generate ID for FK relationships

        if (supplier != null)
        {
            warehouse.SupplierId = supplier.Id;
            warehouse.Supplier = supplier;
            supplier.Warehouses.Add(warehouse);
        }

        _dbContext.Warehouses.Add(warehouse);
        return warehouse;
    }

    /// <summary>
    /// Creates a ProductRoot with required dependencies (creates TaxGroup and ProductType if not provided)
    /// </summary>
    public ProductRoot CreateProductRoot(
        string name = "Test Product Root",
        TaxGroup? taxGroup = null,
        ProductType? productType = null)
    {
        taxGroup ??= CreateTaxGroup();
        productType ??= CreateProductType();

        var productRoot = new ProductRoot
        {
            Id = Guid.NewGuid(), // Pre-generate ID for FK relationships
            RootName = name,
            TaxGroupId = taxGroup.Id,
            TaxGroup = taxGroup,
            ProductTypeId = productType.Id,
            ProductType = productType
        };

        _dbContext.RootProducts.Add(productRoot);
        return productRoot;
    }

    /// <summary>
    /// Creates a Product variant (creates ProductRoot if not provided)
    /// </summary>
    public Product CreateProduct(
        string name = "Test Product",
        ProductRoot? productRoot = null,
        decimal price = 10.99m,
        bool isDefault = true)
    {
        productRoot ??= CreateProductRoot();

        var product = new Product
        {
            Id = Guid.NewGuid(), // Pre-generate ID for FK relationships
            ProductRootId = productRoot.Id,
            ProductRoot = productRoot,
            Name = name,
            Price = price,
            Default = isDefault,
            Sku = $"SKU-{Guid.NewGuid():N}"[..12]
        };

        _dbContext.Products.Add(product);
        productRoot.Products.Add(product);
        return product;
    }

    /// <summary>
    /// Creates a ShippingOption for a warehouse
    /// </summary>
    public ShippingOption CreateShippingOption(
        string name = "Standard Delivery",
        Warehouse? warehouse = null,
        decimal fixedCost = 5m,
        int daysFrom = 2,
        int daysTo = 5,
        bool isNextDay = false)
    {
        warehouse ??= CreateWarehouse();

        var shippingOption = new ShippingOption
        {
            Name = name,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            DaysFrom = daysFrom,
            DaysTo = daysTo,
            FixedCost = fixedCost,
            IsNextDay = isNextDay
        };

        _dbContext.ShippingOptions.Add(shippingOption);
        warehouse.ShippingOptions.Add(shippingOption);
        return shippingOption;
    }

    /// <summary>
    /// Associates a warehouse with a product root at a given priority
    /// </summary>
    public ProductRootWarehouse AddWarehouseToProductRoot(
        ProductRoot productRoot,
        Warehouse warehouse,
        int priorityOrder = 1)
    {
        var association = new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            ProductRoot = productRoot,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            PriorityOrder = priorityOrder
        };

        _dbContext.ProductRootWarehouses.Add(association);
        productRoot.ProductRootWarehouses.Add(association);
        return association;
    }

    /// <summary>
    /// Creates a ProductWarehouse stock record for a product at a warehouse
    /// </summary>
    public ProductWarehouse CreateProductWarehouse(
        Product product,
        Warehouse warehouse,
        int stock = 100,
        bool trackStock = true,
        int reservedStock = 0,
        int? reorderPoint = null,
        int? reorderQuantity = null)
    {
        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            Product = product,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            Stock = stock,
            TrackStock = trackStock,
            ReservedStock = reservedStock,
            ReorderPoint = reorderPoint,
            ReorderQuantity = reorderQuantity,
            RowVersion = BitConverter.GetBytes(DateTime.UtcNow.Ticks)
        };

        _dbContext.ProductWarehouses.Add(productWarehouse);
        product.ProductWarehouses.Add(productWarehouse);
        warehouse.ProductWarehouses.Add(productWarehouse);
        return productWarehouse;
    }

    /// <summary>
    /// Adds a service region to a warehouse
    /// </summary>
    public WarehouseServiceRegion AddServiceRegion(
        Warehouse warehouse,
        string countryCode,
        string? stateOrProvinceCode = null,
        bool isExcluded = false)
    {
        var region = new WarehouseServiceRegion
        {
            CountryCode = countryCode,
            StateOrProvinceCode = stateOrProvinceCode,
            IsExcluded = isExcluded
        };

        var regions = warehouse.ServiceRegions;
        regions.Add(region);
        warehouse.SetServiceRegions(regions);
        return region;
    }

    /// <summary>
    /// Creates a ProductCollection
    /// </summary>
    public ProductCollection CreateProductCollection(string name = "Test Collection")
    {
        var collection = new ProductCollection
        {
            Name = name,

        };

        _dbContext.ProductCollections.Add(collection);
        return collection;
    }

    /// <summary>
    /// Creates an Order using OrderFactory with the specified status and warehouse
    /// </summary>
    public Order CreateOrder(
        Invoice? invoice = null,
        Warehouse? warehouse = null,
        ShippingOption? shippingOption = null,
        OrderStatus status = OrderStatus.Pending)
    {
        invoice ??= CreateInvoice();
        warehouse ??= CreateWarehouse();
        shippingOption ??= CreateShippingOption(warehouse: warehouse);

        var order = _orderFactory.Create(
            invoice: invoice,
            warehouseId: warehouse.Id,
            shippingOptionId: shippingOption.Id,
            status: status);

        _dbContext.Orders.Add(order);
        invoice.Orders ??= [];
        invoice.Orders.Add(order);
        return order;
    }

    /// <summary>
    /// Creates a Customer using CustomerFactory
    /// </summary>
    public Customer CreateCustomer(
        string? email = null,
        string? firstName = "Test",
        string? lastName = "Customer")
    {
        var customerEmail = email ?? $"test-{Guid.NewGuid():N}@example.com";
        var customer = _customerFactory.CreateFromEmail(customerEmail);
        customer.FirstName = firstName;
        customer.LastName = lastName;

        _dbContext.Customers.Add(customer);
        return customer;
    }

    /// <summary>
    /// Creates an Invoice using InvoiceFactory (auto-creates a Customer if not provided)
    /// </summary>
    public Invoice CreateInvoice(
        string? customerEmail = null,
        decimal total = 100m,
        Customer? customer = null)
    {
        customer ??= CreateCustomer(customerEmail);

        var billingAddress = CreateTestAddress(customer.Email);
        var shippingAddress = CreateTestAddress(customer.Email);
        var subTotal = Math.Round(total / 1.2m, 2); // Reverse calculate from total assuming 20% VAT
        var tax = total - subTotal;

        var invoice = _invoiceFactory.CreateDraft(
            invoiceNumber: $"INV-{Guid.NewGuid():N}"[..12],
            customerId: customer.Id,
            billingAddress: billingAddress,
            shippingAddress: shippingAddress,
            currencyCode: "GBP",
            subTotal: subTotal,
            tax: tax,
            total: total);

        _dbContext.Invoices.Add(invoice);
        return invoice;
    }

    /// <summary>
    /// Creates a test Address using AddressFactory
    /// </summary>
    public Address CreateTestAddress(
        string? email = null,
        string countryCode = "GB",
        string firstName = "Test",
        string lastName = "User")
    {
        return _addressFactory.CreateFromFormData(
            firstName: firstName,
            lastName: lastName,
            address1: "123 Test Street",
            address2: null,
            city: "London",
            postalCode: "SW1A 1AA",
            countryCode: countryCode,
            phone: null,
            email: email);
    }

    /// <summary>
    /// Creates a Payment for an invoice using PaymentFactory
    /// </summary>
    public Payment CreatePayment(
        Invoice invoice,
        decimal? amount = null,
        string currencyCode = "GBP",
        string paymentMethod = "Bank Transfer",
        string? description = null)
    {
        var payment = _paymentFactory.CreateManualPayment(
            invoiceId: invoice.Id,
            amount: amount ?? invoice.Total,
            currencyCode: currencyCode,
            storeCurrencyCode: invoice.StoreCurrencyCode ?? "GBP",
            pricingExchangeRate: null,
            paymentMethod: paymentMethod,
            description: description);

        payment.Invoice = invoice;
        _dbContext.Payments.Add(payment);
        invoice.Payments ??= [];
        invoice.Payments.Add(payment);
        return payment;
    }

    /// <summary>
    /// Creates a Shipment for an order using ShipmentFactory
    /// </summary>
    public Shipment CreateShipment(
        Order order,
        Warehouse? warehouse = null,
        string? trackingNumber = null,
        string? carrier = null)
    {
        warehouse ??= CreateWarehouse();
        var shippingAddress = order.Invoice?.ShippingAddress ?? CreateTestAddress();

        var shipment = _shipmentFactory.Create(
            order: order,
            warehouseId: warehouse.Id,
            shippingAddress: shippingAddress,
            trackingNumber: trackingNumber,
            carrier: carrier ?? "Test Carrier");

        shipment.Warehouse = warehouse;
        _dbContext.Shipments.Add(shipment);
        order.Shipments ??= [];
        order.Shipments.Add(shipment);
        return shipment;
    }

    /// <summary>
    /// Creates a complete invoice structure with orders and line items using factories
    /// </summary>
    public Invoice CreateInvoiceWithOrders(
        int orderCount = 1,
        int lineItemsPerOrder = 2,
        decimal itemPrice = 10m,
        Customer? customer = null)
    {
        var warehouse = CreateWarehouse();
        var shippingOption = CreateShippingOption(warehouse: warehouse);
        customer ??= CreateCustomer();

        var subTotal = orderCount * lineItemsPerOrder * itemPrice;
        var tax = subTotal * 0.2m;
        var total = subTotal + tax;

        // Use factory-based CreateInvoice (which uses InvoiceFactory)
        var invoice = CreateInvoice(customer.Email, total, customer);

        for (var i = 0; i < orderCount; i++)
        {
            // Use factory-based CreateOrder (which uses OrderFactory)
            var order = CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);

            for (var j = 0; j < lineItemsPerOrder; j++)
            {
                CreateLineItem(
                    order,
                    name: $"Test Item {i + 1}-{j + 1}",
                    amount: itemPrice,
                    quantity: 1,
                    taxRate: 20m);
            }
        }

        return invoice;
    }

    /// <summary>
    /// Creates a LineItem for an order using LineItemFactory when a product is provided
    /// </summary>
    public LineItem CreateLineItem(
        Order order,
        Product? product = null,
        string name = "Test Item",
        int quantity = 1,
        decimal amount = 10m,
        decimal cost = 0m,
        bool isTaxable = true,
        decimal taxRate = 20m,
        LineItemType lineItemType = LineItemType.Product,
        string? dependantLineItemSku = null,
        Dictionary<string, object>? extendedData = null)
    {
        LineItem lineItem;

        if (product != null)
        {
            // Use factory when product is provided
            lineItem = _lineItemFactory.CreateFromProduct(product, quantity);
            // Override any test-specific values
            if (amount != 10m) lineItem.Amount = amount;
            if (cost != 0m) lineItem.Cost = cost;
        }
        else
        {
            // For test-only line items without a product (synthetic test data)
            lineItem = new LineItem
            {
                ProductId = null,
                Name = name,
                Quantity = quantity,
                Amount = amount,
                Cost = cost,
                Sku = $"LINE-{Guid.NewGuid():N}"[..12],
                LineItemType = lineItemType,
                IsTaxable = isTaxable,
                TaxRate = taxRate,
                DependantLineItemSku = dependantLineItemSku,
                ExtendedData = extendedData ?? []
            };
        }

        lineItem.OrderId = order.Id;
        lineItem.Order = order;

        _dbContext.LineItems.Add(lineItem);
        order.LineItems ??= [];
        order.LineItems.Add(lineItem);
        return lineItem;
    }

    /// <summary>
    /// Creates an add-on LineItem for an order (linked to a parent product)
    /// </summary>
    public LineItem CreateAddonLineItem(
        Order order,
        LineItem parentLineItem,
        string name = "Add-on Item",
        int quantity = 1,
        decimal amount = 5m,
        decimal cost = 2m,
        bool isTaxable = true,
        decimal taxRate = 20m)
    {
        var extendedData = new Dictionary<string, object>
        {
            ["CostAdjustment"] = cost
        };

        var lineItem = new LineItem
        {
            OrderId = order.Id,
            Order = order,
            ProductId = null,
            Name = name,
            Quantity = quantity,
            Amount = amount,
            Cost = cost,
            Sku = $"ADDON-{Guid.NewGuid():N}"[..12],
            LineItemType = LineItemType.Addon,
            IsTaxable = isTaxable,
            TaxRate = taxRate,
            DependantLineItemSku = parentLineItem.Sku,
            ExtendedData = extendedData
        };

        _dbContext.LineItems.Add(lineItem);
        order.LineItems ??= [];
        order.LineItems.Add(lineItem);
        return lineItem;
    }

    /// <summary>
    /// Creates a discount LineItem linked to a product line item
    /// </summary>
    public LineItem CreateDiscountLineItem(
        Order order,
        LineItem parentLineItem,
        decimal discountAmount,
        DiscountValueType discountValueType = DiscountValueType.FixedAmount,
        decimal? discountValue = null,
        string? reason = null,
        bool visibleToCustomer = false,
        bool applyAfterTax = false)
    {
        var extendedData = new Dictionary<string, object>
        {
            [Constants.ExtendedDataKeys.DiscountValueType] = discountValueType.ToString(),
            [Constants.ExtendedDataKeys.DiscountValue] = discountValue ?? discountAmount,
            [Constants.ExtendedDataKeys.VisibleToCustomer] = visibleToCustomer
        };

        if (applyAfterTax)
        {
            extendedData[Constants.ExtendedDataKeys.ApplyAfterTax] = true;
        }

        var discountLineItem = new LineItem
        {
            OrderId = order.Id,
            Order = order,
            Name = reason ?? "Discount",
            Sku = $"DISCOUNT-{Guid.NewGuid():N}"[..12],
            Quantity = 1,
            Amount = -Math.Abs(discountAmount), // Store as negative
            LineItemType = LineItemType.Discount,
            DependantLineItemSku = parentLineItem.Sku,
            IsTaxable = false,
            TaxRate = 0,
            ExtendedData = extendedData
        };

        _dbContext.LineItems.Add(discountLineItem);
        order.LineItems ??= [];
        order.LineItems.Add(discountLineItem);
        return discountLineItem;
    }

    /// <summary>
    /// Creates an order-level (unlinked) discount LineItem
    /// </summary>
    public LineItem CreateOrderLevelDiscount(
        Order order,
        decimal discountAmount,
        DiscountValueType discountValueType = DiscountValueType.FixedAmount,
        decimal? discountValue = null,
        string? name = null,
        bool visibleToCustomer = false,
        bool applyAfterTax = false)
    {
        var extendedData = new Dictionary<string, object>
        {
            [Constants.ExtendedDataKeys.DiscountValueType] = discountValueType.ToString(),
            [Constants.ExtendedDataKeys.DiscountValue] = discountValue ?? discountAmount,
            [Constants.ExtendedDataKeys.VisibleToCustomer] = visibleToCustomer
        };

        if (applyAfterTax)
        {
            extendedData[Constants.ExtendedDataKeys.ApplyAfterTax] = true;
        }

        var discountLineItem = new LineItem
        {
            OrderId = order.Id,
            Order = order,
            Name = name ?? "Order Discount",
            Sku = $"COUPON-{Guid.NewGuid():N}"[..12],
            Quantity = 1,
            Amount = -Math.Abs(discountAmount), // Store as negative
            LineItemType = LineItemType.Discount,
            DependantLineItemSku = null, // Not linked to any specific product
            IsTaxable = false,
            TaxRate = 0,
            ExtendedData = extendedData
        };

        _dbContext.LineItems.Add(discountLineItem);
        order.LineItems ??= [];
        order.LineItems.Add(discountLineItem);
        return discountLineItem;
    }

    #region Customer Segments

    /// <summary>
    /// Creates a manual CustomerSegment using CustomerSegmentFactory
    /// </summary>
    public CustomerSegment CreateCustomerSegment(
        string name = "Test Segment",
        string? description = null,
        bool isActive = true,
        bool isSystemSegment = false)
    {
        var segment = _customerSegmentFactory.Create(new CreateSegmentParameters
        {
            Name = name,
            Description = description,
            SegmentType = CustomerSegmentType.Manual,
            MatchMode = SegmentMatchMode.All,
            IsSystemSegment = isSystemSegment
        });
        segment.IsActive = isActive;

        _dbContext.CustomerSegments.Add(segment);
        return segment;
    }

    /// <summary>
    /// Creates an automated CustomerSegment with criteria using CustomerSegmentFactory
    /// </summary>
    public CustomerSegment CreateAutomatedSegment(
        string name,
        List<SegmentCriteria> criteria,
        SegmentMatchMode matchMode = SegmentMatchMode.All,
        string? description = null,
        bool isActive = true)
    {
        var segment = _customerSegmentFactory.Create(new CreateSegmentParameters
        {
            Name = name,
            Description = description,
            SegmentType = CustomerSegmentType.Automated,
            Criteria = criteria,
            MatchMode = matchMode,
            IsSystemSegment = false
        });
        segment.IsActive = isActive;

        _dbContext.CustomerSegments.Add(segment);
        return segment;
    }

    /// <summary>
    /// Adds a customer to a manual segment using CustomerSegmentFactory
    /// </summary>
    public CustomerSegmentMember AddCustomerToSegment(
        CustomerSegment segment,
        Customer customer,
        string? notes = null,
        Guid? addedBy = null)
    {
        var member = _customerSegmentFactory.CreateMember(
            segmentId: segment.Id,
            customerId: customer.Id,
            addedBy: addedBy,
            notes: notes);

        _dbContext.CustomerSegmentMembers.Add(member);
        segment.Members.Add(member);
        return member;
    }

    /// <summary>
    /// Creates a customer with order history for segment testing
    /// </summary>
    public Customer CreateCustomerWithOrders(
        string email,
        int orderCount,
        decimal totalSpend,
        string? firstName = null,
        string? lastName = null,
        List<string>? tags = null)
    {
        var customer = CreateCustomer(email, firstName ?? "Test", lastName ?? "Customer");
        if (tags != null)
        {
            customer.SetTags(tags);
        }

        // Create invoices with orders to build order history
        var amountPerOrder = totalSpend / orderCount;
        for (var i = 0; i < orderCount; i++)
        {
            var invoice = CreateInvoice(email, amountPerOrder, customer);
            invoice.DateCreated = DateTime.UtcNow.AddDays(-i * 30); // Spread orders over time
        }

        return customer;
    }

    #endregion

    #region Fulfilment

    /// <summary>
    /// Creates a FulfilmentProviderConfiguration for testing
    /// </summary>
    public Merchello.Core.Fulfilment.Models.FulfilmentProviderConfiguration CreateFulfilmentProviderConfiguration(
        string providerKey = "test-fulfilment",
        string displayName = "Test Provider",
        bool isEnabled = true,
        Merchello.Core.Fulfilment.Models.InventorySyncMode inventorySyncMode = Merchello.Core.Fulfilment.Models.InventorySyncMode.Full,
        string? settingsJson = null)
    {
        var config = new Merchello.Core.Fulfilment.Models.FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = providerKey,
            DisplayName = displayName,
            IsEnabled = isEnabled,
            InventorySyncMode = inventorySyncMode,
            SettingsJson = settingsJson ?? """{"apiKey":"test-key","sandbox":"true"}""",
            SortOrder = 0,
            CreateDate = DateTime.UtcNow,
            UpdateDate = DateTime.UtcNow
        };

        _dbContext.ProviderConfigurations.Add(config);
        return config;
    }

    /// <summary>
    /// Assigns a fulfilment provider to a warehouse
    /// </summary>
    public void AssignFulfilmentProviderToWarehouse(
        Warehouse warehouse,
        Merchello.Core.Fulfilment.Models.FulfilmentProviderConfiguration config)
    {
        warehouse.FulfilmentProviderConfigurationId = config.Id;
        warehouse.FulfilmentProviderConfiguration = config;
    }

    /// <summary>
    /// Assigns a default fulfilment provider to a supplier
    /// </summary>
    public void AssignDefaultFulfilmentProviderToSupplier(
        Supplier supplier,
        Merchello.Core.Fulfilment.Models.FulfilmentProviderConfiguration config)
    {
        supplier.DefaultFulfilmentProviderConfigurationId = config.Id;
        supplier.DefaultFulfilmentProviderConfiguration = config;
    }

    /// <summary>
    /// Creates an order that has been submitted to fulfilment
    /// </summary>
    public Order CreateSubmittedFulfilmentOrder(
        Invoice? invoice = null,
        Warehouse? warehouse = null,
        Merchello.Core.Fulfilment.Models.FulfilmentProviderConfiguration? providerConfig = null,
        string? providerReference = null)
    {
        invoice ??= CreateInvoice();
        warehouse ??= CreateWarehouse();
        providerConfig ??= CreateFulfilmentProviderConfiguration();

        var shippingOption = CreateShippingOption(warehouse: warehouse);
        var order = CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Processing);

        order.FulfilmentProviderConfigurationId = providerConfig.Id;
        order.FulfilmentProviderConfiguration = providerConfig;
        order.FulfilmentProviderReference = providerReference ?? $"TEST-{Guid.NewGuid():N}"[..12].ToUpperInvariant();
        order.FulfilmentSubmittedAt = DateTime.UtcNow;

        return order;
    }

    /// <summary>
    /// Creates a FulfilmentSyncLog entry
    /// </summary>
    public Merchello.Core.Fulfilment.Models.FulfilmentSyncLog CreateFulfilmentSyncLog(
        Merchello.Core.Fulfilment.Models.FulfilmentProviderConfiguration config,
        Merchello.Core.Fulfilment.Models.FulfilmentSyncType syncType = Merchello.Core.Fulfilment.Models.FulfilmentSyncType.ProductsOut,
        Merchello.Core.Fulfilment.Models.FulfilmentSyncStatus status = Merchello.Core.Fulfilment.Models.FulfilmentSyncStatus.Completed,
        int itemsProcessed = 10,
        int itemsSucceeded = 10,
        int itemsFailed = 0,
        string? errorMessage = null)
    {
        var log = new Merchello.Core.Fulfilment.Models.FulfilmentSyncLog
        {
            Id = Guid.NewGuid(),
            ProviderConfigurationId = config.Id,
            ProviderConfiguration = config,
            SyncType = syncType,
            Status = status,
            ItemsProcessed = itemsProcessed,
            ItemsSucceeded = itemsSucceeded,
            ItemsFailed = itemsFailed,
            ErrorMessage = errorMessage,
            StartedAt = DateTime.UtcNow.AddMinutes(-5),
            CompletedAt = DateTime.UtcNow
        };

        _dbContext.FulfilmentSyncLogs.Add(log);
        return log;
    }

    #endregion

    #region Saved Payment Methods

    /// <summary>
    /// Creates a SavedPaymentMethod for a customer
    /// </summary>
    public SavedPaymentMethod CreateSavedPaymentMethod(
        Customer customer,
        string providerAlias = "stripe",
        string? providerMethodId = null,
        string? providerCustomerId = "cus_test",
        SavedPaymentMethodType methodType = SavedPaymentMethodType.Card,
        string? cardBrand = "visa",
        string? last4 = "4242",
        int? expiryMonth = 12,
        int? expiryYear = 2026,
        string displayLabel = "Visa ending in 4242",
        bool isDefault = false,
        bool isVerified = true)
    {
        var resolvedProviderMethodId = string.IsNullOrWhiteSpace(providerMethodId)
            ? $"pm_{Guid.NewGuid():N}"
            : providerMethodId;

        var savedMethod = new SavedPaymentMethod
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Customer = customer,
            ProviderAlias = providerAlias,
            ProviderMethodId = resolvedProviderMethodId,
            ProviderCustomerId = providerCustomerId,
            MethodType = methodType,
            CardBrand = cardBrand,
            Last4 = last4,
            ExpiryMonth = expiryMonth,
            ExpiryYear = expiryYear,
            DisplayLabel = displayLabel,
            IsDefault = isDefault,
            IsVerified = isVerified,
            ConsentDateUtc = DateTime.UtcNow,
            ConsentIpAddress = "127.0.0.1",
            DateCreated = DateTime.UtcNow,
            DateUpdated = DateTime.UtcNow
        };

        _dbContext.SavedPaymentMethods.Add(savedMethod);
        customer.SavedPaymentMethods ??= [];
        customer.SavedPaymentMethods.Add(savedMethod);
        return savedMethod;
    }

    #endregion

    /// <summary>
    /// Persists all pending changes to the database
    /// </summary>
    public async Task SaveChangesAsync()
    {
        await _dbContext.SaveChangesAsync();
    }

    /// <summary>
    /// Persists all pending changes to the database (synchronous)
    /// </summary>
    public void SaveChanges()
    {
        _dbContext.SaveChanges();
    }
}
