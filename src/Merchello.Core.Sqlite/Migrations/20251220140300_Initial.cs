using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "merchelloBaskets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CustomerId = table.Column<Guid>(type: "TEXT", nullable: true),
                    LineItems = table.Column<string>(type: "TEXT", maxLength: 3000, nullable: false),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Currency = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    CurrencySymbol = table.Column<string>(type: "TEXT", maxLength: 3, nullable: true),
                    SubTotal = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    Discount = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    AdjustedSubTotal = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    Tax = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    Total = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    Shipping = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    BillingAddress = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    ShippingAddress = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloBaskets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloCustomers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Email = table.Column<string>(type: "TEXT", maxLength: 254, nullable: false),
                    MemberKey = table.Column<Guid>(type: "TEXT", nullable: true),
                    FirstName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    LastName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloCustomers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloCustomerSegments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    SegmentType = table.Column<int>(type: "INTEGER", nullable: false),
                    CriteriaJson = table.Column<string>(type: "TEXT", nullable: true),
                    MatchMode = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsSystemSegment = table.Column<bool>(type: "INTEGER", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloCustomerSegments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloDiscounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Category = table.Column<int>(type: "INTEGER", nullable: false),
                    Method = table.Column<int>(type: "INTEGER", nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    ValueType = table.Column<int>(type: "INTEGER", nullable: false),
                    Value = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    ApplyAfterTax = table.Column<bool>(type: "INTEGER", nullable: false),
                    StartsAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndsAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Timezone = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    TotalUsageLimit = table.Column<int>(type: "INTEGER", nullable: true),
                    PerCustomerUsageLimit = table.Column<int>(type: "INTEGER", nullable: true),
                    PerOrderUsageLimit = table.Column<int>(type: "INTEGER", nullable: true),
                    RequirementType = table.Column<int>(type: "INTEGER", nullable: false),
                    RequirementValue = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    CanCombineWithProductDiscounts = table.Column<bool>(type: "INTEGER", nullable: false),
                    CanCombineWithOrderDiscounts = table.Column<bool>(type: "INTEGER", nullable: false),
                    CanCombineWithShippingDiscounts = table.Column<bool>(type: "INTEGER", nullable: false),
                    Priority = table.Column<int>(type: "INTEGER", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloDiscounts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloExchangeRateProviders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProviderAlias = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    ConfigurationJson = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    LastFetchedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastRatesJson = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    CreateDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdateDate = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloExchangeRateProviders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloPaymentProviders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProviderAlias = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", maxLength: 250, nullable: false),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsTestMode = table.Column<bool>(type: "INTEGER", nullable: false),
                    Configuration = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloPaymentProviders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductFilterGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductFilterGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: true),
                    Alias = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloShippingProviderConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProviderKey = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    SettingsJson = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    UpdateDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreateDate = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloShippingProviderConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloSuppliers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 250, nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Address = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    ContactName = table.Column<string>(type: "TEXT", maxLength: 250, nullable: true),
                    ContactEmail = table.Column<string>(type: "TEXT", maxLength: 250, nullable: true),
                    ContactPhone = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    ExtendedData = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloSuppliers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloTaxGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 300, nullable: true),
                    TaxPercentage = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloTaxGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloCustomerTags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CustomerId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Tag = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    DateAdded = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloCustomerTags", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloCustomerTags_merchelloCustomers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "merchelloCustomers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloInvoices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CustomerId = table.Column<Guid>(type: "TEXT", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    BillingName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    BillingCompany = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    BillingAddressOne = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    BillingAddressTwo = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    BillingTownCity = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    BillingCountyStateName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    BillingCountyStateCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    BillingPostalCode = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    BillingCountry = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    BillingCountryCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    BillingEmail = table.Column<string>(type: "TEXT", maxLength: 254, nullable: true),
                    BillingPhone = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    ShippingName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    ShippingCompany = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    ShippingAddressOne = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    ShippingAddressTwo = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    ShippingTownCity = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    ShippingCountyStateName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    ShippingCountyStateCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    ShippingPostalCode = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    ShippingCountry = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    ShippingCountryCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    ShippingEmail = table.Column<string>(type: "TEXT", maxLength: 254, nullable: true),
                    ShippingPhone = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Channel = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    PurchaseOrder = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 3000, nullable: false),
                    SubTotal = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    CurrencyCode = table.Column<string>(type: "TEXT", maxLength: 3, nullable: false),
                    CurrencySymbol = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    StoreCurrencyCode = table.Column<string>(type: "TEXT", maxLength: 3, nullable: false),
                    PricingExchangeRate = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: true),
                    PricingExchangeRateSource = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    PricingExchangeRateTimestampUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Discount = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    SubTotalInStoreCurrency = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    DiscountInStoreCurrency = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    AdjustedSubTotal = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    Tax = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    TaxInStoreCurrency = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    Total = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    TotalInStoreCurrency = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: false),
                    DateDeleted = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsCancelled = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: false),
                    DateCancelled = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CancellationReason = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    CancelledBy = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloInvoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloInvoices_merchelloCustomers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "merchelloCustomers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "merchelloCustomerSegmentMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SegmentId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CustomerId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DateAdded = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AddedBy = table.Column<Guid>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloCustomerSegmentMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloCustomerSegmentMembers_merchelloCustomerSegments_SegmentId",
                        column: x => x.SegmentId,
                        principalTable: "merchelloCustomerSegments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloDiscountBuyXGetYConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DiscountId = table.Column<Guid>(type: "TEXT", nullable: false),
                    BuyTriggerType = table.Column<int>(type: "INTEGER", nullable: false),
                    BuyTriggerValue = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    BuyTargetType = table.Column<int>(type: "INTEGER", nullable: false),
                    BuyTargetIds = table.Column<string>(type: "TEXT", nullable: true),
                    GetQuantity = table.Column<int>(type: "INTEGER", nullable: false),
                    GetTargetType = table.Column<int>(type: "INTEGER", nullable: false),
                    GetTargetIds = table.Column<string>(type: "TEXT", nullable: true),
                    GetValueType = table.Column<int>(type: "INTEGER", nullable: false),
                    GetValue = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    SelectionMethod = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloDiscountBuyXGetYConfigs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloDiscountBuyXGetYConfigs_merchelloDiscounts_DiscountId",
                        column: x => x.DiscountId,
                        principalTable: "merchelloDiscounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloDiscountEligibilityRules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DiscountId = table.Column<Guid>(type: "TEXT", nullable: false),
                    EligibilityType = table.Column<int>(type: "INTEGER", nullable: false),
                    EligibilityIds = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloDiscountEligibilityRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloDiscountEligibilityRules_merchelloDiscounts_DiscountId",
                        column: x => x.DiscountId,
                        principalTable: "merchelloDiscounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloDiscountFreeShippingConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DiscountId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CountryScope = table.Column<int>(type: "INTEGER", nullable: false),
                    CountryCodes = table.Column<string>(type: "TEXT", nullable: true),
                    ExcludeRatesOverAmount = table.Column<bool>(type: "INTEGER", nullable: false),
                    ExcludeRatesOverValue = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    AllowedShippingOptionIds = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloDiscountFreeShippingConfigs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloDiscountFreeShippingConfigs_merchelloDiscounts_DiscountId",
                        column: x => x.DiscountId,
                        principalTable: "merchelloDiscounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloDiscountTargetRules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DiscountId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TargetType = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetIds = table.Column<string>(type: "TEXT", nullable: true),
                    IsExclusion = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloDiscountTargetRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloDiscountTargetRules_merchelloDiscounts_DiscountId",
                        column: x => x.DiscountId,
                        principalTable: "merchelloDiscounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductFilters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    HexColour = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Image = table.Column<Guid>(type: "TEXT", nullable: true),
                    ProductFilterGroupId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductFilters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloProductFilters_merchelloProductFilterGroups_ProductFilterGroupId",
                        column: x => x.ProductFilterGroupId,
                        principalTable: "merchelloProductFilterGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "merchelloWarehouses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SupplierId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 250, nullable: true),
                    Code = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Address = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AutomationMethod = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    ExtendedData = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloWarehouses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloWarehouses_merchelloSuppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "merchelloSuppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductRoots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    RootName = table.Column<string>(type: "TEXT", nullable: true),
                    ProductOptions = table.Column<string>(type: "TEXT", maxLength: 3000, nullable: false),
                    TaxGroupId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProductTypeId = table.Column<Guid>(type: "TEXT", nullable: false),
                    GoogleShoppingFeedCategory = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    RootImages = table.Column<string>(type: "TEXT", maxLength: 3000, nullable: false),
                    RootUrl = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    DefaultPackageConfigurations = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    IsDigitalProduct = table.Column<bool>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 5000, nullable: true),
                    MetaDescription = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    PageTitle = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    NoIndex = table.Column<bool>(type: "INTEGER", nullable: false),
                    OpenGraphImage = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    CanonicalUrl = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    ElementPropertyData = table.Column<string>(type: "TEXT", nullable: true),
                    ViewAlias = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductRoots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloProductRoots_merchelloProductTypes_ProductTypeId",
                        column: x => x.ProductTypeId,
                        principalTable: "merchelloProductTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_merchelloProductRoots_merchelloTaxGroups_TaxGroupId",
                        column: x => x.TaxGroupId,
                        principalTable: "merchelloTaxGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "merchelloOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "TEXT", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ShippingOptionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ShippingCost = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    ShippingCostInStoreCurrency = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    RequestedDeliveryDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsDeliveryDateGuaranteed = table.Column<bool>(type: "INTEGER", nullable: true),
                    DeliveryDateSurcharge = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    DeliveryDateSurchargeInStoreCurrency = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    ProcessingStartedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ShippedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CompletedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CancelledDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CancellationReason = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    InternalNotes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloOrders_merchelloInvoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "merchelloInvoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Amount = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    CurrencyCode = table.Column<string>(type: "TEXT", maxLength: 3, nullable: false),
                    AmountInStoreCurrency = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    SettlementCurrencyCode = table.Column<string>(type: "TEXT", maxLength: 3, nullable: true),
                    SettlementExchangeRate = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: true),
                    SettlementAmount = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    SettlementExchangeRateSource = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    PaymentMethod = table.Column<string>(type: "TEXT", maxLength: 350, nullable: true),
                    PaymentProviderAlias = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    PaymentType = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    TransactionId = table.Column<string>(type: "TEXT", maxLength: 350, nullable: true),
                    FraudResponse = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    RiskScore = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: true),
                    RiskScoreSource = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    PaymentSuccess = table.Column<bool>(type: "INTEGER", nullable: false),
                    RefundReason = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    ParentPaymentId = table.Column<Guid>(type: "TEXT", nullable: true),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloPayments_merchelloInvoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "merchelloInvoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_merchelloPayments_merchelloPayments_ParentPaymentId",
                        column: x => x.ParentPaymentId,
                        principalTable: "merchelloPayments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "merchelloShippingOptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 350, nullable: true),
                    ProviderKey = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false, defaultValue: "flat-rate"),
                    ProviderSettings = table.Column<string>(type: "TEXT", nullable: true),
                    ServiceType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    FixedCost = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    CalculationMethod = table.Column<string>(type: "TEXT", maxLength: 1500, nullable: true),
                    WarehouseId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DaysFrom = table.Column<int>(type: "INTEGER", nullable: false),
                    DaysTo = table.Column<int>(type: "INTEGER", nullable: false),
                    IsNextDay = table.Column<bool>(type: "INTEGER", nullable: false),
                    NextDayCutOffTime = table.Column<TimeSpan>(type: "TEXT", nullable: true),
                    AllowsDeliveryDateSelection = table.Column<bool>(type: "INTEGER", nullable: false),
                    MinDeliveryDays = table.Column<int>(type: "INTEGER", nullable: true),
                    MaxDeliveryDays = table.Column<int>(type: "INTEGER", nullable: true),
                    AllowedDaysOfWeek = table.Column<string>(type: "TEXT", nullable: true),
                    IsDeliveryDateGuaranteed = table.Column<bool>(type: "INTEGER", nullable: false),
                    DeliveryDatePricingMethod = table.Column<string>(type: "TEXT", nullable: true),
                    UpdateDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreateDate = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloShippingOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloShippingOptions_merchelloWarehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "merchelloWarehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloWarehouseServiceRegions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CountryCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    StateOrProvinceCode = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    IsExcluded = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloWarehouseServiceRegions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloWarehouseServiceRegions_merchelloWarehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "merchelloWarehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductRootCategories",
                columns: table => new
                {
                    CategoryId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProductRootId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductRootCategories", x => new { x.CategoryId, x.ProductRootId });
                    table.ForeignKey(
                        name: "FK_merchelloProductRootCategories_merchelloProductCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "merchelloProductCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_merchelloProductRootCategories_merchelloProductRoots_ProductRootId",
                        column: x => x.ProductRootId,
                        principalTable: "merchelloProductRoots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductRootWarehouse",
                columns: table => new
                {
                    ProductRootId = table.Column<Guid>(type: "TEXT", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PriorityOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductRootWarehouse", x => new { x.ProductRootId, x.WarehouseId });
                    table.ForeignKey(
                        name: "FK_merchelloProductRootWarehouse_merchelloProductRoots_ProductRootId",
                        column: x => x.ProductRootId,
                        principalTable: "merchelloProductRoots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_merchelloProductRootWarehouse_merchelloWarehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "merchelloWarehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProducts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProductRootId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Default = table.Column<bool>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    CostOfGoods = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    Price = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    OnSale = table.Column<bool>(type: "INTEGER", nullable: false),
                    PreviousPrice = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    AvailableForPurchase = table.Column<bool>(type: "INTEGER", nullable: false),
                    CanPurchase = table.Column<bool>(type: "INTEGER", nullable: false),
                    Images = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    ExcludeRootProductImages = table.Column<bool>(type: "INTEGER", nullable: false),
                    Gtin = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Sku = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    SupplierSku = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ShoppingFeedTitle = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    ShoppingFeedDescription = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    ShoppingFeedColour = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    ShoppingFeedMaterial = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    ShoppingFeedSize = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    RemoveFromFeed = table.Column<bool>(type: "INTEGER", nullable: false),
                    VariantOptionsKey = table.Column<string>(type: "TEXT", maxLength: 1500, nullable: true),
                    Url = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    ShippingRestrictionMode = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    HsCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    PackageConfigurations = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProducts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloProducts_merchelloProductRoots_ProductRootId",
                        column: x => x.ProductRootId,
                        principalTable: "merchelloProductRoots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloLineItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "TEXT", nullable: true),
                    OrderId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Sku = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    ProductId = table.Column<Guid>(type: "TEXT", nullable: true),
                    DependantLineItemSku = table.Column<string>(type: "TEXT", nullable: true),
                    LineItemType = table.Column<int>(type: "INTEGER", nullable: false),
                    Quantity = table.Column<int>(type: "INTEGER", nullable: false),
                    Amount = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    AmountInStoreCurrency = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    OriginalAmount = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: true),
                    IsTaxable = table.Column<bool>(type: "INTEGER", nullable: false),
                    TaxRate = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: false),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ExtendedData = table.Column<string>(type: "TEXT", maxLength: 3000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloLineItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloLineItems_merchelloInvoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "merchelloInvoices",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_merchelloLineItems_merchelloOrders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "merchelloOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloShipments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OrderId = table.Column<Guid>(type: "TEXT", nullable: false),
                    LineItems = table.Column<string>(type: "TEXT", maxLength: 3000, nullable: false),
                    Address = table.Column<string>(type: "TEXT", maxLength: 1500, nullable: false),
                    CourierId = table.Column<Guid>(type: "TEXT", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TrackingNumber = table.Column<string>(type: "TEXT", nullable: true),
                    TrackingUrl = table.Column<string>(type: "TEXT", nullable: true),
                    Carrier = table.Column<string>(type: "TEXT", nullable: true),
                    RequestedDeliveryDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsDeliveryDateGuaranteed = table.Column<bool>(type: "INTEGER", nullable: true),
                    ActualDeliveryDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloShipments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloShipments_merchelloOrders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "merchelloOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_merchelloShipments_merchelloWarehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "merchelloWarehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloShippingCosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CountryCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    StateOrProvinceCode = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Cost = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    ShippingOptionId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloShippingCosts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloShippingCosts_merchelloShippingOptions_ShippingOptionId",
                        column: x => x.ShippingOptionId,
                        principalTable: "merchelloShippingOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloShippingOptionCountries",
                columns: table => new
                {
                    ShippingOptionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CountryCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    Country_Name = table.Column<string>(type: "TEXT", nullable: true),
                    Country_CountryCode = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloShippingOptionCountries", x => new { x.ShippingOptionId, x.CountryCode });
                    table.ForeignKey(
                        name: "FK_merchelloShippingOptionCountries_merchelloShippingOptions_ShippingOptionId",
                        column: x => x.ShippingOptionId,
                        principalTable: "merchelloShippingOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloShippingWeightTiers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ShippingOptionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CountryCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    StateOrProvinceCode = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    MinWeightKg = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    MaxWeightKg = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    Surcharge = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    CreateDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdateDate = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloShippingWeightTiers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloShippingWeightTiers_merchelloShippingOptions_ShippingOptionId",
                        column: x => x.ShippingOptionId,
                        principalTable: "merchelloShippingOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductAllowedShippingOptions",
                columns: table => new
                {
                    AllowedShippingOptionsId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProductId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductAllowedShippingOptions", x => new { x.AllowedShippingOptionsId, x.ProductId });
                    table.ForeignKey(
                        name: "FK_merchelloProductAllowedShippingOptions_merchelloProducts_ProductId",
                        column: x => x.ProductId,
                        principalTable: "merchelloProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_merchelloProductAllowedShippingOptions_merchelloShippingOptions_AllowedShippingOptionsId",
                        column: x => x.AllowedShippingOptionsId,
                        principalTable: "merchelloShippingOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductExcludedShippingOptions",
                columns: table => new
                {
                    ExcludedShippingOptionsId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Product1Id = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductExcludedShippingOptions", x => new { x.ExcludedShippingOptionsId, x.Product1Id });
                    table.ForeignKey(
                        name: "FK_merchelloProductExcludedShippingOptions_merchelloProducts_Product1Id",
                        column: x => x.Product1Id,
                        principalTable: "merchelloProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_merchelloProductExcludedShippingOptions_merchelloShippingOptions_ExcludedShippingOptionsId",
                        column: x => x.ExcludedShippingOptionsId,
                        principalTable: "merchelloShippingOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductFiltersProducts",
                columns: table => new
                {
                    FilterId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProductId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductFiltersProducts", x => new { x.FilterId, x.ProductId });
                    table.ForeignKey(
                        name: "FK_merchelloProductFiltersProducts_merchelloProductFilters_FilterId",
                        column: x => x.FilterId,
                        principalTable: "merchelloProductFilters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_merchelloProductFiltersProducts_merchelloProducts_ProductId",
                        column: x => x.ProductId,
                        principalTable: "merchelloProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductRootShippingOptions",
                columns: table => new
                {
                    ProductRootId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ShippingOptionId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductRootShippingOptions", x => new { x.ProductRootId, x.ShippingOptionId });
                    table.ForeignKey(
                        name: "FK_merchelloProductRootShippingOptions_merchelloProducts_ProductRootId",
                        column: x => x.ProductRootId,
                        principalTable: "merchelloProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_merchelloProductRootShippingOptions_merchelloShippingOptions_ShippingOptionId",
                        column: x => x.ShippingOptionId,
                        principalTable: "merchelloShippingOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductWarehouse",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "TEXT", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Stock = table.Column<int>(type: "INTEGER", nullable: false),
                    ReorderPoint = table.Column<int>(type: "INTEGER", nullable: true),
                    ReorderQuantity = table.Column<int>(type: "INTEGER", nullable: true),
                    TrackStock = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    ReservedStock = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductWarehouse", x => new { x.ProductId, x.WarehouseId });
                    table.ForeignKey(
                        name: "FK_merchelloProductWarehouse_merchelloProducts_ProductId",
                        column: x => x.ProductId,
                        principalTable: "merchelloProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_merchelloProductWarehouse_merchelloWarehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "merchelloWarehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductWarehousePriceOverride",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ProductId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Price = table.Column<decimal>(type: "TEXT", nullable: true),
                    CostOfGoods = table.Column<decimal>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductWarehousePriceOverride", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloProductWarehousePriceOverride_merchelloProducts_ProductId",
                        column: x => x.ProductId,
                        principalTable: "merchelloProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_merchelloProductWarehousePriceOverride_merchelloWarehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "merchelloWarehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloShippingOptionCountries_CountyStates",
                columns: table => new
                {
                    CountryShippingOptionCountryShippingOptionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CountryShippingOptionCountryCountryCode = table.Column<string>(type: "TEXT", nullable: false),
                    Id = table.Column<int>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: true),
                    RegionCode = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloShippingOptionCountries_CountyStates", x => new { x.CountryShippingOptionCountryShippingOptionId, x.CountryShippingOptionCountryCountryCode, x.Id });
                    table.ForeignKey(
                        name: "FK_merchelloShippingOptionCountries_CountyStates_merchelloShippingOptionCountries_CountryShippingOptionCountryShippingOptionId_CountryShippingOptionCountryCountryCode",
                        columns: x => new { x.CountryShippingOptionCountryShippingOptionId, x.CountryShippingOptionCountryCountryCode },
                        principalTable: "merchelloShippingOptionCountries",
                        principalColumns: new[] { "ShippingOptionId", "CountryCode" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloCustomers_DateCreated",
                table: "merchelloCustomers",
                column: "DateCreated");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloCustomers_Email",
                table: "merchelloCustomers",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloCustomers_MemberKey",
                table: "merchelloCustomers",
                column: "MemberKey",
                filter: "[MemberKey] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloCustomerSegmentMembers_CustomerId",
                table: "merchelloCustomerSegmentMembers",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloCustomerSegmentMembers_SegmentId_CustomerId",
                table: "merchelloCustomerSegmentMembers",
                columns: new[] { "SegmentId", "CustomerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloCustomerSegments_IsActive",
                table: "merchelloCustomerSegments",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloCustomerSegments_Name",
                table: "merchelloCustomerSegments",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloCustomerSegments_SegmentType",
                table: "merchelloCustomerSegments",
                column: "SegmentType");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloCustomerTags_CustomerId",
                table: "merchelloCustomerTags",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloCustomerTags_CustomerId_Tag",
                table: "merchelloCustomerTags",
                columns: new[] { "CustomerId", "Tag" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloCustomerTags_Tag",
                table: "merchelloCustomerTags",
                column: "Tag");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDiscountBuyXGetYConfigs_DiscountId",
                table: "merchelloDiscountBuyXGetYConfigs",
                column: "DiscountId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDiscountEligibilityRules_DiscountId",
                table: "merchelloDiscountEligibilityRules",
                column: "DiscountId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDiscountFreeShippingConfigs_DiscountId",
                table: "merchelloDiscountFreeShippingConfigs",
                column: "DiscountId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDiscounts_Code",
                table: "merchelloDiscounts",
                column: "Code",
                unique: true,
                filter: "[Code] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDiscounts_StartsAt_EndsAt",
                table: "merchelloDiscounts",
                columns: new[] { "StartsAt", "EndsAt" });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDiscounts_Status",
                table: "merchelloDiscounts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDiscountTargetRules_DiscountId",
                table: "merchelloDiscountTargetRules",
                column: "DiscountId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloExchangeRateProviders_IsActive",
                table: "merchelloExchangeRateProviders",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloExchangeRateProviders_ProviderAlias",
                table: "merchelloExchangeRateProviders",
                column: "ProviderAlias",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloInvoices_CurrencyCode",
                table: "merchelloInvoices",
                column: "CurrencyCode");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloInvoices_CustomerId",
                table: "merchelloInvoices",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloInvoices_DateCreated",
                table: "merchelloInvoices",
                column: "DateCreated");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloInvoices_IsCancelled",
                table: "merchelloInvoices",
                column: "IsCancelled");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloInvoices_IsDeleted",
                table: "merchelloInvoices",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloLineItems_InvoiceId",
                table: "merchelloLineItems",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloLineItems_LineItemType",
                table: "merchelloLineItems",
                column: "LineItemType");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloLineItems_OrderId",
                table: "merchelloLineItems",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloLineItems_ProductId",
                table: "merchelloLineItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOrders_InvoiceId",
                table: "merchelloOrders",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOrders_Status",
                table: "merchelloOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOrders_WarehouseId",
                table: "merchelloOrders",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloPaymentProviders_ProviderAlias",
                table: "merchelloPaymentProviders",
                column: "ProviderAlias",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloPayments_InvoiceId_PaymentSuccess",
                table: "merchelloPayments",
                columns: new[] { "InvoiceId", "PaymentSuccess" });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloPayments_ParentPaymentId",
                table: "merchelloPayments",
                column: "ParentPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductAllowedShippingOptions_ProductId",
                table: "merchelloProductAllowedShippingOptions",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductExcludedShippingOptions_Product1Id",
                table: "merchelloProductExcludedShippingOptions",
                column: "Product1Id");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductFilters_ProductFilterGroupId",
                table: "merchelloProductFilters",
                column: "ProductFilterGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductFiltersProducts_ProductId",
                table: "merchelloProductFiltersProducts",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductRootCategories_ProductRootId",
                table: "merchelloProductRootCategories",
                column: "ProductRootId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductRoots_ProductTypeId",
                table: "merchelloProductRoots",
                column: "ProductTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductRoots_RootUrl",
                table: "merchelloProductRoots",
                column: "RootUrl");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductRoots_TaxGroupId",
                table: "merchelloProductRoots",
                column: "TaxGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductRootShippingOptions_ShippingOptionId",
                table: "merchelloProductRootShippingOptions",
                column: "ShippingOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductRootWarehouse_WarehouseId",
                table: "merchelloProductRootWarehouse",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProducts_Price",
                table: "merchelloProducts",
                column: "Price");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProducts_ProductRootId",
                table: "merchelloProducts",
                column: "ProductRootId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProducts_Url",
                table: "merchelloProducts",
                column: "Url");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductWarehouse_WarehouseId",
                table: "merchelloProductWarehouse",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductWarehousePriceOverride_ProductId",
                table: "merchelloProductWarehousePriceOverride",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductWarehousePriceOverride_WarehouseId",
                table: "merchelloProductWarehousePriceOverride",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloShipments_OrderId",
                table: "merchelloShipments",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloShipments_WarehouseId",
                table: "merchelloShipments",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloShippingCosts_ShippingOptionId",
                table: "merchelloShippingCosts",
                column: "ShippingOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloShippingOptions_WarehouseId",
                table: "merchelloShippingOptions",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloShippingProviderConfigurations_ProviderKey",
                table: "merchelloShippingProviderConfigurations",
                column: "ProviderKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloShippingWeightTiers_ShippingOptionId_CountryCode_StateOrProvinceCode",
                table: "merchelloShippingWeightTiers",
                columns: new[] { "ShippingOptionId", "CountryCode", "StateOrProvinceCode" });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWarehouses_Code",
                table: "merchelloWarehouses",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWarehouses_SupplierId",
                table: "merchelloWarehouses",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWarehouseServiceRegions_WarehouseId",
                table: "merchelloWarehouseServiceRegions",
                column: "WarehouseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "merchelloBaskets");

            migrationBuilder.DropTable(
                name: "merchelloCustomerSegmentMembers");

            migrationBuilder.DropTable(
                name: "merchelloCustomerTags");

            migrationBuilder.DropTable(
                name: "merchelloDiscountBuyXGetYConfigs");

            migrationBuilder.DropTable(
                name: "merchelloDiscountEligibilityRules");

            migrationBuilder.DropTable(
                name: "merchelloDiscountFreeShippingConfigs");

            migrationBuilder.DropTable(
                name: "merchelloDiscountTargetRules");

            migrationBuilder.DropTable(
                name: "merchelloExchangeRateProviders");

            migrationBuilder.DropTable(
                name: "merchelloLineItems");

            migrationBuilder.DropTable(
                name: "merchelloPaymentProviders");

            migrationBuilder.DropTable(
                name: "merchelloPayments");

            migrationBuilder.DropTable(
                name: "merchelloProductAllowedShippingOptions");

            migrationBuilder.DropTable(
                name: "merchelloProductExcludedShippingOptions");

            migrationBuilder.DropTable(
                name: "merchelloProductFiltersProducts");

            migrationBuilder.DropTable(
                name: "merchelloProductRootCategories");

            migrationBuilder.DropTable(
                name: "merchelloProductRootShippingOptions");

            migrationBuilder.DropTable(
                name: "merchelloProductRootWarehouse");

            migrationBuilder.DropTable(
                name: "merchelloProductWarehouse");

            migrationBuilder.DropTable(
                name: "merchelloProductWarehousePriceOverride");

            migrationBuilder.DropTable(
                name: "merchelloShipments");

            migrationBuilder.DropTable(
                name: "merchelloShippingCosts");

            migrationBuilder.DropTable(
                name: "merchelloShippingOptionCountries_CountyStates");

            migrationBuilder.DropTable(
                name: "merchelloShippingProviderConfigurations");

            migrationBuilder.DropTable(
                name: "merchelloShippingWeightTiers");

            migrationBuilder.DropTable(
                name: "merchelloWarehouseServiceRegions");

            migrationBuilder.DropTable(
                name: "merchelloCustomerSegments");

            migrationBuilder.DropTable(
                name: "merchelloDiscounts");

            migrationBuilder.DropTable(
                name: "merchelloProductFilters");

            migrationBuilder.DropTable(
                name: "merchelloProductCategories");

            migrationBuilder.DropTable(
                name: "merchelloProducts");

            migrationBuilder.DropTable(
                name: "merchelloOrders");

            migrationBuilder.DropTable(
                name: "merchelloShippingOptionCountries");

            migrationBuilder.DropTable(
                name: "merchelloProductFilterGroups");

            migrationBuilder.DropTable(
                name: "merchelloProductRoots");

            migrationBuilder.DropTable(
                name: "merchelloInvoices");

            migrationBuilder.DropTable(
                name: "merchelloShippingOptions");

            migrationBuilder.DropTable(
                name: "merchelloProductTypes");

            migrationBuilder.DropTable(
                name: "merchelloTaxGroups");

            migrationBuilder.DropTable(
                name: "merchelloCustomers");

            migrationBuilder.DropTable(
                name: "merchelloWarehouses");

            migrationBuilder.DropTable(
                name: "merchelloSuppliers");
        }
    }
}
