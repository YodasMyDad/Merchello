using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Discounts.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Products.Extensions;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Suppliers.Models;
using Merchello.Core.Suppliers.Services.Interfaces;
using Merchello.Core.Suppliers.Services.Parameters;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Parameters;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Data;

/// <summary>
/// Consolidated database seeder for development and testing.
/// Seeds products, warehouses, suppliers, and invoices with realistic data.
/// Uses real services to battle-test the order flow - NO direct DbContext usage.
/// </summary>
public class DbSeeder(
    IProductService productService,
    IProductFilterService productFilterService,
    IProductTypeService productTypeService,
    IProductCollectionService productCollectionService,
    IShippingService shippingService,
    IShipmentService shipmentService,
    IInvoiceService invoiceService,
    IPaymentService paymentService,
    ICheckoutService checkoutService,
    ICheckoutDiscountService checkoutDiscountService,
    ICustomerService customerService,
    ICustomerSegmentService customerSegmentService,
    IDiscountService discountService,
    ITaxService taxService,
    ITaxProviderManager taxProviderManager,
    IWarehouseService warehouseService,
    ISupplierService supplierService,
    ILogger<DbSeeder> logger)
{
    /// <summary>
    /// Tracks the UK Domestic Only shipping option ID for country-restricted products.
    /// </summary>
    private Guid _ukOnlyShippingOptionId;

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        // Check if already seeded (via service)
        if (await productService.AnyProductsExistAsync(cancellationToken))
        {
            logger.LogInformation("Merchello seed data: Data already exists, skipping seed");
            return;
        }

        logger.LogInformation("Merchello seed data: Starting comprehensive seed...");

        // 1. Create Tax Group (UK VAT 20%) via service
        var taxGroupResult = await taxService.CreateTaxGroup("UK VAT 20%", 20m, cancellationToken);
        if (!taxGroupResult.Successful || taxGroupResult.ResultObject == null)
        {
            taxGroupResult.LogBadMessages(logger);
            logger.LogWarning("Failed to create tax group, seeding cannot continue");
            return;
        }
        var ukVat = taxGroupResult.ResultObject;
        logger.LogDebug("Created tax group: {Name}", ukVat.Name);

        // 1b. Activate Manual Tax Provider (ensures tax calculations use the provider system)
        await taxProviderManager.SetActiveProviderAsync("manual", cancellationToken);
        logger.LogDebug("Activated manual tax provider");

        // 2. Create Product Types via service
        var productTypes = await CreateProductTypesAsync(cancellationToken);
        logger.LogDebug("Created {Count} product types", productTypes.Count);

        // 3. Create Collections via service
        var collections = await CreateCollectionsAsync(cancellationToken);
        logger.LogDebug("Created {Count} collections", collections.Count);

        // 4. Create Suppliers (UK and US) via service
        var (ukSupplier, usSupplier) = await CreateSuppliersAsync(cancellationToken);
        logger.LogDebug("Created suppliers: {UkName}, {UsName}", ukSupplier.Name, usSupplier.Name);

        // 5. Create Warehouses with shipping options (linked to suppliers) via service
        var warehouses = await CreateWarehousesAsync(ukSupplier, usSupplier, cancellationToken);
        logger.LogDebug("Created {Count} warehouses across UK, EU, and US", warehouses.Length);

        // 6. Create Filter Groups & Filters via service (returns lookups for variant assignment)
        var (colorFilters, sizeFilters) = await CreateFiltersAsync(cancellationToken);
        logger.LogDebug("Created color ({ColorCount}) and size ({SizeCount}) filters", colorFilters.Count, sizeFilters.Count);

        // 7. Create all products with various configurations (via ProductService)
        await CreateProductsAsync(ukVat, productTypes, collections, warehouses, colorFilters, sizeFilters);
        logger.LogInformation("Merchello seed data: Created products");

        // 8. Create customers explicitly (before invoices so we can use them for segments)
        var customers = await CreateCustomersAsync(cancellationToken);
        logger.LogInformation("Merchello seed data: Created {Count} customers", customers.Count);

        // 9. Setup account customers (B2B with payment terms and credit limits)
        var accountCustomers = await SetupAccountCustomersAsync(customers, cancellationToken);
        logger.LogDebug("Configured {Count} customers with account terms", accountCustomers.Count);

        // 10. Create VIP customer segment with first 5 customers
        var vipSegment = await CreateVipSegmentAsync(customers, cancellationToken);
        if (vipSegment != null)
        {
            logger.LogDebug("Created VIP segment '{Name}' with {Count} members", vipSegment.Name, 5);

            // Create VIP exclusive discount using the standard service
            var vipDiscountParams = new CreateDiscountParameters
            {
                Name = "15% VIP Exclusive",
                Description = "Exclusive 15% discount for VIP customers",
                Category = DiscountCategory.AmountOffOrder,
                Method = DiscountMethod.Automatic,
                ValueType = DiscountValueType.Percentage,
                Value = 15m,
                TargetRules =
                [
                    new CreateDiscountTargetRuleParameters
                    {
                        TargetType = DiscountTargetType.AllProducts
                    }
                ],
                EligibilityRules =
                [
                    new CreateDiscountEligibilityRuleParameters
                    {
                        EligibilityType = DiscountEligibilityType.CustomerSegments,
                        EligibilityIds = [vipSegment.Id]
                    }
                ]
            };

            var vipResult = await discountService.CreateAsync(vipDiscountParams, cancellationToken);
            if (vipResult.ResultObject != null)
            {
                await discountService.ActivateAsync(vipResult.ResultObject.Id, cancellationToken);
                logger.LogDebug("Created VIP segment discount: {Name}", vipResult.ResultObject.Name);
            }
            else
            {
                vipResult.LogBadMessages(logger);
                logger.LogWarning("Failed to create VIP segment discount");
            }
        }

        // 11. Create automatic discounts (10% off T-Shirts)
        await CreateAutomaticDiscountsAsync(productTypes, cancellationToken);
        logger.LogDebug("Created automatic discounts");

        // 12. Load products with TaxGroup for proper line item creation (via service)
        var products = await productService.GetAllProductsWithTaxGroupAsync(cancellationToken);

        // 13. Seed explicit multi-warehouse test invoices FIRST to guarantee stock availability
        await SeedMultiWarehouseTestInvoicesAsync(products, cancellationToken);

        // 14. Seed random invoices (148 instead of 150 to leave room for explicit test cases)
        // Discounts will be auto-applied during invoice creation
        await SeedInvoicesViaServicesAsync(products, 148, cancellationToken);

        // 15. Seed invoices for account customers (tests Outstanding UI with varied due dates)
        await SeedAccountCustomerInvoicesAsync(products, accountCustomers, cancellationToken);

        // 16. Create "High Spenders" automated segment (after invoices so customers have order history)
        await CreateHighSpendersSegmentAsync(cancellationToken);
        logger.LogDebug("Created High Spenders automated segment");

        // 17. Get counts via services for final log
        var invoiceCount = await invoiceService.GetInvoiceCountAsync(cancellationToken);
        var productCount = await productService.GetProductCountAsync(cancellationToken);
        var customerCount = await customerService.GetCountAsync(cancellationToken);
        logger.LogInformation("Merchello seed data: Completed - {ProductCount} products, {CustomerCount} customers, {InvoiceCount} invoices",
            productCount, customerCount, invoiceCount);
    }

    private async Task<Dictionary<string, ProductType>> CreateProductTypesAsync(CancellationToken cancellationToken)
    {
        var typeNames = new[]
        {
            ("tshirt", "T-Shirt"),
            ("hoodie", "Hoodie"),
            ("polo", "Polo Shirt"),
            ("jacket", "Jacket"),
            ("cap", "Cap/Hat"),
            ("bag", "Bag"),
            ("mug", "Mug"),
            ("accessories", "Accessories"),
            ("digital", "Digital Product")
        };

        Dictionary<string, ProductType> types = [];
        foreach (var (alias, name) in typeNames)
        {
            try
            {
                var result = await productTypeService.CreateProductType(name, cancellationToken);
                if (result.ResultObject != null)
                {
                    types[alias] = result.ResultObject;
                }
                else
                {
                    result.LogBadMessages(logger);
                    logger.LogWarning("Failed to create product type: {Name}", name);
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to create product type: {Name}", name);
            }
        }

        return types;
    }

    private async Task<Dictionary<string, ProductCollection>> CreateCollectionsAsync(CancellationToken cancellationToken)
    {
        var collectionNames = new[]
        {
            ("clothing", "Clothing"),
            ("tshirts", "T-Shirts"),
            ("hoodies", "Hoodies & Sweatshirts"),
            ("polos", "Polo Shirts"),
            ("jackets", "Jackets & Outerwear"),
            ("headwear", "Headwear"),
            ("bags", "Bags & Totes"),
            ("drinkware", "Drinkware"),
            ("accessories", "Accessories"),
            ("digital", "Digital Products")
        };

        Dictionary<string, ProductCollection> collections = [];
        foreach (var (alias, name) in collectionNames)
        {
            try
            {
                var result = await productCollectionService.CreateProductCollection(name, cancellationToken);
                if (result.ResultObject != null)
                {
                    collections[alias] = result.ResultObject;
                }
                else
                {
                    result.LogBadMessages(logger);
                    logger.LogWarning("Failed to create collection: {Name}", name);
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to create collection: {Name}", name);
            }
        }

        return collections;
    }

    private async Task<(Supplier ukSupplier, Supplier usSupplier)> CreateSuppliersAsync(CancellationToken cancellationToken)
    {
        var ukResult = await supplierService.CreateSupplierAsync(new CreateSupplierParameters
        {
            Name = "Merchello UK Ltd",
            Code = "MERCH-UK",
            ContactName = "UK Sales Team",
            ContactEmail = "uk-sales@merchello-demo.com",
            ContactPhone = "+44 20 1234 5678",
            Address = new Address
            {
                Company = "Merchello UK Ltd",
                AddressOne = "100 Commerce Way",
                TownCity = "London",
                CountyState = new CountyState { Name = "Greater London", RegionCode = "LND" },
                PostalCode = "EC1A 1BB",
                Country = "United Kingdom",
                CountryCode = "GB"
            }
        }, cancellationToken);

        var usResult = await supplierService.CreateSupplierAsync(new CreateSupplierParameters
        {
            Name = "Merchello US Inc",
            Code = "MERCH-US",
            ContactName = "US Sales Team",
            ContactEmail = "us-sales@merchello-demo.com",
            ContactPhone = "+1 201 555 0100",
            Address = new Address
            {
                Company = "Merchello US Inc",
                AddressOne = "500 Distribution Blvd",
                TownCity = "Newark",
                CountyState = new CountyState { Name = "New Jersey", RegionCode = "NJ" },
                PostalCode = "07102",
                Country = "United States",
                CountryCode = "US"
            }
        }, cancellationToken);

        if (!ukResult.Successful || ukResult.ResultObject == null)
        {
            ukResult.LogBadMessages(logger);
            throw new InvalidOperationException("Failed to create UK supplier - seeding cannot continue");
        }

        if (!usResult.Successful || usResult.ResultObject == null)
        {
            usResult.LogBadMessages(logger);
            throw new InvalidOperationException("Failed to create US supplier - seeding cannot continue");
        }

        return (ukResult.ResultObject, usResult.ResultObject);
    }

    private async Task<Warehouse[]> CreateWarehousesAsync(Supplier ukSupplier, Supplier usSupplier, CancellationToken cancellationToken)
    {
        // UK Fulfillment Center - serves UK, Ireland, and major EU countries
        var ukWarehouseResult = await warehouseService.CreateWarehouse(new CreateWarehouseParameters
        {
            Name = "UK Fulfillment Center",
            Code = "UK-FC-01",
            SupplierId = ukSupplier.Id,
            Address = new Address
            {
                AddressOne = "Unit 5, Commerce Park",
                TownCity = "London",
                CountyState = new CountyState { Name = "Greater London", RegionCode = "LND" },
                PostalCode = "E14 9TS",
                Country = "United Kingdom",
                CountryCode = "GB"
            },
            ServiceRegions =
            [
                // UK (excluding Northern Ireland for simplicity)
                ("GB", null, false),
                ("GB", "NIR", true), // Exclude Northern Ireland
                // Ireland
                ("IE", null, false),
                // Major EU countries
                ("FR", null, false),
                ("DE", null, false),
                ("ES", null, false),
                ("IT", null, false),
                ("NL", null, false),
                ("BE", null, false),
                ("AT", null, false),
                ("PT", null, false),
                ("SE", null, false),
                ("DK", null, false),
                ("NO", null, false),
                ("CH", null, false)
            ],
            ShippingOptions =
            [
                // FREE UK shipping (threshold-based - UI handles eligibility, cost=0 signals free)
                new ShippingOptionConfig { Name = "Free UK Standard (Orders £50+)", DaysFrom = 5, DaysTo = 7, Cost = 0m },

                // Royal Mail branded options
                new ShippingOptionConfig { Name = "Royal Mail 2nd Class", DaysFrom = 3, DaysTo = 5, Cost = 3.49m },
                new ShippingOptionConfig { Name = "Royal Mail 1st Class", DaysFrom = 1, DaysTo = 2, Cost = 4.99m },
                new ShippingOptionConfig { Name = "Royal Mail Signed For", DaysFrom = 1, DaysTo = 2, Cost = 5.99m },
                new ShippingOptionConfig { Name = "Royal Mail Special Delivery", DaysFrom = 1, DaysTo = 1, Cost = 9.99m, IsNextDay = true },

                // UK-ONLY option (for country-restricted products)
                new ShippingOptionConfig { Name = "UK Domestic Only", DaysFrom = 2, DaysTo = 4, Cost = 4.49m },

                // International from UK warehouse
                new ShippingOptionConfig { Name = "Royal Mail International Tracked", DaysFrom = 7, DaysTo = 14, Cost = 14.99m }
            ]
        }, cancellationToken);

        // Capture UK-only shipping option ID for country-restricted products
        if (!ukWarehouseResult.Successful || ukWarehouseResult.ResultObject == null)
        {
            ukWarehouseResult.LogBadMessages(logger);
            throw new InvalidOperationException("Failed to create UK warehouse - seeding cannot continue");
        }
        var ukWarehouse = ukWarehouseResult.ResultObject;
        _ukOnlyShippingOptionId = ukWarehouse.ShippingOptions?
            .FirstOrDefault(so => so.Name == "UK Domestic Only")?.Id ?? Guid.Empty;

        // EU Distribution Hub - serves continental Europe
        var euWarehouseResult = await warehouseService.CreateWarehouse(new CreateWarehouseParameters
        {
            Name = "EU Distribution Hub",
            Code = "EU-FC-01",
            SupplierId = ukSupplier.Id, // Same supplier manages EU operations
            Address = new Address
            {
                AddressOne = "Distributieweg 100",
                TownCity = "Amsterdam",
                CountyState = new CountyState { Name = "North Holland", RegionCode = "NH" },
                PostalCode = "1046 BB",
                Country = "Netherlands",
                CountryCode = "NL"
            },
            ServiceRegions =
            [
                // Core EU countries
                ("DE", null, false),
                ("FR", null, false),
                ("NL", null, false),
                ("BE", null, false),
                ("AT", null, false),
                ("ES", null, false),
                ("IT", null, false),
                ("PT", null, false),
                ("CH", null, false),
                ("NO", null, false),
                ("SE", null, false),
                ("DK", null, false),
                ("PL", null, false),
                ("FI", null, false),
                ("CZ", null, false),
                ("GR", null, false)
            ],
            ShippingOptions =
            [
                // DHL branded options for EU
                new ShippingOptionConfig { Name = "DHL Standard EU", DaysFrom = 3, DaysTo = 5, Cost = 5.99m },
                new ShippingOptionConfig { Name = "DHL Express EU", DaysFrom = 1, DaysTo = 2, Cost = 12.99m },
                new ShippingOptionConfig { Name = "DHL Express Next Day EU", DaysFrom = 1, DaysTo = 1, Cost = 18.99m, IsNextDay = true },

                // DPD options
                new ShippingOptionConfig { Name = "DPD Classic", DaysFrom = 4, DaysTo = 6, Cost = 4.99m },
                new ShippingOptionConfig { Name = "DPD Predict", DaysFrom = 2, DaysTo = 3, Cost = 7.99m },

                // Economy option
                new ShippingOptionConfig { Name = "PostNL Economy", DaysFrom = 7, DaysTo = 10, Cost = 3.49m }
            ]
        }, cancellationToken);

        // US East Coast - serves all US states and Canada
        var usEastWarehouseResult = await warehouseService.CreateWarehouse(new CreateWarehouseParameters
        {
            Name = "US East Coast",
            Code = "US-FC-01",
            SupplierId = usSupplier.Id,
            Address = new Address
            {
                AddressOne = "1200 Distribution Drive",
                TownCity = "Newark",
                CountyState = new CountyState { Name = "New Jersey", RegionCode = "NJ" },
                PostalCode = "07102",
                Country = "United States",
                CountryCode = "US"
            },
            ServiceRegions =
            [
                // All US states (using country-level)
                ("US", null, false),
                // Canada
                ("CA", null, false),
                // International - UK (fallback for US-only products)
                ("GB", null, false)
            ],
            ShippingOptions =
            [
                // FREE US shipping (threshold-based)
                new ShippingOptionConfig { Name = "Free US Standard (Orders $75+)", DaysFrom = 5, DaysTo = 8, Cost = 0m },

                // USPS branded options
                new ShippingOptionConfig { Name = "USPS Ground Advantage", DaysFrom = 5, DaysTo = 7, Cost = 5.99m },
                new ShippingOptionConfig { Name = "USPS Priority Mail", DaysFrom = 2, DaysTo = 3, Cost = 9.99m },
                new ShippingOptionConfig { Name = "USPS Priority Express", DaysFrom = 1, DaysTo = 2, Cost = 26.99m },

                // UPS branded options
                new ShippingOptionConfig { Name = "UPS Ground (East)", DaysFrom = 4, DaysTo = 6, Cost = 7.99m },
                new ShippingOptionConfig { Name = "UPS 3 Day Select", DaysFrom = 3, DaysTo = 3, Cost = 14.99m },
                new ShippingOptionConfig { Name = "UPS Next Day Air (East)", DaysFrom = 1, DaysTo = 1, Cost = 34.99m, IsNextDay = true },

                // FedEx options
                new ShippingOptionConfig { Name = "FedEx Ground", DaysFrom = 5, DaysTo = 7, Cost = 8.99m, ProviderKey = "fedex", ServiceType = "FEDEX_GROUND" },
                new ShippingOptionConfig { Name = "FedEx 2Day", DaysFrom = 2, DaysTo = 2, Cost = 15.99m, ProviderKey = "fedex", ServiceType = "FEDEX_2_DAY" },
                new ShippingOptionConfig { Name = "FedEx Priority Overnight", DaysFrom = 1, DaysTo = 1, Cost = 29.99m, ProviderKey = "fedex", ServiceType = "PRIORITY_OVERNIGHT", IsNextDay = true },

                // International from US East
                new ShippingOptionConfig { Name = "USPS Priority Intl (East)", DaysFrom = 10, DaysTo = 14, Cost = 24.99m }
            ]
        }, cancellationToken);

        // US West Coast - serves western US states, Canada, and Mexico
        var usWestWarehouseResult = await warehouseService.CreateWarehouse(new CreateWarehouseParameters
        {
            Name = "US West Coast",
            Code = "US-FC-02",
            SupplierId = usSupplier.Id,
            Address = new Address
            {
                AddressOne = "8800 Logistics Blvd",
                TownCity = "Los Angeles",
                CountyState = new CountyState { Name = "California", RegionCode = "CA" },
                PostalCode = "90001",
                Country = "United States",
                CountryCode = "US"
            },
            ServiceRegions =
            [
                // West Coast US states (prioritized for this warehouse)
                ("US", "CA", false),
                ("US", "WA", false),
                ("US", "OR", false),
                ("US", "NV", false),
                ("US", "AZ", false),
                ("US", "HI", false),
                ("US", "AK", false),
                // Also serves rest of US as fallback
                ("US", null, false),
                // Canada and Mexico
                ("CA", null, false),
                ("MX", null, false),
                // International - UK (fallback for US-only products)
                ("GB", null, false)
            ],
            ShippingOptions =
            [
                // FREE US West shipping (threshold-based)
                new ShippingOptionConfig { Name = "Free West Coast (Orders $75+)", DaysFrom = 4, DaysTo = 6, Cost = 0m },

                // USPS branded options (West Coast delivery times)
                new ShippingOptionConfig { Name = "USPS Ground Advantage (West)", DaysFrom = 4, DaysTo = 6, Cost = 5.49m },
                new ShippingOptionConfig { Name = "USPS Priority Mail (West)", DaysFrom = 2, DaysTo = 3, Cost = 8.99m },

                // UPS branded options
                new ShippingOptionConfig { Name = "UPS Ground (West)", DaysFrom = 3, DaysTo = 5, Cost = 6.99m },
                new ShippingOptionConfig { Name = "UPS 2nd Day Air (West)", DaysFrom = 2, DaysTo = 2, Cost = 18.99m },
                new ShippingOptionConfig { Name = "UPS Next Day Air Saver (West)", DaysFrom = 1, DaysTo = 1, Cost = 32.99m, IsNextDay = true },

                // FedEx options (West Coast)
                new ShippingOptionConfig { Name = "FedEx Ground (West)", DaysFrom = 4, DaysTo = 6, Cost = 7.99m, ProviderKey = "fedex", ServiceType = "FEDEX_GROUND" },
                new ShippingOptionConfig { Name = "FedEx Express Saver (West)", DaysFrom = 3, DaysTo = 3, Cost = 12.99m, ProviderKey = "fedex", ServiceType = "FEDEX_EXPRESS_SAVER" },
                new ShippingOptionConfig { Name = "FedEx 2Day (West)", DaysFrom = 2, DaysTo = 2, Cost = 14.99m, ProviderKey = "fedex", ServiceType = "FEDEX_2_DAY" },

                // International from US West (Mexico/Canada focus)
                new ShippingOptionConfig { Name = "USPS Priority Intl (West)", DaysFrom = 8, DaysTo = 12, Cost = 22.99m }
            ]
        }, cancellationToken);

        if (!euWarehouseResult.Successful || euWarehouseResult.ResultObject == null)
        {
            euWarehouseResult.LogBadMessages(logger);
            throw new InvalidOperationException("Failed to create EU warehouse - seeding cannot continue");
        }
        if (!usEastWarehouseResult.Successful || usEastWarehouseResult.ResultObject == null)
        {
            usEastWarehouseResult.LogBadMessages(logger);
            throw new InvalidOperationException("Failed to create US East warehouse - seeding cannot continue");
        }
        if (!usWestWarehouseResult.Successful || usWestWarehouseResult.ResultObject == null)
        {
            usWestWarehouseResult.LogBadMessages(logger);
            throw new InvalidOperationException("Failed to create US West warehouse - seeding cannot continue");
        }

        return [
            ukWarehouse,
            euWarehouseResult.ResultObject,
            usEastWarehouseResult.ResultObject,
            usWestWarehouseResult.ResultObject
        ];
    }

    /// <summary>
    /// Creates filter groups and filters, returning lookups for assigning to variants.
    /// </summary>
    private async Task<(Dictionary<string, Guid> colorFilters, Dictionary<string, Guid> sizeFilters)> CreateFiltersAsync(CancellationToken cancellationToken)
    {
        Dictionary<string, Guid> colorFilters = [];
        Dictionary<string, Guid> sizeFilters = [];

        // Extended color palette with hex values
        var colors = new (string Name, string? HexColour)[]
        {
            ("Black", "#000000"), ("White", "#FFFFFF"), ("Navy", "#000080"), ("Grey", "#808080"),
            ("Burgundy", "#800020"), ("Forest Green", "#228B22"), ("Natural", "#F5F5DC"), ("Red", "#FF0000"),
            ("Royal Blue", "#4169E1"), ("Heather Grey", "#9E9E9E"), ("Charcoal", "#36454F"), ("Olive", "#808000"),
            ("Tan", "#D2B48C"), ("Pink", "#FFC0CB"), ("Sky Blue", "#87CEEB")
        };

        try
        {
            var colorGroupResult = await productFilterService.CreateFilterGroup("Color", cancellationToken);
            if (colorGroupResult.ResultObject != null)
            {
                foreach (var (name, hexColour) in colors)
                {
                    try
                    {
                        var filterResult = await productFilterService.CreateFilter(new CreateFilterParameters
                        {
                            FilterGroupId = colorGroupResult.ResultObject.Id,
                            Name = name,
                            HexColour = hexColour
                        }, cancellationToken);

                        if (filterResult.ResultObject != null)
                        {
                            colorFilters[name] = filterResult.ResultObject.Id;
                        }
                        else
                        {
                            filterResult.LogBadMessages(logger);
                            logger.LogWarning("Failed to create color filter: {Name}", name);
                        }
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Failed to create color filter: {Name}", name);
                    }
                }
            }
            else
            {
                colorGroupResult.LogBadMessages(logger);
                logger.LogWarning("Failed to create Color filter group");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to create color filters");
        }

        // Extended sizes including XS
        var sizes = new[] { "XS", "S", "M", "L", "XL", "2XL" };
        try
        {
            var sizeGroupResult = await productFilterService.CreateFilterGroup("Size", cancellationToken);
            if (sizeGroupResult.ResultObject != null)
            {
                foreach (var size in sizes)
                {
                    try
                    {
                        var filterResult = await productFilterService.CreateFilter(new CreateFilterParameters
                        {
                            FilterGroupId = sizeGroupResult.ResultObject.Id,
                            Name = size
                        }, cancellationToken);

                        if (filterResult.ResultObject != null)
                        {
                            sizeFilters[size] = filterResult.ResultObject.Id;
                        }
                        else
                        {
                            filterResult.LogBadMessages(logger);
                            logger.LogWarning("Failed to create size filter: {Name}", size);
                        }
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Failed to create size filter: {Name}", size);
                    }
                }
            }
            else
            {
                sizeGroupResult.LogBadMessages(logger);
                logger.LogWarning("Failed to create Size filter group");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to create size filters");
        }

        return (colorFilters, sizeFilters);
    }

    private async Task<List<Customer>> CreateCustomersAsync(CancellationToken cancellationToken)
    {
        var sampleCustomers = GetSampleCustomers();
        List<Customer> customers = [];

        foreach (var (billing, _) in sampleCustomers)
        {
            if (string.IsNullOrEmpty(billing.Email)) continue;

            var customer = await customerService.GetOrCreateByEmailAsync(new GetOrCreateCustomerParameters
            {
                Email = billing.Email,
                BillingAddress = billing,
                AcceptsMarketing = false
            }, cancellationToken);
            customers.Add(customer);
        }

        return customers;
    }

    private async Task<CustomerSegment?> CreateVipSegmentAsync(
        List<Customer> customers,
        CancellationToken cancellationToken)
    {
        // Create a manual VIP segment with the first 5 customers
        var createParams = new CreateSegmentParameters
        {
            Name = "VIP Customers",
            Description = "Our most valued customers with exclusive discounts",
            SegmentType = CustomerSegmentType.Manual
        };

        var result = await customerSegmentService.CreateAsync(createParams, cancellationToken);
        if (result.ResultObject == null)
        {
            result.LogBadMessages(logger);
            logger.LogWarning("Failed to create VIP segment");
            return null;
        }

        var segment = result.ResultObject;

        // Add the first 5 customers as VIP members
        var vipCustomerIds = customers.Take(5).Select(c => c.Id).ToList();
        await customerSegmentService.AddMembersAsync(new AddSegmentMembersParameters
        {
            SegmentId = segment.Id,
            CustomerIds = vipCustomerIds
        }, cancellationToken);

        return segment;
    }

    /// <summary>
    /// Configures account terms for selected B2B customers.
    /// Returns the list of customers that were configured as account customers.
    /// </summary>
    private async Task<List<Customer>> SetupAccountCustomersAsync(
        List<Customer> customers,
        CancellationToken cancellationToken)
    {
        // B2B customers with varied payment terms and credit limits
        var accountSettings = new Dictionary<string, (int terms, decimal? limit)>
        {
            ["sarah.j@example.com"] = (15, 5000m),      // Net 15, £5,000 limit
            ["d.wilson@example.com"] = (30, 10000m),    // Net 30, £10,000 limit
            ["j.vanderberg@example.com"] = (45, 7500m), // Net 45, €7,500 limit
            ["s.tremblay@example.com"] = (60, null)     // Net 60, no limit
        };

        var accountCustomers = new List<Customer>();

        foreach (var customer in customers.Where(c => accountSettings.ContainsKey(c.Email)))
        {
            var (terms, limit) = accountSettings[customer.Email];
            var result = await customerService.UpdateAsync(new UpdateCustomerParameters
            {
                Id = customer.Id,
                HasAccountTerms = true,
                PaymentTermsDays = terms,
                CreditLimit = limit
            }, cancellationToken);

            if (result.Successful && result.ResultObject != null)
            {
                accountCustomers.Add(result.ResultObject);
                logger.LogDebug("Enabled account terms for {Email}: Net {Terms}, Limit {Limit}",
                    customer.Email, terms, limit?.ToString("C") ?? "unlimited");
            }
        }

        return accountCustomers;
    }

    private async Task CreateAutomaticDiscountsAsync(
        Dictionary<string, ProductType> productTypes,
        CancellationToken cancellationToken)
    {
        // Get the T-Shirt product type ID
        if (!productTypes.TryGetValue("tshirt", out var tshirtType))
        {
            logger.LogWarning("T-Shirt product type not found, skipping automatic discount creation");
            return;
        }

        // Create a 10% off all T-Shirts automatic discount with targeting and eligibility inline
        var createParams = new CreateDiscountParameters
        {
            Name = "10% Off All T-Shirts",
            Description = "Automatic 10% discount on all t-shirt purchases",
            Category = DiscountCategory.AmountOffProducts,
            Method = DiscountMethod.Automatic,
            ValueType = DiscountValueType.Percentage,
            Value = 10m,
            // Target: ProductTypes with T-shirt type ID
            TargetRules =
            [
                new CreateDiscountTargetRuleParameters
                {
                    TargetType = DiscountTargetType.ProductTypes,
                    TargetIds = [tshirtType.Id]
                }
            ],
            // Eligibility: All customers
            EligibilityRules =
            [
                new CreateDiscountEligibilityRuleParameters
                {
                    EligibilityType = DiscountEligibilityType.AllCustomers
                }
            ]
        };

        var result = await discountService.CreateAsync(createParams, cancellationToken);
        if (result.ResultObject == null)
        {
            result.LogBadMessages(logger);
            logger.LogWarning("Failed to create automatic discount");
            return;
        }

        var discount = result.ResultObject;

        // Activate the discount
        await discountService.ActivateAsync(discount.Id, cancellationToken);

        logger.LogDebug("Created automatic discount: {Name}", discount.Name);
    }

    private async Task CreateProductsAsync(
        TaxGroup taxGroup,
        Dictionary<string, ProductType> productTypes,
        Dictionary<string, ProductCollection> collections,
        Warehouse[] warehouses,
        Dictionary<string, Guid> colorFilters,
        Dictionary<string, Guid> sizeFilters)
    {
        // Warehouse indices: 0=UK, 1=EU, 2=US-East, 3=US-West
        var standardSizes = new[] { "S", "M", "L", "XL" };
        var extendedSizes = new[] { "XS", "S", "M", "L", "XL", "2XL" };

        // Local helper that captures filter mappings for all product creation calls
        async Task CreateProduct(
            string name, string description, decimal price, ProductType productType,
            List<ProductCollection> productCollections, decimal weight,
            string[]? colors, string[]? sizes,
            List<(int warehouseIndex, int minStock, int maxStock, bool trackStock)> stockConfig)
        {
            try
            {
                await CreateProductAsync(name, description, price, taxGroup, productType,
                    productCollections, weight, colors, sizes, warehouses, stockConfig,
                    colorFilters, sizeFilters);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to create product: {Name}", name);
            }
        }

        // ============ T-SHIRTS (6 products) - All 4 warehouses, UK priority ============

        // Classic Cotton Tee - HIGH STOCK in all 4 warehouses (global bestseller)
        await CreateProduct("Classic Cotton Tee",
            "Comfortable 100% cotton t-shirt with a classic fit. A wardrobe staple.",
            19.99m, productTypes["tshirt"], [collections["clothing"], collections["tshirts"]],
            0.2m, ["Black", "White", "Navy"], standardSizes,
            [(0, 50, 100, true), (1, 40, 80, true), (2, 35, 70, true), (3, 30, 60, true)]);

        // Premium V-Neck - LOW STOCK across warehouses
        await CreateProduct("Premium V-Neck",
            "Premium quality v-neck t-shirt with a modern fit. Limited availability.",
            24.99m, productTypes["tshirt"], [collections["clothing"], collections["tshirts"]],
            0.2m, ["Grey", "White", "Burgundy"], standardSizes,
            [(0, 3, 8, true), (1, 5, 12, true), (2, 4, 10, true), (3, 2, 6, true)]);

        // Organic Crew Neck - REGIONAL SHORTAGE (only in US warehouses)
        await CreateProduct("Organic Crew Neck",
            "100% organic cotton crew neck, sustainably produced.",
            27.99m, productTypes["tshirt"], [collections["clothing"], collections["tshirts"]],
            0.2m, ["Forest Green", "Black", "Natural"], standardSizes,
            [(0, 0, 0, true), (1, 0, 0, true), (2, 15, 25, true), (3, 10, 20, true)]);

        // Graphic Print Tee - MIXED STOCK levels
        await CreateProduct("Graphic Print Tee",
            "Bold graphic print t-shirt for statement style.",
            22.99m, productTypes["tshirt"], [collections["clothing"], collections["tshirts"]],
            0.2m, ["White", "Black", "Red"], standardSizes,
            [(0, 5, 15, true), (1, 8, 20, true), (2, 25, 50, true), (3, 20, 40, true)]);

        // Long Sleeve Tee - Good stock in UK/EU, lower in US
        await CreateProduct("Long Sleeve Tee",
            "Long sleeve cotton t-shirt perfect for layering.",
            29.99m, productTypes["tshirt"], [collections["clothing"], collections["tshirts"]],
            0.25m, ["Navy", "Grey", "Black"], standardSizes,
            [(0, 20, 40, true), (1, 25, 45, true), (2, 10, 20, true), (3, 8, 15, true)]);

        // Sold Out Limited Tee - OUT OF STOCK everywhere (for OOS UI testing)
        await CreateProduct("Limited Edition Tee",
            "Exclusive limited edition t-shirt. Currently sold out.",
            34.99m, productTypes["tshirt"], [collections["clothing"], collections["tshirts"]],
            0.2m, ["Black", "White"], standardSizes,
            [(0, 0, 0, true), (1, 0, 0, true), (2, 0, 0, true), (3, 0, 0, true)]);

        // ============ HOODIES (3 products) - UK, EU, US-East only ============

        // Premium Hoodie - SPLIT STOCK scenario (UK:50, EU:30, US-E:10, US-W:0)
        await CreateProduct("Premium Pullover Hoodie",
            "Heavyweight premium hoodie with kangaroo pocket. Soft brushed fleece interior.",
            59.99m, productTypes["hoodie"], [collections["clothing"], collections["hoodies"]],
            0.6m, ["Black", "Navy", "Heather Grey", "Burgundy"], extendedSizes,
            [(0, 40, 60, true), (1, 25, 35, true), (2, 8, 15, true)]);

        // Zip-Up Hoodie - UK and EU only
        await CreateProduct("Classic Zip Hoodie",
            "Full zip hoodie with metal zipper and split kangaroo pockets.",
            64.99m, productTypes["hoodie"], [collections["clothing"], collections["hoodies"]],
            0.65m, ["Black", "Charcoal", "Navy"], standardSizes,
            [(0, 20, 40, true), (1, 15, 30, true), (2, 10, 20, true)]);

        // Lightweight Hoodie - EU warehouse only (summer item)
        await CreateProduct("Lightweight Summer Hoodie",
            "Breathable lightweight hoodie perfect for cool summer evenings.",
            44.99m, productTypes["hoodie"], [collections["clothing"], collections["hoodies"]],
            0.4m, ["White", "Sky Blue", "Grey"], standardSizes,
            [(1, 30, 60, true)]);

        // ============ POLO SHIRTS (2 products) - US PRIORITY (US-E→US-W→UK) ============

        // Classic Polo - US priority, available in UK too
        await CreateProduct("Classic Pique Polo",
            "Timeless pique polo shirt with ribbed collar and cuffs.",
            34.99m, productTypes["polo"], [collections["clothing"], collections["polos"]],
            0.3m, ["White", "Navy", "Black", "Royal Blue", "Burgundy"], standardSizes,
            [(2, 30, 50, true), (3, 25, 45, true), (0, 15, 30, true)]);

        // Performance Polo - US warehouses only
        await CreateProduct("Performance Polo",
            "Moisture-wicking performance polo, perfect for golf or active wear.",
            39.99m, productTypes["polo"], [collections["clothing"], collections["polos"]],
            0.25m, ["White", "Black", "Grey", "Navy"], standardSizes,
            [(2, 20, 40, true), (3, 15, 30, true), (0, 8, 15, true)]);

        // ============ JACKETS (3 products) - UK and EU only (cold climate) ============

        // Bomber Jacket - LIMITED stock, UK and EU only
        await CreateProduct("Classic Bomber Jacket",
            "Retro-style bomber jacket with ribbed cuffs and hem.",
            89.99m, productTypes["jacket"], [collections["clothing"], collections["jackets"]],
            0.8m, ["Black", "Olive"], extendedSizes,
            [(0, 5, 12, true), (1, 4, 10, true)]);

        // Denim Jacket - LOW STOCK UK/EU only
        await CreateProduct("Denim Jacket",
            "Classic denim jacket with button front and chest pockets.",
            79.99m, productTypes["jacket"], [collections["clothing"], collections["jackets"]],
            0.9m, ["Navy", "Black", "Sky Blue"], extendedSizes,
            [(0, 5, 12, true), (1, 4, 10, true)]);

        // Softshell Jacket - UK and EU
        await CreateProduct("Softshell Jacket",
            "Water-resistant softshell jacket with fleece lining.",
            99.99m, productTypes["jacket"], [collections["clothing"], collections["jackets"]],
            0.7m, ["Black", "Charcoal", "Navy"], extendedSizes,
            [(0, 12, 25, true), (1, 10, 20, true)]);

        // ============ CAPS & HATS (3 products) - All 4 warehouses, varied priorities ============

        // Baseball Cap - All warehouses, UK priority
        await CreateProduct("Classic Baseball Cap",
            "Adjustable cotton twill baseball cap with curved brim.",
            19.99m, productTypes["cap"], [collections["headwear"]],
            0.1m, ["Black", "Navy", "White", "Red", "Grey", "Olive"], null,
            [(0, 40, 70, true), (1, 30, 55, true), (2, 25, 45, true), (3, 20, 40, true)]);

        // Snapback - US priority
        await CreateProduct("Snapback Cap",
            "Flat brim snapback cap with adjustable strap.",
            24.99m, productTypes["cap"], [collections["headwear"]],
            0.12m, ["Black", "Navy", "Heather Grey", "Burgundy"], null,
            [(2, 30, 50, true), (3, 25, 45, true), (0, 15, 30, true), (1, 10, 25, true)]);

        // Beanie - UK/EU priority (winter item)
        await CreateProduct("Knit Beanie",
            "Warm knit beanie with fold-up cuff.",
            14.99m, productTypes["cap"], [collections["headwear"]],
            0.08m, ["Black", "Grey", "Navy", "Burgundy", "Forest Green"], null,
            [(0, 50, 90, true), (1, 40, 70, true), (2, 20, 35, true), (3, 15, 30, true)]);

        // ============ BAGS (3 products) - UK, US-East, US-West ============

        // Canvas Tote - HIGH STOCK, all warehouses
        await CreateProduct("Canvas Tote Bag",
            "Sturdy canvas tote bag with reinforced handles.",
            14.99m, productTypes["bag"], [collections["bags"]],
            0.3m, ["Natural", "Black", "Navy", "Grey"], null,
            [(0, 60, 100, true), (2, 50, 90, true), (3, 45, 80, true)]);

        // Backpack - UK and US
        await CreateProduct("Classic Backpack",
            "Durable everyday backpack with laptop compartment.",
            49.99m, productTypes["bag"], [collections["bags"]],
            0.5m, ["Black", "Navy", "Grey"], ["S", "L"],
            [(0, 20, 40, true), (2, 15, 30, true), (3, 12, 25, true)]);

        // Gym Bag - UK and US
        await CreateProduct("Duffle Gym Bag",
            "Spacious duffle bag with shoe compartment.",
            39.99m, productTypes["bag"], [collections["bags"]],
            0.4m, ["Black", "Navy", "Charcoal"], null,
            [(0, 25, 45, true), (2, 20, 35, true), (3, 15, 30, true)]);

        // ============ MUGS (2 products) - fragile items ============

        // Ceramic Mug - UK, US warehouses with low US stock
        // US-East has priority 3, US-West has priority 4, so US-East is checked first
        await CreateProduct("Ceramic Mug (11oz)",
            "Classic 11oz ceramic mug, dishwasher and microwave safe.",
            12.99m, productTypes["mug"], [collections["drinkware"]],
            0.35m, ["White", "Black", "Navy", "Red", "Pink", "Sky Blue", "Grey", "Forest Green"], null,
            [(0, 60, 100, true), (3, 2, 3, true), (2, 3, 4, true)]);

        // Travel Mug - UK and US-East
        await CreateProduct("Insulated Travel Mug",
            "16oz stainless steel travel mug with leak-proof lid.",
            24.99m, productTypes["mug"], [collections["drinkware"]],
            0.4m, ["Black", "White", "Navy", "Red"], null,
            [(0, 30, 55, true), (2, 25, 45, true)]);

        // ============ ACCESSORIES (2 products) - UK only ============

        // Sticker Pack - UK only, UNTRACKED
        await CreateProduct("Sticker Pack (10 pcs)",
            "Assorted vinyl sticker pack, weatherproof and durable.",
            9.99m, productTypes["accessories"], [collections["accessories"]],
            0.05m, null, null,
            [(0, 0, 0, false)]);

        // Poster Print - UK only, UNTRACKED (print on demand)
        await CreateProduct("Art Print Poster",
            "High-quality giclée art print on premium paper.",
            19.99m, productTypes["accessories"], [collections["accessories"]],
            0.1m, null, ["A4", "A3", "A2"],
            [(0, 0, 0, false)]);

        // Gift Cards - AMOUNT VARIANTS, DIGITAL
        try
        {
            await CreateProductWithAmountVariantsAsync("Gift Card",
                "Digital gift card, delivered via email.",
                taxGroup, productTypes["digital"], [collections["digital"]],
                warehouses[0], [25m, 50m, 75m, 100m]);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to create product: Gift Card");
        }

        // Custom Print Service - NO VARIANTS, MADE TO ORDER
        await CreateProduct("Custom Print Service",
            "Made-to-order custom print service. Upload your design!",
            34.99m, productTypes["digital"], [collections["digital"]],
            0.2m, null, null,
            [(0, 0, 0, false), (1, 0, 0, false)]);

        // ============ UK-ONLY PRODUCTS (for testing country restrictions) ============
        // These products can ONLY be shipped within the UK using the "UK Domestic Only" shipping option.
        // This tests the UI restriction where non-UK customers cannot purchase these items.

        // UK Exclusive Vintage Tee - UK delivery ONLY (licensing restrictions)
        try
        {
            await CreateUkOnlyProductAsync("UK Exclusive Vintage Tee",
                "Limited edition vintage t-shirt featuring iconic British designs. Only available for UK delivery due to licensing restrictions.",
                29.99m, taxGroup, productTypes["tshirt"], [collections["clothing"], collections["tshirts"]],
                0.25m, ["Black", "White", "Burgundy"], standardSizes,
                warehouses, [(0, 20, 40, true)], colorFilters, sizeFilters);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to create UK-only product: UK Exclusive Vintage Tee");
        }

        // UK Heritage Hoodie - UK delivery ONLY (exclusive collection)
        try
        {
            await CreateUkOnlyProductAsync("Heritage Collection Hoodie",
                "Part of our exclusive UK Heritage Collection featuring traditional British craftsmanship. UK delivery only.",
                69.99m, taxGroup, productTypes["hoodie"], [collections["clothing"], collections["hoodies"]],
                0.65m, ["Burgundy", "Forest Green", "Navy"], extendedSizes,
                warehouses, [(0, 15, 30, true)], colorFilters, sizeFilters);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to create UK-only product: Heritage Collection Hoodie");
        }

        // UK Collectible Mug - UK delivery ONLY (fragile/limited)
        try
        {
            await CreateUkOnlyProductAsync("UK Collectible Mug",
                "Limited edition collectible bone china mug with British heritage designs. Due to fragility, only ships within the UK.",
                16.99m, taxGroup, productTypes["mug"], [collections["drinkware"]],
                0.4m, ["White", "Black"], null,
                warehouses, [(0, 30, 50, true)], colorFilters, null);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to create UK-only product: UK Collectible Mug");
        }
    }

    private async Task CreateProductAsync(
        string name,
        string description,
        decimal price,
        TaxGroup taxGroup,
        ProductType productType,
        List<ProductCollection> productCollections,
        decimal weight,
        string[]? colors,
        string[]? sizes,
        Warehouse[] warehouses,
        List<(int warehouseIndex, int minStock, int maxStock, bool trackStock)> stockConfig,
        Dictionary<string, Guid>? colorFilters = null,
        Dictionary<string, Guid>? sizeFilters = null)
    {
        // Create warehouse list with priorities
        var warehouseList = stockConfig.Select(s => (warehouses[s.warehouseIndex], s.warehouseIndex + 1)).ToList();

        // Remap stockConfig indices to be 0-based relative to warehouseList
        // Original stockConfig uses global warehouse indices, but CreateProductRootWithVariantsAsync
        // expects indices into the warehouseList parameter
        var remappedStockConfig = stockConfig
            .Select((s, localIndex) => (localIndex, s.minStock, s.maxStock, s.trackStock))
            .ToList();

        var result = await productService.CreateProductRootWithVariantsAsync(
            productFilterService,
            name,
            description,
            price,
            taxGroup,
            productType,
            collections: productCollections,
            weight: weight,
            colors: colors,
            sizes: sizes,
            warehouses: warehouseList,
            warehouseStockRanges: remappedStockConfig,
            colorFilters: colorFilters,
            sizeFilters: sizeFilters);

        if (!result.Successful || result.ResultObject == null)
        {
            result.LogBadMessages(logger);
            logger.LogWarning("Failed to create product: {Name}", name);
        }
    }

    private async Task CreateProductWithAmountVariantsAsync(
        string name,
        string description,
        TaxGroup taxGroup,
        ProductType productType,
        List<ProductCollection> collections,
        Warehouse warehouse,
        decimal[] amounts)
    {
        foreach (var amount in amounts)
        {
            var variantName = $"{name} - £{amount:0}";
            var result = await productService.CreateProductRootWithVariantsAsync(
                productFilterService,
                variantName,
                description,
                amount,
                taxGroup,
                productType,
                collections: collections,
                weight: 0,
                colors: null,
                sizes: null,
                warehouses: [(warehouse, 1)],
                warehouseStockRanges: [(0, 0, 0, false)]);

            if (!result.Successful || result.ResultObject == null)
            {
                result.LogBadMessages(logger);
                logger.LogWarning("Failed to create amount variant product: {Name}", variantName);
            }
        }
    }

    /// <summary>
    /// Creates a product restricted to UK-only shipping.
    /// Uses ExcludeList mode to exclude all shipping options except the UK Domestic Only option.
    /// This tests the shipping restriction infrastructure and allows testing UI restrictions for non-UK customers.
    /// </summary>
    private async Task CreateUkOnlyProductAsync(
        string name,
        string description,
        decimal price,
        TaxGroup taxGroup,
        ProductType productType,
        List<ProductCollection> productCollections,
        decimal weight,
        string[]? colors,
        string[]? sizes,
        Warehouse[] warehouses,
        List<(int warehouseIndex, int minStock, int maxStock, bool trackStock)> stockConfig,
        Dictionary<string, Guid>? colorFilters = null,
        Dictionary<string, Guid>? sizeFilters = null)
    {
        // Create warehouse list with priorities
        var warehouseList = stockConfig.Select(s => (warehouses[s.warehouseIndex], s.warehouseIndex + 1)).ToList();

        // Remap stockConfig indices to be 0-based relative to warehouseList
        var remappedStockConfig = stockConfig
            .Select((s, localIndex) => (localIndex, s.minStock, s.maxStock, s.trackStock))
            .ToList();

        // Create the product normally first
        var result = await productService.CreateProductRootWithVariantsAsync(
            productFilterService,
            name,
            description,
            price,
            taxGroup,
            productType,
            collections: productCollections,
            weight: weight,
            colors: colors,
            sizes: sizes,
            warehouses: warehouseList,
            warehouseStockRanges: remappedStockConfig,
            colorFilters: colorFilters,
            sizeFilters: sizeFilters);

        if (result.ResultObject == null)
        {
            result.LogBadMessages(logger);
            logger.LogWarning("Failed to create UK-only product: {Name}", name);
            return;
        }

        if (_ukOnlyShippingOptionId == Guid.Empty)
        {
            logger.LogWarning("UK-only shipping option not found, cannot restrict product: {Name}", name);
            return;
        }

        // Get all shipping options from UK warehouse except the UK-only one
        var ukWarehouse = warehouses[0]; // UK is always index 0
        var optionsToExclude = ukWarehouse.ShippingOptions?
            .Where(so => so.Id != _ukOnlyShippingOptionId)
            .Select(so => so.Id)
            .ToList() ?? [];

        // Set shipping exclusions (all options except UK Domestic Only)
        if (optionsToExclude.Count > 0)
        {
            await productService.UpdateProductRootExcludedShippingOptionsAsync(
                result.ResultObject.Id, optionsToExclude, default);
            logger.LogDebug("Set UK-only shipping restriction for: {Name}", name);
        }
    }

    /// <summary>
    /// Seeds explicit multi-warehouse test invoices using services.
    /// These invoices guarantee products from different warehouses, creating multiple orders
    /// with multiple shipping fees for admin UI/UX testing.
    /// </summary>
    private async Task SeedMultiWarehouseTestInvoicesAsync(
        List<Product> products,
        CancellationToken cancellationToken)
    {
        logger.LogDebug("Merchello seed data: Creating explicit multi-warehouse test invoices...");

        var customers = GetSampleCustomers();
        var successCount = 0;

        // Test Case 1: UK customer ordering US-only product + UK product
        // This guarantees international split (UK warehouse + US warehouse)
        try
        {
            var ukCustomer = customers.First(c => c.billing.CountryCode == "GB");
            await CreateExplicitMultiWarehouseInvoice(
                products,
                ukCustomer,
                new[] { "Organic Crew Neck", "Ceramic Mug (11oz)", "Classic Baseball Cap" },
                "UK customer with US-only product (international split)",
                cancellationToken);
            successCount++;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to create multi-warehouse test case 1");
        }

        // Test Case 2: US West Coast customer ordering from US warehouses
        // Tests domestic US order routing for West Coast customer
        try
        {
            var usWestCustomer = customers.First(c => c.billing.CountryCode == "US" && 
                                                       c.billing.CountyState.RegionCode == "CA");
            await CreateExplicitMultiWarehouseInvoice(
                products,
                usWestCustomer,
                new[] { "Ceramic Mug (11oz)", "Performance Polo", "Classic Cotton Tee" },
                "US West Coast customer (domestic US order)",
                cancellationToken);
            successCount++;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to create multi-warehouse test case 2");
        }

        logger.LogInformation("Merchello seed data: Created {Count} explicit multi-warehouse test invoices",
            successCount);
    }

    /// <summary>
    /// Creates a single invoice with explicitly selected products to guarantee multi-warehouse fulfillment.
    /// Uses only services - no direct DbContext access.
    /// </summary>
    private async Task CreateExplicitMultiWarehouseInvoice(
        List<Product> products,
        (Address billing, Address? shipping) customer,
        string[] productNames,
        string testCaseDescription,
        CancellationToken cancellationToken)
    {
        var shippingAddress = customer.shipping ?? customer.billing;
        var countryCode = shippingAddress.CountryCode ?? "US";

        // 1. Find products by name using the already-loaded product list (match on ProductRoot.RootName, not variant Name)
        var selectedProducts = products
            .Where(p => productNames.Any(name => p.ProductRoot?.RootName?.Contains(name) == true))
            .ToList();

        if (selectedProducts.Count == 0)
        {
            logger.LogWarning("Could not find products for multi-warehouse test: {Products}", 
                string.Join(", ", productNames));
            return;
        }

        // 2. Create basket via CheckoutService
        var basket = checkoutService.CreateBasket();

        // 3. Add line items via checkout service
        // For US West test case, order 2 of each (stock per-variant at US warehouses is low)
        var quantity = testCaseDescription.Contains("US West") ? 2 : 1;
        foreach (var product in selectedProducts)
        {
            var lineItem = checkoutService.CreateLineItem(product, quantity);
            await checkoutService.AddToBasketAsync(basket, lineItem, countryCode, cancellationToken);
        }

        // Apply automatic discounts
        basket = await checkoutDiscountService.RefreshAutomaticDiscountsAsync(basket, countryCode, cancellationToken);

        // 4. Get shipping options - this will create warehouse groups via the strategy
        var shippingResult = await shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            }, cancellationToken);

        if (shippingResult.WarehouseGroups.Count == 0)
        {
            logger.LogWarning("No shipping options for multi-warehouse test case: {Description}",
                testCaseDescription);
            return;
        }

        // Log if we got the multi-warehouse split we wanted
        if (shippingResult.WarehouseGroups.Count > 1)
        {
            logger.LogDebug(
                "✓ Multi-warehouse test case SUCCESS: {Description} - {GroupCount} warehouse groups created", 
                testCaseDescription, shippingResult.WarehouseGroups.Count);
        }
        else
        {
            logger.LogWarning(
                "Multi-warehouse test case only created 1 group: {Description} - Products may be fulfilled from same warehouse", 
                testCaseDescription);
        }

        // 5. Select first available shipping option for each group
        Dictionary<Guid, string> selectedShippingOptions = [];
        foreach (var group in shippingResult.WarehouseGroups)
        {
            var firstOption = group.AvailableShippingOptions.First();
            selectedShippingOptions[group.GroupId] = firstOption.SelectionKey;
        }

        // 6. Build checkout session
        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = CloneAddress(customer.billing),
            ShippingAddress = CloneAddress(shippingAddress),
            SelectedShippingOptions = selectedShippingOptions
        };

        // 7. Create invoice/orders via InvoiceService
        var invoiceResult = await invoiceService.CreateOrderFromBasketAsync(
            basket, checkoutSession, source: null, cancellationToken);
        if (!invoiceResult.Successful || invoiceResult.ResultObject == null)
        {
            logger.LogError("Failed to create seeded invoice: {Error}", invoiceResult.Messages.FirstOrDefault()?.Message);
            return;
        }
        var invoice = invoiceResult.ResultObject;

        // 8. Record payment (Stripe) via PaymentService
        await paymentService.RecordPaymentAsync(
            new RecordPaymentParameters
            {
                InvoiceId = invoice.Id,
                ProviderAlias = "stripe",
                TransactionId = $"pi_multiwarehouse_test_{Guid.NewGuid():N}",
                Amount = invoice.Total,
                Description = $"Multi-warehouse test: {testCaseDescription}"
            }, cancellationToken);

        // 9. Add note explaining this is a test case via InvoiceService
        await invoiceService.AddNoteAsync(new AddInvoiceNoteParameters
        {
            InvoiceId = invoice.Id,
            Text = $"[TEST CASE] {testCaseDescription} - Products: {string.Join(", ", productNames)}",
            VisibleToCustomer = false,
            AuthorName = "System - DbSeeder"
        }, cancellationToken);

        // 10. Backdate to ~60 days ago so test cases appear mid-range in the orders list
        await invoiceService.BackdateInvoiceAsync(invoice.Id, DateTime.UtcNow.AddDays(-60), cancellationToken);

        logger.LogDebug(
            "Created multi-warehouse test invoice {InvoiceNumber} with {OrderCount} orders, {LineItemCount} products",
            invoice.InvoiceNumber, invoice.Orders?.Count ?? 0, selectedProducts.Count);
    }

    /// <summary>
    /// Seeds invoices using real services (ShippingService, InvoiceService, PaymentService) to battle-test
    /// the order creation flow. Products from multiple warehouses will automatically create
    /// multi-warehouse orders via the order grouping strategy.
    /// </summary>
    private async Task SeedInvoicesViaServicesAsync(
        List<Product> products,
        int count,
        CancellationToken cancellationToken)
    {
        var random = new Random(42); // Fixed seed for reproducibility
        var now = DateTime.UtcNow;
        const int seedDateRangeDays = 90;
        var customers = GetSampleCustomers();
        var successCount = 0;
        var multiWarehouseCount = 0;
        var paymentCount = 0;
        var shipmentCount = 0;
        var refundCount = 0;

        // Manual payment methods for variety
        var manualPaymentMethods = new[] { "Bank Transfer", "Cash", "Check", "Phone Order", "Wire Transfer", "Direct Debit", "Store Credit" };
        // Carriers for flat-rate shipments
        var flatRateCarriers = new[] { "Royal Mail", "DHL", "Hermes", "USPS", "UPS" };

        // Pre-compute which products can ship to which countries (via service)
        var productsByCountry = await productService.GetProductIdsByCountryAvailabilityAsync(cancellationToken);

        logger.LogInformation("Merchello seed data: Creating {Count} invoices via services...", count);

        for (var i = 0; i < count; i++)
        {
            var customer = customers[random.Next(customers.Count)];
            var shippingAddress = customer.shipping ?? customer.billing;

            // Get products that can ship to this customer's country
            var countryCode = shippingAddress.CountryCode ?? "US";
            if (!productsByCountry.TryGetValue(countryCode, out var availableProductIds))
            {
                logger.LogWarning("No products available for country {Country}, skipping", countryCode);
                continue;
            }

            var availableProducts = products.Where(p => availableProductIds.Contains(p.Id)).ToList();
            if (availableProducts.Count == 0)
            {
                logger.LogWarning("No matching products for country {Country}, skipping", countryCode);
                continue;
            }

            // 1. Create basket with customer's currency based on country
            var customerCurrency = GetCurrencyForCountry(countryCode);
            var currencySymbol = GetCurrencySymbol(customerCurrency);
            var basket = checkoutService.CreateBasket(customerCurrency, currencySymbol);

            var numItems = Math.Min(random.Next(1, 6), availableProducts.Count);
            var selectedProducts = availableProducts.OrderBy(_ => random.Next()).Take(numItems).ToList();

            // Add line items via checkout service (handles validation and calculation)
            foreach (var product in selectedProducts)
            {
                var lineItem = checkoutService.CreateLineItem(product, random.Next(1, 4));
                await checkoutService.AddToBasketAsync(basket, lineItem, countryCode, cancellationToken);
            }

            // Apply automatic discounts (10% off T-Shirts, etc.)
            basket = await checkoutDiscountService.RefreshAutomaticDiscountsAsync(basket, countryCode, cancellationToken);

            // 2. Get shipping options - THIS TESTS THE ORDER GROUPING STRATEGY
            var shippingResult = await shippingService.GetShippingOptionsForBasket(
                new GetShippingOptionsParameters
                {
                    Basket = basket,
                    ShippingAddress = shippingAddress
                }, cancellationToken);

            // Skip if no shipping options (e.g., no warehouse serves this region)
            if (shippingResult.WarehouseGroups.Count == 0)
            {
                logger.LogWarning("No shipping options for {Country} ({Name}), skipping",
                    shippingAddress.CountryCode, customer.billing.Name);
                continue;
            }

            // 3. Build checkout session - select shipping option per group (mix of flat-rate and FedEx)
            Dictionary<Guid, string> selectedShippingOptions = [];
            foreach (var group in shippingResult.WarehouseGroups)
            {
                // Prefer FedEx options ~40% of the time for US orders
                var options = group.AvailableShippingOptions.ToList();
                var fedexOptions = options.Where(o => o.ProviderKey == "fedex").ToList();
                var useFedex = fedexOptions.Count > 0 && random.Next(100) < 40;

                selectedShippingOptions[group.GroupId] = useFedex
                    ? fedexOptions[random.Next(fedexOptions.Count)].SelectionKey
                    : options[random.Next(options.Count)].SelectionKey;
            }

            var checkoutSession = new CheckoutSession
            {
                BasketId = basket.Id,
                BillingAddress = CloneAddress(customer.billing),
                ShippingAddress = CloneAddress(shippingAddress),
                SelectedShippingOptions = selectedShippingOptions
            };

            // 4. Create invoice/orders - THIS TESTS FULL ORDER CREATION
            try
            {
                var invoiceResult = await invoiceService.CreateOrderFromBasketAsync(
                    basket, checkoutSession, source: null, cancellationToken);
                if (!invoiceResult.Successful || invoiceResult.ResultObject == null)
                {
                    logger.LogWarning("Failed to create seeded invoice for basket: {Error}", invoiceResult.Messages.FirstOrDefault()?.Message);
                    continue;
                }
                var invoice = invoiceResult.ResultObject;

                // Track multi-warehouse orders
                if (invoice.Orders?.Count > 1)
                {
                    multiWarehouseCount++;
                    logger.LogDebug("Created multi-warehouse invoice {Number} with {Count} orders",
                        invoice.InvoiceNumber, invoice.Orders.Count);
                }

                // Log multi-currency orders for visibility
                if (!string.Equals(invoice.CurrencyCode, "USD", StringComparison.OrdinalIgnoreCase))
                {
                    logger.LogDebug("Created {Currency} invoice {Number} (rate: {Rate:F4})",
                        invoice.CurrencyCode, invoice.InvoiceNumber, invoice.PricingExchangeRate);
                }

                // 5. Determine payment scenario based on position
                var paymentScenario = GetPaymentScenario(i, count);

                // 6. Record payments via PaymentService
                Payment? payment = null;
                if (paymentScenario != PaymentScenario.Unpaid)
                {
                    payment = await RecordPaymentForScenarioAsync(
                        invoice, paymentScenario, random, manualPaymentMethods, cancellationToken);
                    if (payment != null) paymentCount++;
                }

                // 7. Update order status for variety
                var status = GetWeightedStatus(i, count, paymentScenario);
                foreach (var order in invoice.Orders ?? [])
                {
                    if (status != OrderStatus.Pending && status != OrderStatus.ReadyToFulfill)
                    {
                        // Transition through intermediate statuses as required by business rules
                        // Orders start at ReadyToFulfill and must go through Processing before Shipped/Completed
                        await TransitionOrderToStatusAsync(order.Id, status, cancellationToken);
                    }

                    // 8. Create shipments for shipped/completed orders
                    if (status is OrderStatus.Shipped or OrderStatus.Completed or OrderStatus.PartiallyShipped)
                    {
                        var shipmentCreated = await CreateShipmentForOrderAsync(
                            order, status, random, flatRateCarriers, cancellationToken);
                        if (shipmentCreated) shipmentCount++;
                    }
                }

                // 9. Add lifecycle notes
                await AddLifecycleNotesAsync(invoice, status, paymentScenario, payment, cancellationToken);

                // 10. Process refunds for some completed orders (2% of orders)
                if (paymentScenario == PaymentScenario.Refunded && payment != null)
                {
                    var refundCreated = await ProcessRefundAsync(invoice, payment, random, cancellationToken);
                    if (refundCreated) refundCount++;
                }

                // 11. Backdate invoice to spread across 90 days (oldest first, newest last)
                var daysAgo = seedDateRangeDays - (i * seedDateRangeDays / count);
                var invoiceDate = now.AddDays(-daysAgo).Date
                    .AddHours(random.Next(8, 20))
                    .AddMinutes(random.Next(0, 60));
                await invoiceService.BackdateInvoiceAsync(invoice.Id, invoiceDate, cancellationToken);

                successCount++;
            }
            catch (Exception ex)
            {
                // Service failure = potential bug found! Log and continue
                logger.LogError(ex, "Failed to create invoice for {Customer} - service error detected",
                    customer.billing.Name);
            }
        }

        logger.LogInformation(
            "Merchello seed data: Created {Success}/{Total} invoices ({MultiWarehouse} multi-warehouse, {Payments} payments, {Shipments} shipments, {Refunds} refunds)",
            successCount, count, multiWarehouseCount, paymentCount, shipmentCount, refundCount);
    }

    /// <summary>
    /// Records a payment based on the scenario using PaymentService.
    /// </summary>
    private async Task<Payment?> RecordPaymentForScenarioAsync(
        Invoice invoice,
        PaymentScenario scenario,
        Random random,
        string[] manualPaymentMethods,
        CancellationToken cancellationToken)
    {
        var invoiceTotal = invoice.Total;

        switch (scenario)
        {
            case PaymentScenario.StripeFull:
                // Stripe payment via RecordPaymentAsync
                var stripeResult = await paymentService.RecordPaymentAsync(
                    new RecordPaymentParameters
                    {
                        InvoiceId = invoice.Id,
                        ProviderAlias = "stripe",
                        TransactionId = $"pi_seed_{Guid.NewGuid():N}",
                        Amount = invoiceTotal,
                        Description = "Stripe payment (seeded)"
                    }, cancellationToken);
                if (!stripeResult.Successful)
                {
                    logger.LogWarning("Seed payment failed for invoice {InvoiceId} (StripeFull): {Error}",
                        invoice.Id, stripeResult.Messages.FirstOrDefault()?.Message);
                }
                return stripeResult.ResultObject;

            case PaymentScenario.ManualFull:
                // Manual payment via RecordManualPaymentAsync
                var manualResult = await paymentService.RecordManualPaymentAsync(
                    new RecordManualPaymentParameters
                    {
                        InvoiceId = invoice.Id,
                        Amount = invoiceTotal,
                        PaymentMethod = manualPaymentMethods[random.Next(manualPaymentMethods.Length)],
                        Description = "Manual payment (seeded)"
                    }, cancellationToken);
                if (!manualResult.Successful)
                {
                    logger.LogWarning("Seed payment failed for invoice {InvoiceId} (ManualFull): {Error}",
                        invoice.Id, manualResult.Messages.FirstOrDefault()?.Message);
                }
                return manualResult.ResultObject;

            case PaymentScenario.PartialPayment:
                // Pay 50% of total
                var partialResult = await paymentService.RecordManualPaymentAsync(
                    new RecordManualPaymentParameters
                    {
                        InvoiceId = invoice.Id,
                        Amount = Math.Round(invoiceTotal * 0.5m, 2),
                        PaymentMethod = "Bank Transfer",
                        Description = "Partial payment - deposit (seeded)"
                    }, cancellationToken);
                if (!partialResult.Successful)
                {
                    logger.LogWarning("Seed payment failed for invoice {InvoiceId} (PartialPayment): {Error}",
                        invoice.Id, partialResult.Messages.FirstOrDefault()?.Message);
                }
                return partialResult.ResultObject;

            case PaymentScenario.SplitPayment:
                // Stripe for 80%, manual for 20%
                var splitStripeResult = await paymentService.RecordPaymentAsync(
                    new RecordPaymentParameters
                    {
                        InvoiceId = invoice.Id,
                        ProviderAlias = "stripe",
                        TransactionId = $"pi_seed_{Guid.NewGuid():N}",
                        Amount = Math.Round(invoiceTotal * 0.8m, 2),
                        Description = "Stripe payment - split (seeded)"
                    }, cancellationToken);
                if (!splitStripeResult.Successful)
                {
                    logger.LogWarning("Seed payment failed for invoice {InvoiceId} (SplitPayment-Stripe): {Error}",
                        invoice.Id, splitStripeResult.Messages.FirstOrDefault()?.Message);
                }

                var splitManualResult = await paymentService.RecordManualPaymentAsync(
                    new RecordManualPaymentParameters
                    {
                        InvoiceId = invoice.Id,
                        Amount = Math.Round(invoiceTotal * 0.2m, 2),
                        PaymentMethod = "Cash",
                        Description = "Cash top-up - split (seeded)"
                    }, cancellationToken);
                if (!splitManualResult.Successful)
                {
                    logger.LogWarning("Seed payment failed for invoice {InvoiceId} (SplitPayment-Manual): {Error}",
                        invoice.Id, splitManualResult.Messages.FirstOrDefault()?.Message);
                }
                return splitManualResult.ResultObject;

            case PaymentScenario.Overpayment:
                // Pay invoice + £10 extra
                var overpayResult = await paymentService.RecordManualPaymentAsync(
                    new RecordManualPaymentParameters
                    {
                        InvoiceId = invoice.Id,
                        Amount = invoiceTotal + 10m,
                        PaymentMethod = "Bank Transfer",
                        Description = "Overpayment - store credit created (seeded)"
                    }, cancellationToken);
                if (!overpayResult.Successful)
                {
                    logger.LogWarning("Seed payment failed for invoice {InvoiceId} (Overpayment): {Error}",
                        invoice.Id, overpayResult.Messages.FirstOrDefault()?.Message);
                }
                return overpayResult.ResultObject;

            case PaymentScenario.PurchaseOrder:
                // Purchase Order payment - B2B scenario with PO number
                var poNumber = $"PO-{DateTime.UtcNow:yyyyMMdd}-{random.Next(10000, 99999)}";

                // Set the PO number on the invoice
                await invoiceService.UpdatePurchaseOrderAsync(invoice.Id, poNumber, cancellationToken);

                // 40% of PO orders are paid, 60% remain unpaid (awaiting payment)
                if (random.Next(100) < 40)
                {
                    // Record payment using manual provider
                    var poPaymentResult = await paymentService.RecordPaymentAsync(
                        new RecordPaymentParameters
                        {
                            InvoiceId = invoice.Id,
                            ProviderAlias = Constants.PaymentProviders.Aliases.Manual,
                            TransactionId = $"po_txn_{Guid.NewGuid():N}",
                            Amount = invoiceTotal,
                            Description = $"Payment received for PO: {poNumber}"
                        }, cancellationToken);
                    if (!poPaymentResult.Successful)
                    {
                        logger.LogWarning("Seed payment failed for invoice {InvoiceId} (PurchaseOrder): {Error}",
                            invoice.Id, poPaymentResult.Messages.FirstOrDefault()?.Message);
                    }
                    return poPaymentResult.ResultObject;
                }

                // For unpaid PO orders, add a note
                await invoiceService.AddNoteAsync(new AddInvoiceNoteParameters
                {
                    InvoiceId = invoice.Id,
                    Text = $"Purchase Order {poNumber} submitted. Awaiting payment per agreed terms.",
                    VisibleToCustomer = true,
                    AuthorName = "System"
                }, cancellationToken);
                return null;

            case PaymentScenario.Refunded:
                // Full payment first (will be refunded later)
                var refundableResult = await paymentService.RecordPaymentAsync(
                    new RecordPaymentParameters
                    {
                        InvoiceId = invoice.Id,
                        ProviderAlias = "stripe",
                        TransactionId = $"pi_seed_{Guid.NewGuid():N}",
                        Amount = invoiceTotal,
                        Description = "Stripe payment - to be refunded (seeded)"
                    }, cancellationToken);
                if (!refundableResult.Successful)
                {
                    logger.LogWarning("Seed payment failed for invoice {InvoiceId} (Refunded): {Error}",
                        invoice.Id, refundableResult.Messages.FirstOrDefault()?.Message);
                }
                return refundableResult.ResultObject;

            case PaymentScenario.Unpaid:
            default:
                return null;
        }
    }

    /// <summary>
    /// Creates a shipment for an order using InvoiceService.
    /// </summary>
    private async Task<bool> CreateShipmentForOrderAsync(
        Order order,
        OrderStatus status,
        Random random,
        string[] flatRateCarriers,
        CancellationToken cancellationToken)
    {
        if (order.LineItems == null || order.LineItems.Count == 0)
            return false;

        try
        {
            // Determine carrier based on shipping option provider (via service)
            var shippingOption = await shippingService.GetShippingOptionByIdAsync(order.ShippingOptionId, cancellationToken);
            var isFedex = shippingOption?.ProviderKey == "fedex";
            var carrier = isFedex ? "FedEx" : flatRateCarriers[random.Next(flatRateCarriers.Length)];
            var trackingNumber = GenerateTrackingNumber(carrier, random);

            // For partial shipments, only ship first half of line items
            var lineItemsToShip = status == OrderStatus.PartiallyShipped
                ? order.LineItems.Take((order.LineItems.Count + 1) / 2).ToList()
                : order.LineItems.ToList();

            var shipmentParams = new CreateShipmentParameters
            {
                OrderId = order.Id,
                LineItems = lineItemsToShip.ToDictionary(li => li.Id, li => li.Quantity),
                Carrier = carrier,
                TrackingNumber = trackingNumber,
                TrackingUrl = GetTrackingUrl(carrier, trackingNumber)
            };

            var result = await shipmentService.CreateShipmentAsync(shipmentParams, cancellationToken);

            // Update shipment status via service (simulating warehouse worker actions)
            // Completed orders: all shipments must be Delivered (otherwise handlers regress order to Shipped)
            // Other orders: Distribution: 20% Preparing (default), 40% Shipped, 40% Delivered
            if (result.Successful && result.ResultObject != null)
            {
                if (status == OrderStatus.Completed)
                {
                    await shipmentService.UpdateShipmentStatusAsync(new UpdateShipmentStatusParameters
                    {
                        ShipmentId = result.ResultObject.Id,
                        NewStatus = Shipping.Models.ShipmentStatus.Delivered
                    }, cancellationToken);
                }
                else
                {
                    var statusChance = random.Next(100);
                    if (statusChance >= 20) // 80% get status update
                    {
                        var newStatus = statusChance < 60
                            ? Shipping.Models.ShipmentStatus.Shipped
                            : Shipping.Models.ShipmentStatus.Delivered;

                        await shipmentService.UpdateShipmentStatusAsync(new UpdateShipmentStatusParameters
                        {
                            ShipmentId = result.ResultObject.Id,
                            NewStatus = newStatus
                        }, cancellationToken);
                    }
                }
            }

            return result.Successful;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to create shipment for order {OrderId}", order.Id);
            return false;
        }
    }

    /// <summary>
    /// Adds lifecycle notes to the invoice.
    /// </summary>
    private async Task AddLifecycleNotesAsync(
        Invoice invoice,
        OrderStatus status,
        PaymentScenario paymentScenario,
        Payment? payment,
        CancellationToken cancellationToken)
    {
        // Order placed note
        await invoiceService.AddNoteAsync(new AddInvoiceNoteParameters
        {
            InvoiceId = invoice.Id,
            Text = "Order placed via Online Store",
            VisibleToCustomer = true,
            AuthorName = "System"
        }, cancellationToken);

        // Payment note
        if (payment != null && paymentScenario != PaymentScenario.Unpaid)
        {
            var paymentMethod = payment.PaymentProviderAlias == "stripe" ? "Stripe" : payment.PaymentMethod;
            await invoiceService.AddNoteAsync(new AddInvoiceNoteParameters
            {
                InvoiceId = invoice.Id,
                Text = $"Payment of {invoice.CurrencySymbol}{payment.Amount:F2} received via {paymentMethod}",
                VisibleToCustomer = true,
                AuthorName = "System"
            }, cancellationToken);
        }

        // Purchase Order specific notes
        if (paymentScenario == PaymentScenario.PurchaseOrder && payment != null)
        {
            await invoiceService.AddNoteAsync(new AddInvoiceNoteParameters
            {
                InvoiceId = invoice.Id,
                Text = $"Payment of {invoice.CurrencySymbol}{payment.Amount:F2} received against Purchase Order",
                VisibleToCustomer = true,
                AuthorName = "Accounts"
            }, cancellationToken);
        }

        // Status-specific notes
        switch (status)
        {
            case OrderStatus.Processing:
                await invoiceService.AddNoteAsync(new AddInvoiceNoteParameters
                {
                    InvoiceId = invoice.Id,
                    Text = "Order picked for packing",
                    VisibleToCustomer = false,
                    AuthorName = "Warehouse"
                }, cancellationToken);
                break;

            case OrderStatus.Shipped:
            case OrderStatus.PartiallyShipped:
                await invoiceService.AddNoteAsync(new AddInvoiceNoteParameters
                {
                    InvoiceId = invoice.Id,
                    Text = status == OrderStatus.PartiallyShipped
                        ? "Partial shipment dispatched - remaining items to follow"
                        : "Order dispatched",
                    VisibleToCustomer = true,
                    AuthorName = "Warehouse"
                }, cancellationToken);
                break;

            case OrderStatus.Completed:
                await invoiceService.AddNoteAsync(new AddInvoiceNoteParameters
                {
                    InvoiceId = invoice.Id,
                    Text = "Order delivered successfully",
                    VisibleToCustomer = true,
                    AuthorName = "System"
                }, cancellationToken);
                break;

            case OrderStatus.OnHold:
                await invoiceService.AddNoteAsync(new AddInvoiceNoteParameters
                {
                    InvoiceId = invoice.Id,
                    Text = "Order placed on hold - awaiting verification",
                    VisibleToCustomer = false,
                    AuthorName = "Admin"
                }, cancellationToken);
                break;

            case OrderStatus.Cancelled:
                await invoiceService.AddNoteAsync(new AddInvoiceNoteParameters
                {
                    InvoiceId = invoice.Id,
                    Text = "Order cancelled at customer request",
                    VisibleToCustomer = true,
                    AuthorName = "System"
                }, cancellationToken);
                break;
        }
    }

    /// <summary>
    /// Processes a refund for an invoice.
    /// </summary>
    private async Task<bool> ProcessRefundAsync(
        Invoice invoice,
        Payment payment,
        Random random,
        CancellationToken cancellationToken)
    {
        try
        {
            // 50% full refund, 50% partial refund
            var isPartial = random.Next(100) < 50;
            var refundAmount = isPartial
                ? Math.Round(payment.Amount * 0.5m, 2)
                : payment.Amount;

            var result = await paymentService.RecordManualRefundAsync(new RecordManualRefundParameters
            {
                PaymentId = payment.Id,
                Amount = refundAmount,
                Reason = isPartial ? "Partial refund - item returned" : "Full refund - order cancelled"
            }, cancellationToken);

            if (result.Successful)
            {
                await invoiceService.AddNoteAsync(new AddInvoiceNoteParameters
                {
                    InvoiceId = invoice.Id,
                    Text = $"Refund of £{refundAmount:F2} processed - {(isPartial ? "partial return" : "full cancellation")}",
                    VisibleToCustomer = true,
                    AuthorName = "System"
                }, cancellationToken);
            }

            return result.Successful;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to process refund for invoice {InvoiceId}", invoice.Id);
            return false;
        }
    }

    /// <summary>
    /// Seeds invoices specifically for account customers to test the Outstanding UI.
    /// Creates invoices with varied due dates (overdue, due soon, etc.) and payment states.
    /// </summary>
    private async Task SeedAccountCustomerInvoicesAsync(
        List<Product> products,
        List<Customer> accountCustomers,
        CancellationToken cancellationToken)
    {
        if (accountCustomers.Count == 0)
        {
            logger.LogWarning("No account customers to seed invoices for");
            return;
        }

        var random = new Random(43); // Different seed from main invoices
        var now = DateTime.UtcNow;

        // Get products by country for realistic ordering
        var productsByCountry = await productService.GetProductIdsByCountryAvailabilityAsync(cancellationToken);

        // Invoice scenarios for account customers
        var scenarios = new (string name, int dueDaysOffset, bool unpaid, bool partialPay)[]
        {
            ("Overdue 35 days", -35, true, false),
            ("Overdue 10 days", -10, true, false),
            ("Due in 3 days", 3, true, false),
            ("Due in 15 days", 15, true, false),
            ("Partially paid, due in 5 days", 5, false, true)
        };

        var invoicesCreated = 0;

        foreach (var customer in accountCustomers)
        {
            // Get customer's address from sample data
            var sampleCustomers = GetSampleCustomers();
            var (billing, shipping) = sampleCustomers.FirstOrDefault(c => c.billing.Email == customer.Email);
            if (billing == null)
            {
                continue;
            }

            var billingAddress = billing;
            var shippingAddress = shipping ?? billingAddress;
            var countryCode = shippingAddress.CountryCode ?? "GB";

            // Get products available for this country
            if (!productsByCountry.TryGetValue(countryCode, out var availableProductIds))
            {
                continue;
            }

            var availableProducts = products.Where(p => availableProductIds.Contains(p.Id)).ToList();
            if (availableProducts.Count == 0)
            {
                continue;
            }

            // Create an invoice for each scenario
            foreach (var (scenarioName, dueDaysOffset, unpaid, partialPay) in scenarios)
            {
                try
                {
                    // Create basket
                    var customerCurrency = GetCurrencyForCountry(countryCode);
                    var currencySymbol = GetCurrencySymbol(customerCurrency);
                    var basket = checkoutService.CreateBasket(customerCurrency, currencySymbol);

                    // Add 1-3 random products
                    var numItems = Math.Min(random.Next(1, 4), availableProducts.Count);
                    var selectedProducts = availableProducts.OrderBy(_ => random.Next()).Take(numItems).ToList();

                    foreach (var product in selectedProducts)
                    {
                        var lineItem = checkoutService.CreateLineItem(product, random.Next(1, 3));
                        await checkoutService.AddToBasketAsync(basket, lineItem, countryCode, cancellationToken);
                    }

                    // Get shipping options
                    var shippingResult = await shippingService.GetShippingOptionsForBasket(
                        new GetShippingOptionsParameters
                        {
                            Basket = basket,
                            ShippingAddress = shippingAddress
                        }, cancellationToken);

                    if (shippingResult.WarehouseGroups.Count == 0)
                    {
                        continue;
                    }

                    // Select first shipping option per group
                    var selectedShippingOptions = shippingResult.WarehouseGroups
                        .ToDictionary(g => g.GroupId, g => g.AvailableShippingOptions.First().SelectionKey);

                    var checkoutSession = new CheckoutSession
                    {
                        BasketId = basket.Id,
                        BillingAddress = CloneAddress(billingAddress),
                        ShippingAddress = CloneAddress(shippingAddress),
                        SelectedShippingOptions = selectedShippingOptions
                    };

                    // Create invoice (DueDate is set automatically from customer's PaymentTermsDays)
                    var invoiceResult = await invoiceService.CreateOrderFromBasketAsync(
                        basket, checkoutSession, source: null, cancellationToken);
                    if (!invoiceResult.Successful || invoiceResult.ResultObject == null)
                    {
                        logger.LogWarning("Failed to create outstanding balance invoice: {Error}", invoiceResult.Messages.FirstOrDefault()?.Message);
                        continue;
                    }
                    var invoice = invoiceResult.ResultObject;

                    // Adjust the DueDate to create the desired scenario
                    var targetDueDate = now.AddDays(dueDaysOffset);
                    await invoiceService.SetDueDateAsync(invoice.Id, targetDueDate, cancellationToken);

                    // Handle payment scenarios for account customers - always use Purchase Order
                    var poNumber = $"PO-{customer.Email.Split('@')[0].ToUpper()}-{random.Next(10000, 99999)}";
                    await invoiceService.UpdatePurchaseOrderAsync(invoice.Id, poNumber, cancellationToken);

                    if (partialPay)
                    {
                        // Partial payment against PO
                        await paymentService.RecordManualPaymentAsync(
                            new RecordManualPaymentParameters
                            {
                                InvoiceId = invoice.Id,
                                Amount = Math.Round(invoice.Total * 0.5m, 2),
                                PaymentMethod = "Bank Transfer",
                                Description = $"Partial payment against PO: {poNumber}"
                            }, cancellationToken);
                    }
                    else if (!unpaid)
                    {
                        // Full payment against PO
                        await paymentService.RecordPaymentAsync(
                            new RecordPaymentParameters
                            {
                                InvoiceId = invoice.Id,
                                ProviderAlias = Constants.PaymentProviders.Aliases.Manual,
                                TransactionId = $"po_account_{Guid.NewGuid():N}",
                                Amount = invoice.Total,
                                Description = $"Payment received for PO: {poNumber}"
                            }, cancellationToken);
                    }
                    // else: unpaid - just has PO number, awaiting payment per terms

                    // Backdate to a coherent date: invoice placed ~15 days before due date
                    var invoiceDate = now.AddDays(dueDaysOffset - 15).Date.AddHours(9).AddMinutes(30);
                    await invoiceService.BackdateInvoiceAsync(invoice.Id, invoiceDate, cancellationToken);

                    invoicesCreated++;
                    logger.LogDebug("Created account invoice for {Customer}: {Scenario}",
                        customer.Email, scenarioName);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to create account invoice for {Customer}: {Scenario}",
                        customer.Email, scenarioName);
                }
            }
        }

        logger.LogInformation("Merchello seed data: Created {Count} invoices for account customers", invoicesCreated);
    }

    /// <summary>
    /// Creates an automated "High Spenders" customer segment based on total spend criteria.
    /// </summary>
    private async Task CreateHighSpendersSegmentAsync(CancellationToken cancellationToken)
    {
        var createParams = new CreateSegmentParameters
        {
            Name = "High Spenders",
            Description = "Customers who have spent over £500 total",
            SegmentType = CustomerSegmentType.Automated,
            MatchMode = SegmentMatchMode.All,
            Criteria =
            [
                new SegmentCriteria
                {
                    Field = "TotalSpend",
                    Operator = SegmentCriteriaOperator.GreaterThan,
                    Value = 500m
                }
            ]
        };

        var result = await customerSegmentService.CreateAsync(createParams, cancellationToken);
        if (result.ResultObject != null)
        {
            logger.LogDebug("Created automated segment: {Name}", result.ResultObject.Name);
        }
        else
        {
            result.LogBadMessages(logger);
            logger.LogWarning("Failed to create High Spenders segment");
        }
    }

    /// <summary>
    /// Generates a tracking number based on carrier.
    /// </summary>
    private static string GenerateTrackingNumber(string carrier, Random random)
    {
        return carrier switch
        {
            "FedEx" => random.NextInt64(100000000000, 999999999999).ToString(),
            "Royal Mail" => $"JD{random.NextInt64(100000000, 999999999)}GB",
            "DHL" => random.NextInt64(1000000000, 9999999999).ToString(),
            "UPS" => $"1Z{random.NextInt64(100000000000000, 999999999999999)}",
            _ => $"TRK{random.NextInt64(1000000, 9999999)}"
        };
    }

    /// <summary>
    /// Gets tracking URL for a carrier.
    /// </summary>
    private static string? GetTrackingUrl(string carrier, string trackingNumber)
    {
        return carrier switch
        {
            "FedEx" => $"https://www.fedex.com/fedextrack/?trknbr={trackingNumber}",
            "Royal Mail" => $"https://www.royalmail.com/track-your-item#/tracking-results/{trackingNumber}",
            "DHL" => $"https://www.dhl.com/en/express/tracking.html?AWB={trackingNumber}",
            "UPS" => $"https://www.ups.com/track?tracknum={trackingNumber}",
            "USPS" => $"https://tools.usps.com/go/TrackConfirmAction?tLabels={trackingNumber}",
            _ => null
        };
    }

    /// <summary>
    /// Determines payment scenario based on position in seed.
    /// </summary>
    private static PaymentScenario GetPaymentScenario(int index, int total)
    {
        var percent = index * 100 / total;
        return percent switch
        {
            < 35 => PaymentScenario.StripeFull,      // 35% Stripe full payment
            < 50 => PaymentScenario.ManualFull,      // 15% Manual full payment (Bank Transfer, Cash, etc.)
            < 60 => PaymentScenario.PurchaseOrder,   // 10% Purchase Order (B2B)
            < 67 => PaymentScenario.PartialPayment,  // 7% Partial payment
            < 72 => PaymentScenario.SplitPayment,    // 5% Split payment
            < 75 => PaymentScenario.Overpayment,     // 3% Overpayment
            < 90 => PaymentScenario.Unpaid,          // 15% Unpaid
            _ => PaymentScenario.Refunded            // 10% Refunded
        };
    }

    /// <summary>
    /// Returns weighted status distribution, considering payment scenario.
    /// </summary>
    private static OrderStatus GetWeightedStatus(int index, int total, PaymentScenario paymentScenario)
    {
        // Unpaid orders stay Pending
        if (paymentScenario == PaymentScenario.Unpaid)
            return OrderStatus.Pending;

        // Refunded orders should be Completed (refund happens after delivery)
        if (paymentScenario == PaymentScenario.Refunded)
            return OrderStatus.Completed;

        var percent = index * 100 / total;
        return percent switch
        {
            < 8 => OrderStatus.Pending,              // 8% pending (paid but not processed)
            < 18 => OrderStatus.ReadyToFulfill,      // 10% ready to fulfill
            < 30 => OrderStatus.Processing,          // 12% processing
            < 45 => OrderStatus.Shipped,             // 15% shipped
            < 50 => OrderStatus.PartiallyShipped,    // 5% partially shipped
            < 90 => OrderStatus.Completed,           // 40% completed
            < 94 => OrderStatus.OnHold,              // 4% on hold
            < 97 => OrderStatus.AwaitingStock,       // 3% awaiting stock
            _ => OrderStatus.Cancelled               // 3% cancelled
        };
    }

    /// <summary>
    /// Transitions an order to a target status, going through intermediate statuses as required.
    /// Orders start at ReadyToFulfill and must go through Processing before Shipped/Completed.
    /// </summary>
    private async Task TransitionOrderToStatusAsync(Guid orderId, OrderStatus targetStatus, CancellationToken cancellationToken)
    {
        // Define the required transition path based on business rules
        // Orders typically start at ReadyToFulfill after creation
        var transitionPath = targetStatus switch
        {
            // Shipped/Completed require going through Processing first
            OrderStatus.Shipped => new[] { OrderStatus.Processing, OrderStatus.Shipped },
            OrderStatus.Completed => new[] { OrderStatus.Processing, OrderStatus.Shipped, OrderStatus.Completed },
            OrderStatus.PartiallyShipped => new[] { OrderStatus.Processing, OrderStatus.PartiallyShipped },
            // Other statuses can be set directly
            _ => new[] { targetStatus }
        };

        foreach (var status in transitionPath)
        {
            var result = await invoiceService.UpdateOrderStatusAsync(new UpdateOrderStatusParameters
            {
                OrderId = orderId,
                NewStatus = status
            }, cancellationToken);
            if (!result.Successful)
            {
                // Log but don't fail - seeding should be resilient
                logger.LogWarning("Could not transition order {OrderId} to {Status}: {Message}",
                    orderId, status, result.Messages.FirstOrDefault()?.Message);
                break;
            }
        }
    }

    /// <summary>
    /// Payment scenarios for seed data variety.
    /// </summary>
    private enum PaymentScenario
    {
        Unpaid,
        StripeFull,
        ManualFull,
        PartialPayment,
        SplitPayment,
        Overpayment,
        Refunded,
        PurchaseOrder  // B2B Purchase Order payment
    }

    /// <summary>
    /// Creates a copy of an Address. Required because EF Core owned types cannot be shared.
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
    /// Sample customers across UK, US, EU, and Canada for testing global e-commerce scenarios.
    /// </summary>
    private static List<(Address billing, Address? shipping)> GetSampleCustomers()
    {
        return
        [
            // ============ UK CUSTOMERS (5) ============
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
            }, new Address
            {
                Name = "John Smith (Work)",
                Phone = "+44 20 7946 1234",
                Company = "Smith Industries",
                AddressOne = "456 Business Park",
                AddressTwo = "Unit 7",
                TownCity = "London",
                CountyState = new CountyState { Name = "Greater London", RegionCode = "LND" },
                PostalCode = "E14 5AB",
                Country = "United Kingdom",
                CountryCode = "GB"
            }),

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

            // ============ US CUSTOMERS (5) ============
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
                TownCity = "Los Angeles",
                CountyState = new CountyState { Name = "California", RegionCode = "CA" },
                PostalCode = "90048",
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

            (new Address
            {
                Name = "Jennifer Garcia",
                Email = "j.garcia@example.com",
                Phone = "+1 305 555 0189",
                AddressOne = "1200 Brickell Ave",
                AddressTwo = "Suite 800",
                TownCity = "Miami",
                CountyState = new CountyState { Name = "Florida", RegionCode = "FL" },
                PostalCode = "33131",
                Country = "United States",
                CountryCode = "US"
            }, null),

            (new Address
            {
                Name = "Robert Chen",
                Email = "r.chen@example.com",
                Phone = "+1 206 555 0234",
                AddressOne = "400 Pine Street",
                TownCity = "Seattle",
                CountyState = new CountyState { Name = "Washington", RegionCode = "WA" },
                PostalCode = "98101",
                Country = "United States",
                CountryCode = "US"
            }, null),

            // ============ EU CUSTOMERS (4) ============
            (new Address
            {
                Name = "Hans Mueller",
                Email = "h.mueller@example.com",
                Phone = "+49 30 1234 5678",
                AddressOne = "Friedrichstraße 123",
                TownCity = "Berlin",
                CountyState = new CountyState { Name = "Berlin", RegionCode = "BE" },
                PostalCode = "10117",
                Country = "Germany",
                CountryCode = "DE"
            }, null),

            (new Address
            {
                Name = "Marie Dubois",
                Email = "m.dubois@example.com",
                Phone = "+33 1 42 68 53 00",
                AddressOne = "25 Avenue des Champs-Élysées",
                TownCity = "Paris",
                CountyState = new CountyState { Name = "Île-de-France", RegionCode = "IDF" },
                PostalCode = "75008",
                Country = "France",
                CountryCode = "FR"
            }, null),

            (new Address
            {
                Name = "Jan van der Berg",
                Email = "j.vanderberg@example.com",
                Phone = "+31 20 555 1234",
                AddressOne = "Keizersgracht 100",
                TownCity = "Amsterdam",
                CountyState = new CountyState { Name = "North Holland", RegionCode = "NH" },
                PostalCode = "1015 CV",
                Country = "Netherlands",
                CountryCode = "NL"
            }, null),

            (new Address
            {
                Name = "Carlos Rodriguez",
                Email = "c.rodriguez@example.com",
                Phone = "+34 91 555 4321",
                AddressOne = "Gran Vía 45",
                TownCity = "Madrid",
                CountyState = new CountyState { Name = "Madrid", RegionCode = "MD" },
                PostalCode = "28013",
                Country = "Spain",
                CountryCode = "ES"
            }, null),

            // ============ CANADA CUSTOMERS (2) ============
            (new Address
            {
                Name = "Sophie Tremblay",
                Email = "s.tremblay@example.com",
                Phone = "+1 416 555 0199",
                AddressOne = "100 King Street West",
                AddressTwo = "Suite 1600",
                TownCity = "Toronto",
                CountyState = new CountyState { Name = "Ontario", RegionCode = "ON" },
                PostalCode = "M5X 1A9",
                Country = "Canada",
                CountryCode = "CA"
            }, null),

            (new Address
            {
                Name = "James Liu",
                Email = "j.liu@example.com",
                Phone = "+1 604 555 0178",
                AddressOne = "1055 Dunsmuir Street",
                TownCity = "Vancouver",
                CountyState = new CountyState { Name = "British Columbia", RegionCode = "BC" },
                PostalCode = "V7X 1L3",
                Country = "Canada",
                CountryCode = "CA"
            }, null)
        ];
    }

    /// <summary>
    /// Maps country code to ISO 4217 currency code for multi-currency testing.
    /// </summary>
    private static string GetCurrencyForCountry(string countryCode) => countryCode switch
    {
        "GB" => "GBP",
        "US" => "USD",
        "CA" => "CAD",
        "DE" or "FR" or "NL" or "ES" or "IT" or "BE" or "AT" => "EUR",
        "JP" => "JPY",
        "AU" => "AUD",
        _ => "USD"
    };

    /// <summary>
    /// Gets currency symbol for display purposes.
    /// </summary>
    private static string GetCurrencySymbol(string currencyCode) => currencyCode switch
    {
        "GBP" => "£",
        "EUR" => "€",
        "CAD" or "USD" or "AUD" => "$",
        "JPY" => "¥",
        _ => "$"
    };
}
