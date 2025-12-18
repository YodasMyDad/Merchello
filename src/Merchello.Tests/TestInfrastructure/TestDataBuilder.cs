using Merchello.Core;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Customers.Models;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Suppliers.Factories;
using Merchello.Core.Suppliers.Models;
using Merchello.Core.Warehouses.Factories;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Fluent builder for creating test data with sensible defaults.
/// Automatically tracks entities in DbContext for persistence.
/// </summary>
public class TestDataBuilder(MerchelloDbContext dbContext)
{
    private readonly SupplierFactory _supplierFactory = new();
    private readonly WarehouseFactory _warehouseFactory = new();
    private readonly TaxGroupFactory _taxGroupFactory = new();
    private readonly ProductTypeFactory _productTypeFactory = new();

    /// <summary>
    /// Creates a Supplier with the specified name
    /// </summary>
    public Supplier CreateSupplier(string name = "Test Supplier", string? code = null)
    {
        var supplier = _supplierFactory.Create(name);
        supplier.Id = Guid.NewGuid(); // Pre-generate ID for FK relationships
        supplier.Code = code;
        dbContext.Suppliers.Add(supplier);
        return supplier;
    }

    /// <summary>
    /// Creates a TaxGroup with the specified name and percentage
    /// </summary>
    public TaxGroup CreateTaxGroup(string name = "Standard VAT", decimal percentage = 20m)
    {
        var taxGroup = _taxGroupFactory.Create(name, percentage);
        taxGroup.Id = Guid.NewGuid(); // Pre-generate ID for FK relationships
        dbContext.TaxGroups.Add(taxGroup);
        return taxGroup;
    }

    /// <summary>
    /// Creates a ProductType with the specified name and alias
    /// </summary>
    public ProductType CreateProductType(string name = "Test Type", string alias = "test")
    {
        var productType = _productTypeFactory.Create(name, alias);
        productType.Id = Guid.NewGuid(); // Pre-generate ID for FK relationships
        dbContext.ProductTypes.Add(productType);
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

        dbContext.Warehouses.Add(warehouse);
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

        dbContext.RootProducts.Add(productRoot);
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

        dbContext.Products.Add(product);
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

        dbContext.ShippingOptions.Add(shippingOption);
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

        dbContext.ProductRootWarehouses.Add(association);
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
            ReorderQuantity = reorderQuantity
        };

        dbContext.ProductWarehouses.Add(productWarehouse);
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
            WarehouseId = warehouse.Id,
            CountryCode = countryCode,
            StateOrProvinceCode = stateOrProvinceCode,
            IsExcluded = isExcluded
        };

        dbContext.WarehouseServiceRegions.Add(region);
        warehouse.ServiceRegions.Add(region);
        return region;
    }

    /// <summary>
    /// Creates a ProductCategory
    /// </summary>
    public ProductCategory CreateProductCategory(string name = "Test Category")
    {
        var category = new ProductCategory
        {
            Name = name,
            
        };

        dbContext.ProductCategories.Add(category);
        return category;
    }

    /// <summary>
    /// Creates an Order with the specified status and warehouse
    /// </summary>
    public Order CreateOrder(
        Invoice? invoice = null,
        Warehouse? warehouse = null,
        OrderStatus status = OrderStatus.Pending)
    {
        invoice ??= CreateInvoice();
        warehouse ??= CreateWarehouse();

        var order = new Order
        {
            Id = Guid.NewGuid(), // Pre-generate ID for FK relationships
            InvoiceId = invoice.Id,
            Invoice = invoice,
            WarehouseId = warehouse.Id,
            Status = status
        };

        dbContext.Orders.Add(order);
        invoice.Orders ??= [];
        invoice.Orders.Add(order);
        return order;
    }

    /// <summary>
    /// Creates a Customer
    /// </summary>
    public Customer CreateCustomer(
        string email = "test@example.com",
        string? firstName = "Test",
        string? lastName = "Customer")
    {
        var customer = new Customer
        {
            Id = Guid.NewGuid(), // Pre-generate ID for FK relationships
            Email = email.Trim().ToLowerInvariant(),
            FirstName = firstName,
            LastName = lastName,
            DateCreated = DateTime.UtcNow,
            DateUpdated = DateTime.UtcNow
        };

        dbContext.Customers.Add(customer);
        return customer;
    }

    /// <summary>
    /// Creates an Invoice (auto-creates a Customer if not provided)
    /// </summary>
    public Invoice CreateInvoice(
        string? customerEmail = "test@example.com",
        decimal total = 100m,
        Customer? customer = null)
    {
        customer ??= CreateCustomer(customerEmail ?? "test@example.com");

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(), // Pre-generate ID for FK relationships
            CustomerId = customer.Id,
            BillingAddress = new Address { Email = customerEmail },
            Total = total,
            SubTotal = total * 0.8m,
            Tax = total * 0.2m
        };

        dbContext.Invoices.Add(invoice);
        return invoice;
    }

    /// <summary>
    /// Creates a LineItem for an order
    /// </summary>
    public LineItem CreateLineItem(
        Order order,
        Product? product = null,
        string name = "Test Item",
        int quantity = 1,
        decimal amount = 10m,
        bool isTaxable = true,
        decimal taxRate = 20m)
    {
        var lineItem = new LineItem
        {
            OrderId = order.Id,
            Order = order,
            ProductId = product?.Id,
            Name = name,
            Quantity = quantity,
            Amount = amount,
            Sku = product?.Sku ?? $"LINE-{Guid.NewGuid():N}"[..12],
            LineItemType = LineItemType.Product,
            IsTaxable = isTaxable,
            TaxRate = taxRate
        };

        dbContext.LineItems.Add(lineItem);
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
        bool visibleToCustomer = false)
    {
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
            ExtendedData = new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.DiscountValueType] = discountValueType.ToString(),
                [Constants.ExtendedDataKeys.DiscountValue] = discountValue ?? discountAmount,
                [Constants.ExtendedDataKeys.VisibleToCustomer] = visibleToCustomer
            }
        };

        dbContext.LineItems.Add(discountLineItem);
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
        bool visibleToCustomer = false)
    {
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
            ExtendedData = new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.DiscountValueType] = discountValueType.ToString(),
                [Constants.ExtendedDataKeys.DiscountValue] = discountValue ?? discountAmount,
                [Constants.ExtendedDataKeys.VisibleToCustomer] = visibleToCustomer
            }
        };

        dbContext.LineItems.Add(discountLineItem);
        order.LineItems ??= [];
        order.LineItems.Add(discountLineItem);
        return discountLineItem;
    }

    #region Customer Segments

    /// <summary>
    /// Creates a manual CustomerSegment
    /// </summary>
    public CustomerSegment CreateCustomerSegment(
        string name = "Test Segment",
        string? description = null,
        bool isActive = true,
        bool isSystemSegment = false)
    {
        var segment = new CustomerSegment
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = description,
            SegmentType = CustomerSegmentType.Manual,
            IsActive = isActive,
            IsSystemSegment = isSystemSegment,
            MatchMode = SegmentMatchMode.All,
            DateCreated = DateTime.UtcNow,
            DateUpdated = DateTime.UtcNow
        };

        dbContext.CustomerSegments.Add(segment);
        return segment;
    }

    /// <summary>
    /// Creates an automated CustomerSegment with criteria
    /// </summary>
    public CustomerSegment CreateAutomatedSegment(
        string name,
        List<SegmentCriteria> criteria,
        SegmentMatchMode matchMode = SegmentMatchMode.All,
        string? description = null,
        bool isActive = true)
    {
        var segment = new CustomerSegment
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = description,
            SegmentType = CustomerSegmentType.Automated,
            CriteriaJson = System.Text.Json.JsonSerializer.Serialize(criteria),
            MatchMode = matchMode,
            IsActive = isActive,
            IsSystemSegment = false,
            DateCreated = DateTime.UtcNow,
            DateUpdated = DateTime.UtcNow
        };

        dbContext.CustomerSegments.Add(segment);
        return segment;
    }

    /// <summary>
    /// Adds a customer to a manual segment
    /// </summary>
    public CustomerSegmentMember AddCustomerToSegment(
        CustomerSegment segment,
        Customer customer,
        string? notes = null,
        Guid? addedBy = null)
    {
        var member = new CustomerSegmentMember
        {
            Id = Guid.NewGuid(),
            SegmentId = segment.Id,
            CustomerId = customer.Id,
            DateAdded = DateTime.UtcNow,
            AddedBy = addedBy,
            Notes = notes
        };

        dbContext.CustomerSegmentMembers.Add(member);
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
            foreach (var tag in tags)
            {
                var customerTag = new CustomerTag
                {
                    CustomerId = customer.Id,
                    Tag = tag
                };
                customer.CustomerTags.Add(customerTag);
                dbContext.CustomerTags.Add(customerTag);
            }
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

    /// <summary>
    /// Persists all pending changes to the database
    /// </summary>
    public async Task SaveChangesAsync()
    {
        await dbContext.SaveChangesAsync();
    }

    /// <summary>
    /// Persists all pending changes to the database (synchronous)
    /// </summary>
    public void SaveChanges()
    {
        dbContext.SaveChanges();
    }
}
