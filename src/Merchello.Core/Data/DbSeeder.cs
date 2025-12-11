using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.ExtensionMethods;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Suppliers.Factories;
using Merchello.Core.Suppliers.Models;
using Merchello.Core.Warehouses.Extensions;
using Merchello.Core.Warehouses.Factories;
using Merchello.Core.Warehouses.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Data;

/// <summary>
/// Consolidated database seeder for development and testing.
/// Seeds products, warehouses, suppliers, and invoices with realistic data.
/// </summary>
public class DbSeeder(
    MerchelloDbContext context,
    IProductService productService,
    TaxGroupFactory taxGroupFactory,
    ProductTypeFactory productTypeFactory,
    ProductCategoryFactory productCategoryFactory,
    ProductFilterGroupFactory productFilterGroupFactory,
    ProductFilterFactory productFilterFactory,
    SupplierFactory supplierFactory,
    WarehouseFactory warehouseFactory,
    IOptions<MerchelloSettings> settings,
    ILogger<DbSeeder> logger)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        // Check if already seeded
        if (await context.RootProducts.AnyAsync(cancellationToken))
        {
            logger.LogInformation("Merchello seed data: Data already exists, skipping seed");
            return;
        }

        logger.LogInformation("Merchello seed data: Starting comprehensive seed...");

        // 1. Create Tax Group (UK VAT 20%)
        var ukVat = taxGroupFactory.Create("UK VAT 20%", 20m);
        context.TaxGroups.Add(ukVat);
        logger.LogDebug("Created tax group: {Name}", ukVat.Name);

        // 2. Create Product Types
        var productTypes = CreateProductTypes();
        logger.LogDebug("Created {Count} product types", productTypes.Count);

        // 3. Create Categories
        var categories = CreateCategories();
        logger.LogDebug("Created {Count} categories", categories.Count);

        // 4. Create Supplier
        var supplier = CreateDefaultSupplier();
        logger.LogDebug("Created default supplier: {Name}", supplier.Name);

        // 5. Create Warehouses with shipping options (linked to supplier)
        var warehouses = CreateWarehouses(supplier);
        logger.LogDebug("Created {Count} warehouses for supplier", warehouses.Length);

        // 6. Create Filter Groups & Filters
        CreateFilters();
        logger.LogDebug("Created color and size filter groups");

        // 7. Create Products - Save first so we have IDs
        await context.SaveChangesAsync(cancellationToken);

        // 8. Create all products with various configurations (via ProductService)
        await CreateProductsAsync(ukVat, productTypes, categories, warehouses);
        logger.LogInformation("Merchello seed data: Created products");

        // 9. Load products and create invoices
        var products = await context.Products.ToListAsync(cancellationToken);
        var warehouseList = await context.Warehouses
            .Include(w => w.ShippingOptions)
            .ToListAsync(cancellationToken);

        var invoicePrefix = settings.Value.InvoiceNumberPrefix ?? "INV-";
        context.SeedSampleInvoices(invoicePrefix, products, warehouseList, count: 100);

        await context.SaveChangesAsync(cancellationToken);

        var invoiceCount = await context.Invoices.CountAsync(cancellationToken);
        var productCount = await context.Products.CountAsync(cancellationToken);
        logger.LogInformation("Merchello seed data: Completed - {ProductCount} products, {InvoiceCount} invoices",
            productCount, invoiceCount);
    }

    private Dictionary<string, ProductType> CreateProductTypes()
    {
        var types = new Dictionary<string, ProductType>
        {
            ["tshirt"] = productTypeFactory.Create("T-Shirt", "tshirt"),
            ["hoodie"] = productTypeFactory.Create("Hoodie", "hoodie"),
            ["polo"] = productTypeFactory.Create("Polo Shirt", "polo"),
            ["jacket"] = productTypeFactory.Create("Jacket", "jacket"),
            ["cap"] = productTypeFactory.Create("Cap/Hat", "cap"),
            ["bag"] = productTypeFactory.Create("Bag", "bag"),
            ["mug"] = productTypeFactory.Create("Mug", "mug"),
            ["accessories"] = productTypeFactory.Create("Accessories", "accessories"),
            ["digital"] = productTypeFactory.Create("Digital Product", "digital")
        };

        foreach (var type in types.Values)
        {
            context.ProductTypes.Add(type);
        }

        return types;
    }

    private Dictionary<string, ProductCategory> CreateCategories()
    {
        var categories = new Dictionary<string, ProductCategory>
        {
            ["clothing"] = productCategoryFactory.Create("Clothing"),
            ["tshirts"] = productCategoryFactory.Create("T-Shirts"),
            ["hoodies"] = productCategoryFactory.Create("Hoodies & Sweatshirts"),
            ["polos"] = productCategoryFactory.Create("Polo Shirts"),
            ["jackets"] = productCategoryFactory.Create("Jackets & Outerwear"),
            ["headwear"] = productCategoryFactory.Create("Headwear"),
            ["bags"] = productCategoryFactory.Create("Bags & Totes"),
            ["drinkware"] = productCategoryFactory.Create("Drinkware"),
            ["accessories"] = productCategoryFactory.Create("Accessories"),
            ["digital"] = productCategoryFactory.Create("Digital Products")
        };

        foreach (var category in categories.Values)
        {
            context.ProductCategories.Add(category);
        }

        return categories;
    }

    private Supplier CreateDefaultSupplier()
    {
        var supplier = supplierFactory.Create("Default Supplier", new Address
        {
            Company = "Merchello Demo Ltd",
            Country = "United Kingdom",
            CountryCode = "GB"
        });
        supplier.Code = "MERCH-01";
        supplier.ContactName = "Sales Team";
        supplier.ContactEmail = "sales@merchello-demo.com";
        supplier.ContactPhone = "+44 20 1234 5678";

        context.Suppliers.Add(supplier);
        return supplier;
    }

    private Warehouse[] CreateWarehouses(Supplier supplier)
    {
        var warehouse1Result = context.CreateWarehouseWithOptions(
            warehouseFactory,
            "UK Fulfillment Center",
            code: "UK-FC-01",
            address: new Address
            {
                Country = "United Kingdom",
                CountryCode = "GB"
            },
            supplier: supplier,
            serviceRegions:
            [
                ("GB", null, false),
                ("GB", "NIR", true)
            ],
            shippingOptions:
            [
                new ShippingOptionConfig { Name = "Standard Delivery", DaysFrom = 3, DaysTo = 5, Cost = 4.99m },
                new ShippingOptionConfig { Name = "Express Delivery", DaysFrom = 1, DaysTo = 2, Cost = 7.99m },
                new ShippingOptionConfig { Name = "Next Day", DaysFrom = 1, DaysTo = 1, Cost = 9.99m, IsNextDay = true }
            ]);

        var warehouse2Result = context.CreateWarehouseWithOptions(
            warehouseFactory,
            "London Distribution",
            code: "UK-FC-02",
            address: new Address
            {
                Country = "United Kingdom",
                CountryCode = "GB"
            },
            supplier: supplier,
            serviceRegions:
            [
                ("GB", null, false),
                ("GB", "NIR", true)
            ],
            shippingOptions:
            [
                new ShippingOptionConfig { Name = "Standard Delivery", DaysFrom = 3, DaysTo = 5, Cost = 4.99m },
                new ShippingOptionConfig { Name = "Express Delivery", DaysFrom = 1, DaysTo = 2, Cost = 7.99m },
                new ShippingOptionConfig { Name = "Next Day", DaysFrom = 1, DaysTo = 1, Cost = 9.99m, IsNextDay = true },
                new ShippingOptionConfig { Name = "White Glove", DaysFrom = 5, DaysTo = 10, Cost = 29.99m }
            ]);

        var warehouse3Result = context.CreateWarehouseWithOptions(
            warehouseFactory,
            "Manchester Depot",
            code: "UK-FC-03",
            address: new Address
            {
                Country = "United Kingdom",
                CountryCode = "GB"
            },
            supplier: supplier,
            serviceRegions:
            [
                ("GB", null, false),
                ("GB", "NIR", true)
            ],
            shippingOptions:
            [
                new ShippingOptionConfig { Name = "Standard Delivery", DaysFrom = 3, DaysTo = 5, Cost = 4.99m },
                new ShippingOptionConfig { Name = "Express Delivery", DaysFrom = 1, DaysTo = 2, Cost = 7.99m }
            ]);

        return [warehouse1Result.ResultObject!, warehouse2Result.ResultObject!, warehouse3Result.ResultObject!];
    }

    private void CreateFilters()
    {
        // Extended color palette
        var colors = new[] { "Black", "White", "Navy", "Grey", "Burgundy", "Forest Green", "Natural", "Red",
                            "Royal Blue", "Heather Grey", "Charcoal", "Olive", "Tan", "Pink", "Sky Blue" };

        var (colorFilterGroup, _) = productFilterGroupFactory.CreateColorFilterGroup(
            productFilterFactory, colors);

        // Extended sizes including XS
        var sizes = new[] { "XS", "S", "M", "L", "XL", "2XL" };
        var (sizeFilterGroup, _) = productFilterGroupFactory.CreateSizeFilterGroup(
            productFilterFactory, sizes);

        context.ProductFilterGroups.Add(colorFilterGroup);
        context.ProductFilterGroups.Add(sizeFilterGroup);
    }

    private async Task CreateProductsAsync(
        TaxGroup taxGroup,
        Dictionary<string, ProductType> productTypes,
        Dictionary<string, ProductCategory> categories,
        Warehouse[] warehouses)
    {
        var standardSizes = new[] { "S", "M", "L", "XL" };
        var extendedSizes = new[] { "XS", "S", "M", "L", "XL", "2XL" };

        // ============ T-SHIRTS (5 products, various stock scenarios) ============

        // Classic Cotton Tee - HIGH STOCK in all 3 warehouses
        await CreateProductAsync("Classic Cotton Tee",
            "Comfortable 100% cotton t-shirt with a classic fit. A wardrobe staple.",
            19.99m, taxGroup, productTypes["tshirt"], [categories["clothing"], categories["tshirts"]],
            0.2m, ["Black", "White", "Navy"], standardSizes,
            warehouses, [(0, 50, 100, true), (1, 40, 80, true), (2, 30, 60, true)]);

        // Premium V-Neck - LOW STOCK
        await CreateProductAsync("Premium V-Neck",
            "Premium quality v-neck t-shirt with a modern fit. Limited availability.",
            24.99m, taxGroup, productTypes["tshirt"], [categories["clothing"], categories["tshirts"]],
            0.2m, ["Grey", "White", "Burgundy"], standardSizes,
            warehouses, [(0, 3, 8, true), (1, 5, 12, true)]);

        // Organic Crew Neck - OUT OF STOCK
        await CreateProductAsync("Organic Crew Neck",
            "100% organic cotton crew neck, sustainably produced.",
            27.99m, taxGroup, productTypes["tshirt"], [categories["clothing"], categories["tshirts"]],
            0.2m, ["Forest Green", "Black", "Natural"], standardSizes,
            warehouses, [(2, 0, 0, true)]);

        // Graphic Print Tee - MIXED STOCK
        await CreateProductAsync("Graphic Print Tee",
            "Bold graphic print t-shirt for statement style.",
            22.99m, taxGroup, productTypes["tshirt"], [categories["clothing"], categories["tshirts"]],
            0.2m, ["White", "Black", "Red"], standardSizes,
            warehouses, [(0, 0, 2, true), (1, 3, 8, true), (2, 20, 40, true)]);

        // Long Sleeve Tee
        await CreateProductAsync("Long Sleeve Tee",
            "Long sleeve cotton t-shirt perfect for layering.",
            29.99m, taxGroup, productTypes["tshirt"], [categories["clothing"], categories["tshirts"]],
            0.25m, ["Navy", "Grey", "Black"], standardSizes,
            warehouses, [(0, 15, 30, true), (1, 20, 35, true)]);

        // ============ HOODIES (3 products, many variants) ============

        // Premium Hoodie - LOTS OF VARIANTS (4 colors × 6 sizes = 24 variants)
        await CreateProductAsync("Premium Pullover Hoodie",
            "Heavyweight premium hoodie with kangaroo pocket. Soft brushed fleece interior.",
            59.99m, taxGroup, productTypes["hoodie"], [categories["clothing"], categories["hoodies"]],
            0.6m, ["Black", "Navy", "Heather Grey", "Burgundy"], extendedSizes,
            warehouses, [(0, 20, 50, true), (1, 15, 40, true), (2, 10, 30, true)]);

        // Zip-Up Hoodie
        await CreateProductAsync("Classic Zip Hoodie",
            "Full zip hoodie with metal zipper and split kangaroo pockets.",
            64.99m, taxGroup, productTypes["hoodie"], [categories["clothing"], categories["hoodies"]],
            0.65m, ["Black", "Charcoal", "Navy"], standardSizes,
            warehouses, [(0, 15, 35, true), (1, 10, 25, true)]);

        // Lightweight Hoodie
        await CreateProductAsync("Lightweight Summer Hoodie",
            "Breathable lightweight hoodie perfect for cool summer evenings.",
            44.99m, taxGroup, productTypes["hoodie"], [categories["clothing"], categories["hoodies"]],
            0.4m, ["White", "Sky Blue", "Grey"], standardSizes,
            warehouses, [(1, 25, 50, true)]);

        // ============ POLO SHIRTS (2 products) ============

        // Classic Polo - MANY COLORS
        await CreateProductAsync("Classic Pique Polo",
            "Timeless pique polo shirt with ribbed collar and cuffs.",
            34.99m, taxGroup, productTypes["polo"], [categories["clothing"], categories["polos"]],
            0.3m, ["White", "Navy", "Black", "Royal Blue", "Burgundy"], standardSizes,
            warehouses, [(0, 20, 45, true), (1, 15, 35, true), (2, 10, 25, true)]);

        // Performance Polo
        await CreateProductAsync("Performance Polo",
            "Moisture-wicking performance polo, perfect for golf or active wear.",
            39.99m, taxGroup, productTypes["polo"], [categories["clothing"], categories["polos"]],
            0.25m, ["White", "Black", "Grey", "Navy"], standardSizes,
            warehouses, [(0, 12, 30, true), (1, 8, 20, true)]);

        // ============ JACKETS (3 products) ============

        // Bomber Jacket - LIMITED
        await CreateProductAsync("Classic Bomber Jacket",
            "Retro-style bomber jacket with ribbed cuffs and hem.",
            89.99m, taxGroup, productTypes["jacket"], [categories["clothing"], categories["jackets"]],
            0.8m, ["Black", "Olive"], extendedSizes,
            warehouses, [(0, 5, 15, true), (1, 3, 10, true)]);

        // Denim Jacket
        await CreateProductAsync("Denim Jacket",
            "Classic denim jacket with button front and chest pockets.",
            79.99m, taxGroup, productTypes["jacket"], [categories["clothing"], categories["jackets"]],
            0.9m, ["Navy", "Black", "Sky Blue"], extendedSizes,
            warehouses, [(0, 8, 20, true), (1, 5, 15, true), (2, 3, 10, true)]);

        // Softshell Jacket
        await CreateProductAsync("Softshell Jacket",
            "Water-resistant softshell jacket with fleece lining.",
            99.99m, taxGroup, productTypes["jacket"], [categories["clothing"], categories["jackets"]],
            0.7m, ["Black", "Charcoal", "Navy"], extendedSizes,
            warehouses, [(0, 10, 25, true), (1, 8, 20, true)]);

        // ============ CAPS & HATS (3 products, color only variants) ============

        // Baseball Cap - MANY COLORS
        await CreateProductAsync("Classic Baseball Cap",
            "Adjustable cotton twill baseball cap with curved brim.",
            19.99m, taxGroup, productTypes["cap"], [categories["headwear"]],
            0.1m, ["Black", "Navy", "White", "Red", "Grey", "Olive"], null,
            warehouses, [(0, 30, 60, true), (1, 25, 50, true), (2, 20, 40, true)]);

        // Snapback
        await CreateProductAsync("Snapback Cap",
            "Flat brim snapback cap with adjustable strap.",
            24.99m, taxGroup, productTypes["cap"], [categories["headwear"]],
            0.12m, ["Black", "Navy", "Heather Grey", "Burgundy"], null,
            warehouses, [(0, 20, 40, true), (1, 15, 30, true)]);

        // Beanie
        await CreateProductAsync("Knit Beanie",
            "Warm knit beanie with fold-up cuff.",
            14.99m, taxGroup, productTypes["cap"], [categories["headwear"]],
            0.08m, ["Black", "Grey", "Navy", "Burgundy", "Forest Green"], null,
            warehouses, [(0, 40, 80, true), (1, 30, 60, true), (2, 25, 50, true)]);

        // ============ BAGS (3 products) ============

        // Canvas Tote
        await CreateProductAsync("Canvas Tote Bag",
            "Sturdy canvas tote bag with reinforced handles.",
            14.99m, taxGroup, productTypes["bag"], [categories["bags"]],
            0.3m, ["Natural", "Black", "Navy", "Grey"], null,
            warehouses, [(0, 50, 100, true), (1, 40, 80, true)]);

        // Backpack - WITH SIZE VARIANTS
        await CreateProductAsync("Classic Backpack",
            "Durable everyday backpack with laptop compartment.",
            49.99m, taxGroup, productTypes["bag"], [categories["bags"]],
            0.5m, ["Black", "Navy", "Grey"], ["S", "L"],
            warehouses, [(0, 15, 35, true), (1, 10, 25, true)]);

        // Gym Bag
        await CreateProductAsync("Duffle Gym Bag",
            "Spacious duffle bag with shoe compartment.",
            39.99m, taxGroup, productTypes["bag"], [categories["bags"]],
            0.4m, ["Black", "Navy", "Charcoal"], null,
            warehouses, [(0, 20, 40, true), (1, 15, 30, true)]);

        // ============ MUGS (2 products, many color variants) ============

        // Ceramic Mug - MANY COLORS
        await CreateProductAsync("Ceramic Mug (11oz)",
            "Classic 11oz ceramic mug, dishwasher and microwave safe.",
            12.99m, taxGroup, productTypes["mug"], [categories["drinkware"]],
            0.35m, ["White", "Black", "Navy", "Red", "Pink", "Sky Blue", "Grey", "Forest Green"], null,
            warehouses, [(0, 50, 100, true), (1, 40, 80, true), (2, 30, 60, true)]);

        // Travel Mug
        await CreateProductAsync("Insulated Travel Mug",
            "16oz stainless steel travel mug with leak-proof lid.",
            24.99m, taxGroup, productTypes["mug"], [categories["drinkware"]],
            0.4m, ["Black", "White", "Navy", "Red"], null,
            warehouses, [(0, 25, 50, true), (1, 20, 40, true)]);

        // ============ ACCESSORIES & DIGITAL (no variants, untracked) ============

        // Sticker Pack - NO VARIANTS, UNTRACKED
        await CreateProductAsync("Sticker Pack (10 pcs)",
            "Assorted vinyl sticker pack, weatherproof and durable.",
            9.99m, taxGroup, productTypes["accessories"], [categories["accessories"]],
            0.05m, null, null,
            warehouses, [(0, 0, 0, false)]);

        // Poster Print - SIZE VARIANTS ONLY, PRINT ON DEMAND
        await CreateProductAsync("Art Print Poster",
            "High-quality giclée art print on premium paper.",
            19.99m, taxGroup, productTypes["accessories"], [categories["accessories"]],
            0.1m, null, ["A4", "A3", "A2"],
            warehouses, [(0, 0, 0, false)]);

        // Gift Cards - AMOUNT VARIANTS, DIGITAL
        await CreateProductWithAmountVariantsAsync("Gift Card",
            "Digital gift card, delivered via email.",
            taxGroup, productTypes["digital"], [categories["digital"]],
            warehouses[0], [25m, 50m, 75m, 100m]);

        // Custom Print Service - NO VARIANTS, MADE TO ORDER
        await CreateProductAsync("Custom Print Service",
            "Made-to-order custom print service. Upload your design!",
            34.99m, taxGroup, productTypes["digital"], [categories["digital"]],
            0.2m, null, null,
            warehouses, [(0, 0, 0, false), (1, 0, 0, false)]);
    }

    private async Task CreateProductAsync(
        string name,
        string description,
        decimal price,
        TaxGroup taxGroup,
        ProductType productType,
        List<ProductCategory> productCategories,
        decimal weight,
        string[]? colors,
        string[]? sizes,
        Warehouse[] warehouses,
        List<(int warehouseIndex, int minStock, int maxStock, bool trackStock)> stockConfig)
    {
        var warehouseList = stockConfig.Select(s => (warehouses[s.warehouseIndex], s.warehouseIndex + 1)).ToList();

        await productService.CreateProductRootWithVariantsAsync(
            name,
            description,
            price,
            taxGroup,
            productType,
            categories: productCategories,
            weight: weight,
            colors: colors,
            sizes: sizes,
            warehouses: warehouseList,
            warehouseStockRanges: stockConfig);
    }

    private async Task CreateProductWithAmountVariantsAsync(
        string name,
        string description,
        TaxGroup taxGroup,
        ProductType productType,
        List<ProductCategory> categories,
        Warehouse warehouse,
        decimal[] amounts)
    {
        foreach (var amount in amounts)
        {
            var variantName = $"{name} - £{amount:0}";
            await productService.CreateProductRootWithVariantsAsync(
                variantName,
                description,
                amount,
                taxGroup,
                productType,
                categories: categories,
                weight: 0,
                colors: null,
                sizes: null,
                warehouses: [(warehouse, 1)],
                warehouseStockRanges: [(0, 0, 0, false)]);
        }
    }
}
