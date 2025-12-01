using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.Data.Migrations.SqlServer
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MerchBaskets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LineItems = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    Adjustments = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    CurrencySymbol = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: true),
                    TaxRounding = table.Column<int>(type: "int", nullable: false),
                    SubTotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Discount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    AdjustedSubTotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Tax = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Total = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Shipping = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    BillingAddress = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ShippingAddress = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchBaskets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MerchInvoices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Adjustments = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    TaxRounding = table.Column<int>(type: "int", nullable: false),
                    SubTotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Discount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    AdjustedSubTotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Tax = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Total = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchInvoices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MerchProductCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProductCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MerchProductFilterGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProductFilterGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MerchProductTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Alias = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProductTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MerchShippingProviderConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    SettingsJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    UpdateDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreateDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchShippingProviderConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MerchTaxGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    TaxPercentage = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchTaxGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MerchWarehouses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AutomationMethod = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ExtendedData = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchWarehouses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MerchOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShippingOptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShippingAddress_Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingAddress_Company = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingAddress_AddressOne = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingAddress_AddressTwo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingAddress_TownCity = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingAddress_CountyState_Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingAddress_CountyState_RegionCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingAddress_PostalCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingAddress_Country = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingAddress_CountryCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingAddress_Email = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingAddress_Phone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShippingCost = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    RequestedDeliveryDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeliveryDateGuaranteed = table.Column<bool>(type: "bit", nullable: true),
                    DeliveryDateSurcharge = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ProcessingStartedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ShippedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancelledDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancellationReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    InternalNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MerchOrders_MerchInvoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "MerchInvoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PaymentMethod = table.Column<string>(type: "nvarchar(350)", maxLength: 350, nullable: true),
                    TransactionId = table.Column<string>(type: "nvarchar(350)", maxLength: 350, nullable: true),
                    FraudResponse = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    PaymentSuccess = table.Column<bool>(type: "bit", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MerchPayments_MerchInvoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "MerchInvoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchProductFilters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    HexColour = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Image = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ProductFilterGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProductFilters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MerchProductFilters_MerchProductFilterGroups_ProductFilterGroupId",
                        column: x => x.ProductFilterGroupId,
                        principalTable: "MerchProductFilterGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MerchProductRoots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RootName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProductOptions = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    TaxGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GoogleShoppingFeedCategory = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    RootImages = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    RootUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    SellingPoints = table.Column<string>(type: "nvarchar(1500)", maxLength: 1500, nullable: false),
                    Videos = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Weight = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    HsCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProductRoots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MerchProductRoots_MerchProductTypes_ProductTypeId",
                        column: x => x.ProductTypeId,
                        principalTable: "MerchProductTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MerchProductRoots_MerchTaxGroups_TaxGroupId",
                        column: x => x.TaxGroupId,
                        principalTable: "MerchTaxGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MerchShippingOptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(350)", maxLength: 350, nullable: true),
                    FixedCost = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    CalculationMethod = table.Column<string>(type: "nvarchar(1500)", maxLength: 1500, nullable: true),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DaysFrom = table.Column<int>(type: "int", nullable: false),
                    DaysTo = table.Column<int>(type: "int", nullable: false),
                    IsNextDay = table.Column<bool>(type: "bit", nullable: false),
                    NextDayCutOffTime = table.Column<TimeSpan>(type: "time", nullable: true),
                    AllowsDeliveryDateSelection = table.Column<bool>(type: "bit", nullable: false),
                    MinDeliveryDays = table.Column<int>(type: "int", nullable: true),
                    MaxDeliveryDays = table.Column<int>(type: "int", nullable: true),
                    AllowedDaysOfWeek = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeliveryDateGuaranteed = table.Column<bool>(type: "bit", nullable: false),
                    DeliveryDatePricingMethod = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdateDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreateDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchShippingOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MerchShippingOptions_MerchWarehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "MerchWarehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchWarehouseServiceRegions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CountryCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    StateOrProvinceCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsExcluded = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchWarehouseServiceRegions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MerchWarehouseServiceRegions_MerchWarehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "MerchWarehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchLineItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Sku = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Name = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DependantLineItemSku = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LineItemType = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    OriginalAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    IsTaxable = table.Column<bool>(type: "bit", nullable: false),
                    TaxRate = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExtendedData = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchLineItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MerchLineItems_MerchInvoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "MerchInvoices",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MerchLineItems_MerchOrders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "MerchOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchShipments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LineItems = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(1500)", maxLength: 1500, nullable: false),
                    CourierId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SupplierId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TrackingNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TrackingUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Carrier = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RequestedDeliveryDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeliveryDateGuaranteed = table.Column<bool>(type: "bit", nullable: true),
                    ActualDeliveryDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchShipments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MerchShipments_MerchOrders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "MerchOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MerchShipments_MerchWarehouses_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "MerchWarehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchProductRootCategories",
                columns: table => new
                {
                    CategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductRootId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProductRootCategories", x => new { x.CategoryId, x.ProductRootId });
                    table.ForeignKey(
                        name: "FK_MerchProductRootCategories_MerchProductCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "MerchProductCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MerchProductRootCategories_MerchProductRoots_ProductRootId",
                        column: x => x.ProductRootId,
                        principalTable: "MerchProductRoots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchProductRootWarehouse",
                columns: table => new
                {
                    ProductRootId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PriorityOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProductRootWarehouse", x => new { x.ProductRootId, x.WarehouseId });
                    table.ForeignKey(
                        name: "FK_MerchProductRootWarehouse_MerchProductRoots_ProductRootId",
                        column: x => x.ProductRootId,
                        principalTable: "MerchProductRoots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MerchProductRootWarehouse_MerchWarehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "MerchWarehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchProducts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductRootId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Default = table.Column<bool>(type: "bit", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CostOfGoods = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    OnSale = table.Column<bool>(type: "bit", nullable: false),
                    PreviousPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    AvailableForPurchase = table.Column<bool>(type: "bit", nullable: false),
                    CanPurchase = table.Column<bool>(type: "bit", nullable: false),
                    Images = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", maxLength: 5000, nullable: true),
                    ExcludeRootProductImages = table.Column<bool>(type: "bit", nullable: false),
                    Gtin = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Sku = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    SupplierSku = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    MetaDescription = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PageTitle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    NoIndex = table.Column<bool>(type: "bit", nullable: false),
                    OpenGraphImage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShoppingFeedTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ShoppingFeedDescription = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ShoppingFeedColour = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ShoppingFeedMaterial = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ShoppingFeedSize = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ExcludeFromCustomLabels = table.Column<bool>(type: "bit", nullable: false),
                    RemoveFromFeed = table.Column<bool>(type: "bit", nullable: false),
                    VariantOptionsKey = table.Column<string>(type: "nvarchar(1500)", maxLength: 1500, nullable: true),
                    Url = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ShippingRestrictionMode = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProducts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MerchProducts_MerchProductRoots_ProductRootId",
                        column: x => x.ProductRootId,
                        principalTable: "MerchProductRoots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchShippingCosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CountryCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    StateOrProvinceCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Cost = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ShippingOptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchShippingCosts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MerchShippingCosts_MerchShippingOptions_ShippingOptionId",
                        column: x => x.ShippingOptionId,
                        principalTable: "MerchShippingOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchShippingOptionCountries",
                columns: table => new
                {
                    ShippingOptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CountryCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Country_Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Country_CountryCode = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchShippingOptionCountries", x => new { x.ShippingOptionId, x.CountryCode });
                    table.ForeignKey(
                        name: "FK_MerchShippingOptionCountries_MerchShippingOptions_ShippingOptionId",
                        column: x => x.ShippingOptionId,
                        principalTable: "MerchShippingOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchProductAllowedShippingOptions",
                columns: table => new
                {
                    AllowedShippingOptionsId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProductAllowedShippingOptions", x => new { x.AllowedShippingOptionsId, x.ProductId });
                    table.ForeignKey(
                        name: "FK_MerchProductAllowedShippingOptions_MerchProducts_ProductId",
                        column: x => x.ProductId,
                        principalTable: "MerchProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MerchProductAllowedShippingOptions_MerchShippingOptions_AllowedShippingOptionsId",
                        column: x => x.AllowedShippingOptionsId,
                        principalTable: "MerchShippingOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchProductExcludedShippingOptions",
                columns: table => new
                {
                    ExcludedShippingOptionsId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Product1Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProductExcludedShippingOptions", x => new { x.ExcludedShippingOptionsId, x.Product1Id });
                    table.ForeignKey(
                        name: "FK_MerchProductExcludedShippingOptions_MerchProducts_Product1Id",
                        column: x => x.Product1Id,
                        principalTable: "MerchProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MerchProductExcludedShippingOptions_MerchShippingOptions_ExcludedShippingOptionsId",
                        column: x => x.ExcludedShippingOptionsId,
                        principalTable: "MerchShippingOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchProductFiltersProducts",
                columns: table => new
                {
                    FilterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProductFiltersProducts", x => new { x.FilterId, x.ProductId });
                    table.ForeignKey(
                        name: "FK_MerchProductFiltersProducts_MerchProductFilters_FilterId",
                        column: x => x.FilterId,
                        principalTable: "MerchProductFilters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MerchProductFiltersProducts_MerchProducts_ProductId",
                        column: x => x.ProductId,
                        principalTable: "MerchProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchProductRootShippingOptions",
                columns: table => new
                {
                    ProductRootId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShippingOptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProductRootShippingOptions", x => new { x.ProductRootId, x.ShippingOptionId });
                    table.ForeignKey(
                        name: "FK_MerchProductRootShippingOptions_MerchProducts_ProductRootId",
                        column: x => x.ProductRootId,
                        principalTable: "MerchProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MerchProductRootShippingOptions_MerchShippingOptions_ShippingOptionId",
                        column: x => x.ShippingOptionId,
                        principalTable: "MerchShippingOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchProductWarehouse",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Stock = table.Column<int>(type: "int", nullable: false),
                    ReorderPoint = table.Column<int>(type: "int", nullable: true),
                    ReorderQuantity = table.Column<int>(type: "int", nullable: true),
                    TrackStock = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    ReservedStock = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProductWarehouse", x => new { x.ProductId, x.WarehouseId });
                    table.ForeignKey(
                        name: "FK_MerchProductWarehouse_MerchProducts_ProductId",
                        column: x => x.ProductId,
                        principalTable: "MerchProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MerchProductWarehouse_MerchWarehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "MerchWarehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchProductWarehousePriceOverride",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    CostOfGoods = table.Column<decimal>(type: "decimal(18,2)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProductWarehousePriceOverride", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MerchProductWarehousePriceOverride_MerchProducts_ProductId",
                        column: x => x.ProductId,
                        principalTable: "MerchProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MerchProductWarehousePriceOverride_MerchWarehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "MerchWarehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchShippingOptionCountries_CountyStates",
                columns: table => new
                {
                    CountryShippingOptionCountryShippingOptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CountryShippingOptionCountryCountryCode = table.Column<string>(type: "nvarchar(10)", nullable: false),
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RegionCode = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchShippingOptionCountries_CountyStates", x => new { x.CountryShippingOptionCountryShippingOptionId, x.CountryShippingOptionCountryCountryCode, x.Id });
                    table.ForeignKey(
                        name: "FK_MerchShippingOptionCountries_CountyStates_MerchShippingOptionCountries_CountryShippingOptionCountryShippingOptionId_CountryS~",
                        columns: x => new { x.CountryShippingOptionCountryShippingOptionId, x.CountryShippingOptionCountryCountryCode },
                        principalTable: "MerchShippingOptionCountries",
                        principalColumns: new[] { "ShippingOptionId", "CountryCode" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MerchLineItems_InvoiceId",
                table: "MerchLineItems",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchLineItems_OrderId",
                table: "MerchLineItems",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchOrders_InvoiceId",
                table: "MerchOrders",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchPayments_InvoiceId",
                table: "MerchPayments",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchProductAllowedShippingOptions_ProductId",
                table: "MerchProductAllowedShippingOptions",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchProductExcludedShippingOptions_Product1Id",
                table: "MerchProductExcludedShippingOptions",
                column: "Product1Id");

            migrationBuilder.CreateIndex(
                name: "IX_MerchProductFilters_ProductFilterGroupId",
                table: "MerchProductFilters",
                column: "ProductFilterGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchProductFiltersProducts_ProductId",
                table: "MerchProductFiltersProducts",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchProductRootCategories_ProductRootId",
                table: "MerchProductRootCategories",
                column: "ProductRootId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchProductRoots_ProductTypeId",
                table: "MerchProductRoots",
                column: "ProductTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchProductRoots_TaxGroupId",
                table: "MerchProductRoots",
                column: "TaxGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchProductRootShippingOptions_ShippingOptionId",
                table: "MerchProductRootShippingOptions",
                column: "ShippingOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchProductRootWarehouse_WarehouseId",
                table: "MerchProductRootWarehouse",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchProducts_Price",
                table: "MerchProducts",
                column: "Price");

            migrationBuilder.CreateIndex(
                name: "IX_MerchProducts_ProductRootId",
                table: "MerchProducts",
                column: "ProductRootId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchProductWarehouse_WarehouseId",
                table: "MerchProductWarehouse",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchProductWarehousePriceOverride_ProductId",
                table: "MerchProductWarehousePriceOverride",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchProductWarehousePriceOverride_WarehouseId",
                table: "MerchProductWarehousePriceOverride",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchShipments_OrderId",
                table: "MerchShipments",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchShipments_SupplierId",
                table: "MerchShipments",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchShippingCosts_ShippingOptionId",
                table: "MerchShippingCosts",
                column: "ShippingOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchShippingOptions_WarehouseId",
                table: "MerchShippingOptions",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchWarehouseServiceRegions_WarehouseId",
                table: "MerchWarehouseServiceRegions",
                column: "WarehouseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MerchBaskets");

            migrationBuilder.DropTable(
                name: "MerchLineItems");

            migrationBuilder.DropTable(
                name: "MerchPayments");

            migrationBuilder.DropTable(
                name: "MerchProductAllowedShippingOptions");

            migrationBuilder.DropTable(
                name: "MerchProductExcludedShippingOptions");

            migrationBuilder.DropTable(
                name: "MerchProductFiltersProducts");

            migrationBuilder.DropTable(
                name: "MerchProductRootCategories");

            migrationBuilder.DropTable(
                name: "MerchProductRootShippingOptions");

            migrationBuilder.DropTable(
                name: "MerchProductRootWarehouse");

            migrationBuilder.DropTable(
                name: "MerchProductWarehouse");

            migrationBuilder.DropTable(
                name: "MerchProductWarehousePriceOverride");

            migrationBuilder.DropTable(
                name: "MerchShipments");

            migrationBuilder.DropTable(
                name: "MerchShippingCosts");

            migrationBuilder.DropTable(
                name: "MerchShippingOptionCountries_CountyStates");

            migrationBuilder.DropTable(
                name: "MerchShippingProviderConfigurations");

            migrationBuilder.DropTable(
                name: "MerchWarehouseServiceRegions");

            migrationBuilder.DropTable(
                name: "MerchProductFilters");

            migrationBuilder.DropTable(
                name: "MerchProductCategories");

            migrationBuilder.DropTable(
                name: "MerchProducts");

            migrationBuilder.DropTable(
                name: "MerchOrders");

            migrationBuilder.DropTable(
                name: "MerchShippingOptionCountries");

            migrationBuilder.DropTable(
                name: "MerchProductFilterGroups");

            migrationBuilder.DropTable(
                name: "MerchProductRoots");

            migrationBuilder.DropTable(
                name: "MerchInvoices");

            migrationBuilder.DropTable(
                name: "MerchShippingOptions");

            migrationBuilder.DropTable(
                name: "MerchProductTypes");

            migrationBuilder.DropTable(
                name: "MerchTaxGroups");

            migrationBuilder.DropTable(
                name: "MerchWarehouses");
        }
    }
}
