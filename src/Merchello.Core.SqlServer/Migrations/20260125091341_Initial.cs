using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.SqlServer.Migrations
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LineItems = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(36)", maxLength: 36, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    CurrencySymbol = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: true),
                    SubTotal = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Discount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    AdjustedSubTotal = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Tax = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Total = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Shipping = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    BillingAddress = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ShippingAddress = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloBaskets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloCustomers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    MemberKey = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FirstName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    LastName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsFlagged = table.Column<bool>(type: "bit", nullable: false),
                    AcceptsMarketing = table.Column<bool>(type: "bit", nullable: false),
                    HasAccountTerms = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    PaymentTermsDays = table.Column<int>(type: "int", nullable: true),
                    CreditLimit = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloCustomers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloCustomerSegments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    SegmentType = table.Column<int>(type: "int", nullable: false),
                    CriteriaJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MatchMode = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsSystemSegment = table.Column<bool>(type: "bit", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloCustomerSegments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloDiscounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Category = table.Column<int>(type: "int", nullable: false),
                    Method = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ValueType = table.Column<int>(type: "int", nullable: false),
                    Value = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    ApplyAfterTax = table.Column<bool>(type: "bit", nullable: false),
                    StartsAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndsAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Timezone = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TotalUsageLimit = table.Column<int>(type: "int", nullable: true),
                    PerCustomerUsageLimit = table.Column<int>(type: "int", nullable: true),
                    PerOrderUsageLimit = table.Column<int>(type: "int", nullable: true),
                    RequirementType = table.Column<int>(type: "int", nullable: false),
                    RequirementValue = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    CanCombineWithProductDiscounts = table.Column<bool>(type: "bit", nullable: false),
                    CanCombineWithOrderDiscounts = table.Column<bool>(type: "bit", nullable: false),
                    CanCombineWithShippingDiscounts = table.Column<bool>(type: "bit", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TargetRulesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EligibilityRulesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BuyXGetYConfigJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FreeShippingConfigJson = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloDiscounts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloDownloadLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LineItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MediaId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Token = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ExpiresUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    MaxDownloads = table.Column<int>(type: "int", nullable: true),
                    DownloadCount = table.Column<int>(type: "int", nullable: false),
                    LastDownloadUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloDownloadLinks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloEmailConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Topic = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Enabled = table.Column<bool>(type: "bit", nullable: false),
                    TemplatePath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ToExpression = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CcExpression = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    BccExpression = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    FromExpression = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SubjectExpression = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateModified = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TotalSent = table.Column<int>(type: "int", nullable: false),
                    TotalFailed = table.Column<int>(type: "int", nullable: false),
                    LastSentUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExtendedData = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    AttachmentAliases = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloEmailConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloExchangeRateProviders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderAlias = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    ConfigurationJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    LastFetchedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastRatesJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    CreateDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdateDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloExchangeRateProviders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloFulfilmentProviderConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    InventorySyncMode = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    SettingsJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    CreateDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdateDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloFulfilmentProviderConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloPaymentProviders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderAlias = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    IsTestMode = table.Column<bool>(type: "bit", nullable: false),
                    Configuration = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloPaymentProviders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductCollections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductCollections", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductFilterGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductFilterGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Alias = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloShippingProviderConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    SettingsJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    UpdateDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreateDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloShippingProviderConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloSigningKeys",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    KeyId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ExpiredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    PrivateKeyPem = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PublicKeyX = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PublicKeyY = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Algorithm = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "ES256"),
                    CurveName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "P-256")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloSigningKeys", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloTaxGroups",
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
                    table.PrimaryKey("PK_merchelloTaxGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloTaxProviders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderAlias = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    ConfigurationJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreateDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdateDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloTaxProviders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloWarehouseProviderConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    DefaultMarkupPercent = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false, defaultValue: 0m),
                    ServiceMarkupsJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    ExcludedServiceTypesJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    DefaultDaysFromOverride = table.Column<int>(type: "int", nullable: true),
                    DefaultDaysToOverride = table.Column<int>(type: "int", nullable: true),
                    CreateDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdateDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloWarehouseProviderConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloWebhookSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Topic = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TargetUrl = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Secret = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    AuthType = table.Column<int>(type: "int", nullable: false),
                    AuthHeaderName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AuthHeaderValue = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Format = table.Column<int>(type: "int", nullable: false),
                    ApiVersion = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    TimeoutSeconds = table.Column<int>(type: "int", nullable: false),
                    FilterExpression = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Headers = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    SuccessCount = table.Column<int>(type: "int", nullable: false),
                    FailureCount = table.Column<int>(type: "int", nullable: false),
                    LastTriggeredUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastSuccessUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastFailureUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastErrorMessage = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExtendedData = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloWebhookSubscriptions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloAbandonedCheckouts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BasketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastActivityUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateAbandoned = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateRecovered = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateConverted = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateExpired = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RecoveredInvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RecoveryToken = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    RecoveryTokenExpiresUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RecoveryEmailsSent = table.Column<int>(type: "int", nullable: false),
                    LastRecoveryEmailSentUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    BasketTotal = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    CurrencyCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    CurrencySymbol = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: true),
                    ItemCount = table.Column<int>(type: "int", nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ExtendedData = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloAbandonedCheckouts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloAbandonedCheckouts_merchelloBaskets_BasketId",
                        column: x => x.BasketId,
                        principalTable: "merchelloBaskets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "merchelloCustomerTags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Tag = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateAdded = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BasketId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    InvoiceNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BillingName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    BillingCompany = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    BillingAddressOne = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    BillingAddressTwo = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    BillingTownCity = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    BillingCountyStateName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    BillingCountyStateCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    BillingPostalCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    BillingCountry = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    BillingCountryCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    BillingEmail = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: true),
                    BillingPhone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ShippingName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ShippingCompany = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ShippingAddressOne = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ShippingAddressTwo = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ShippingTownCity = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ShippingCountyStateName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ShippingCountyStateCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    ShippingPostalCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ShippingCountry = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ShippingCountryCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    ShippingEmail = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: true),
                    ShippingPhone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Channel = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PurchaseOrder = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    SubTotal = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    CurrencyCode = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    CurrencySymbol = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    StoreCurrencyCode = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    PricingExchangeRate = table.Column<decimal>(type: "decimal(18,8)", precision: 18, scale: 8, nullable: true),
                    PricingExchangeRateSource = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PricingExchangeRateTimestampUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Discount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    SubTotalInStoreCurrency = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    DiscountInStoreCurrency = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    AdjustedSubTotal = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Tax = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TaxInStoreCurrency = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    Total = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalInStoreCurrency = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    DateDeleted = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsCancelled = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    DateCancelled = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancellationReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CancelledBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ExtendedData = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    Source = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SegmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DateAdded = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AddedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
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
                name: "merchelloFulfilmentSyncLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderConfigurationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SyncType = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ItemsProcessed = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ItemsSucceeded = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ItemsFailed = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloFulfilmentSyncLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloFulfilmentSyncLogs_merchelloFulfilmentProviderConfigurations_ProviderConfigurationId",
                        column: x => x.ProviderConfigurationId,
                        principalTable: "merchelloFulfilmentProviderConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloFulfilmentWebhookLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProviderConfigurationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageId = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EventType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Payload = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloFulfilmentWebhookLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloFulfilmentWebhookLogs_merchelloFulfilmentProviderConfigurations_ProviderConfigurationId",
                        column: x => x.ProviderConfigurationId,
                        principalTable: "merchelloFulfilmentProviderConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloSuppliers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ContactName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    ContactEmail = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    ContactPhone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DefaultFulfilmentProviderConfigurationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ExtendedData = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloSuppliers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloSuppliers_merchelloFulfilmentProviderConfigurations_DefaultFulfilmentProviderConfigurationId",
                        column: x => x.DefaultFulfilmentProviderConfigurationId,
                        principalTable: "merchelloFulfilmentProviderConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "merchelloPaymentMethods",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PaymentProviderSettingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MethodAlias = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DisplayNameOverride = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    ShowInCheckout = table.Column<bool>(type: "bit", nullable: true),
                    IconMediaKey = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CheckoutStyleOverride = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloPaymentMethods", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloPaymentMethods_merchelloPaymentProviders_PaymentProviderSettingId",
                        column: x => x.PaymentProviderSettingId,
                        principalTable: "merchelloPaymentProviders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductFilters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    HexColour = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Image = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ProductFilterGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
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
                name: "merchelloProductRoots",
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
                    DefaultPackageConfigurations = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    IsDigitalProduct = table.Column<bool>(type: "bit", nullable: false),
                    AllowExternalCarrierShipping = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    Description = table.Column<string>(type: "nvarchar(max)", maxLength: 5000, nullable: true),
                    MetaDescription = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PageTitle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    NoIndex = table.Column<bool>(type: "bit", nullable: false),
                    OpenGraphImage = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CanonicalUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ElementPropertyData = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ViewAlias = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ExtendedData = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false)
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
                name: "merchelloShippingTaxOverrides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CountryCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    StateOrProvinceCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ShippingTaxGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloShippingTaxOverrides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloShippingTaxOverrides_merchelloTaxGroups_ShippingTaxGroupId",
                        column: x => x.ShippingTaxGroupId,
                        principalTable: "merchelloTaxGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "merchelloTaxGroupRates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TaxGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CountryCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    StateOrProvinceCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    TaxPercentage = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloTaxGroupRates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloTaxGroupRates_merchelloTaxGroups_TaxGroupId",
                        column: x => x.TaxGroupId,
                        principalTable: "merchelloTaxGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloOutboundDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeliveryType = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ConfigurationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Topic = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TargetUrl = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    RequestBody = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RequestHeaders = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ResponseStatusCode = table.Column<int>(type: "int", nullable: true),
                    ResponseBody = table.Column<string>(type: "nvarchar(max)", maxLength: 10000, nullable: true),
                    ResponseHeaders = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateSent = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateCompleted = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DurationMs = table.Column<int>(type: "int", nullable: false),
                    AttemptNumber = table.Column<int>(type: "int", nullable: false),
                    NextRetryUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EmailRecipients = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    EmailSubject = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    EmailFrom = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    EmailBody = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExtendedData = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloOutboundDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloOutboundDeliveries_merchelloWebhookSubscriptions_ConfigurationId",
                        column: x => x.ConfigurationId,
                        principalTable: "merchelloWebhookSubscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloDiscountUsages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DiscountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloDiscountUsages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloDiscountUsages_merchelloDiscounts_DiscountId",
                        column: x => x.DiscountId,
                        principalTable: "merchelloDiscounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_merchelloDiscountUsages_merchelloInvoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "merchelloInvoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShippingOptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShippingProviderKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ShippingServiceCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ShippingServiceName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ShippingServiceCategory = table.Column<int>(type: "int", nullable: true),
                    ShippingCost = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    QuotedShippingCost = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    QuotedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ShippingCostInStoreCurrency = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    RequestedDeliveryDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeliveryDateGuaranteed = table.Column<bool>(type: "bit", nullable: true),
                    DeliveryDateSurcharge = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    DeliveryDateSurchargeInStoreCurrency = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ProcessingStartedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ShippedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancelledDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancellationReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    InternalNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ExtendedData = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    FulfilmentProviderConfigurationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FulfilmentProviderReference = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    FulfilmentSubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    FulfilmentErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FulfilmentRetryCount = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloOrders_merchelloFulfilmentProviderConfigurations_FulfilmentProviderConfigurationId",
                        column: x => x.FulfilmentProviderConfigurationId,
                        principalTable: "merchelloFulfilmentProviderConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    CurrencyCode = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    AmountInStoreCurrency = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    SettlementCurrencyCode = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: true),
                    SettlementExchangeRate = table.Column<decimal>(type: "decimal(18,8)", precision: 18, scale: 8, nullable: true),
                    SettlementAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    SettlementExchangeRateSource = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    PaymentMethod = table.Column<string>(type: "nvarchar(350)", maxLength: 350, nullable: true),
                    PaymentProviderAlias = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    PaymentType = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    TransactionId = table.Column<string>(type: "nvarchar(350)", maxLength: 350, nullable: true),
                    FraudResponse = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RiskScore = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    RiskScoreSource = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    PaymentSuccess = table.Column<bool>(type: "bit", nullable: false),
                    RefundReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ParentPaymentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    WebhookEventId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
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
                name: "merchelloWarehouses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SupplierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FulfilmentProviderConfigurationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    Code = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AutomationMethod = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ExtendedData = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloWarehouses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloWarehouses_merchelloFulfilmentProviderConfigurations_FulfilmentProviderConfigurationId",
                        column: x => x.FulfilmentProviderConfigurationId,
                        principalTable: "merchelloFulfilmentProviderConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_merchelloWarehouses_merchelloSuppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "merchelloSuppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductRootCollections",
                columns: table => new
                {
                    CollectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductRootId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductRootCollections", x => new { x.CollectionId, x.ProductRootId });
                    table.ForeignKey(
                        name: "FK_merchelloProductRootCollections_merchelloProductCollections_CollectionId",
                        column: x => x.CollectionId,
                        principalTable: "merchelloProductCollections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_merchelloProductRootCollections_merchelloProductRoots_ProductRootId",
                        column: x => x.ProductRootId,
                        principalTable: "merchelloProductRoots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProducts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductRootId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Default = table.Column<bool>(type: "bit", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CostOfGoods = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    OnSale = table.Column<bool>(type: "bit", nullable: false),
                    PreviousPrice = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    AvailableForPurchase = table.Column<bool>(type: "bit", nullable: false),
                    CanPurchase = table.Column<bool>(type: "bit", nullable: false),
                    Images = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ExcludeRootProductImages = table.Column<bool>(type: "bit", nullable: false),
                    Gtin = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Sku = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    SupplierSku = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ShoppingFeedTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ShoppingFeedDescription = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ShoppingFeedColour = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ShoppingFeedMaterial = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ShoppingFeedSize = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RemoveFromFeed = table.Column<bool>(type: "bit", nullable: false),
                    VariantOptionsKey = table.Column<string>(type: "nvarchar(1500)", maxLength: 1500, nullable: true),
                    Url = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ShippingRestrictionMode = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    HsCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    PackageConfigurations = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Sku = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Name = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DependantLineItemSku = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    LineItemType = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    AmountInStoreCurrency = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    Cost = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    CostInStoreCurrency = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    OriginalAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    OriginalAmountInStoreCurrency = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    IsTaxable = table.Column<bool>(type: "bit", nullable: false),
                    TaxRate = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    TaxGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExtendedData = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false)
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
                name: "merchelloProductRootWarehouse",
                columns: table => new
                {
                    ProductRootId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PriorityOrder = table.Column<int>(type: "int", nullable: false)
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
                name: "merchelloShipments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LineItems = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(1500)", maxLength: 1500, nullable: false),
                    CourierId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TrackingNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TrackingUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Carrier = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RequestedDeliveryDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeliveryDateGuaranteed = table.Column<bool>(type: "bit", nullable: true),
                    ActualDeliveryDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExtendedData = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ShippedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
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
                name: "merchelloShippingOptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(350)", maxLength: 350, nullable: true),
                    ProviderKey = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "flat-rate"),
                    ProviderSettings = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ServiceType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    FixedCost = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CountryCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    StateOrProvinceCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsExcluded = table.Column<bool>(type: "bit", nullable: false)
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
                name: "merchelloProductFiltersProducts",
                columns: table => new
                {
                    FilterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
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
                name: "merchelloProductWarehouse",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Stock = table.Column<int>(type: "int", nullable: false),
                    ReorderPoint = table.Column<int>(type: "int", nullable: true),
                    ReorderQuantity = table.Column<int>(type: "int", nullable: true),
                    TrackStock = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    ReservedStock = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    RowVersion = table.Column<byte[]>(type: "varbinary(max)", nullable: false)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    CostOfGoods = table.Column<decimal>(type: "decimal(18,2)", nullable: true)
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
                name: "merchelloProductAllowedShippingOptions",
                columns: table => new
                {
                    AllowedShippingOptionsId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
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
                    ExcludedShippingOptionsId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Product1Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
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
                name: "merchelloProductRootShippingOptions",
                columns: table => new
                {
                    ProductRootId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShippingOptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
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
                name: "merchelloShippingCosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CountryCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    StateOrProvinceCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Cost = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    ShippingOptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
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
                    ShippingOptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CountryCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Country_Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Country_CountryCode = table.Column<string>(type: "nvarchar(max)", nullable: true)
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
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShippingOptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CountryCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    StateOrProvinceCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    MinWeightKg = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    MaxWeightKg = table.Column<decimal>(type: "decimal(18,4)", nullable: true),
                    Surcharge = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    CreateDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdateDate = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                name: "merchelloShippingOptionCountries_CountyStates",
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
                    table.PrimaryKey("PK_merchelloShippingOptionCountries_CountyStates", x => new { x.CountryShippingOptionCountryShippingOptionId, x.CountryShippingOptionCountryCountryCode, x.Id });
                    table.ForeignKey(
                        name: "FK_merchelloShippingOptionCountries_CountyStates_merchelloShippingOptionCountries_CountryShippingOptionCountryShippingOptionId_~",
                        columns: x => new { x.CountryShippingOptionCountryShippingOptionId, x.CountryShippingOptionCountryCountryCode },
                        principalTable: "merchelloShippingOptionCountries",
                        principalColumns: new[] { "ShippingOptionId", "CountryCode" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloAbandonedCheckouts_BasketId",
                table: "merchelloAbandonedCheckouts",
                column: "BasketId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloAbandonedCheckouts_CustomerId",
                table: "merchelloAbandonedCheckouts",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloAbandonedCheckouts_DateAbandoned",
                table: "merchelloAbandonedCheckouts",
                column: "DateAbandoned");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloAbandonedCheckouts_Email",
                table: "merchelloAbandonedCheckouts",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloAbandonedCheckouts_LastActivityUtc",
                table: "merchelloAbandonedCheckouts",
                column: "LastActivityUtc");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloAbandonedCheckouts_RecoveryToken",
                table: "merchelloAbandonedCheckouts",
                column: "RecoveryToken",
                unique: true,
                filter: "[RecoveryToken] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloAbandonedCheckouts_Status",
                table: "merchelloAbandonedCheckouts",
                column: "Status");

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
                name: "IX_merchelloDiscountUsages_DiscountId",
                table: "merchelloDiscountUsages",
                column: "DiscountId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDiscountUsages_DiscountId_CustomerId",
                table: "merchelloDiscountUsages",
                columns: new[] { "DiscountId", "CustomerId" });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDiscountUsages_DiscountId_InvoiceId",
                table: "merchelloDiscountUsages",
                columns: new[] { "DiscountId", "InvoiceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDiscountUsages_InvoiceId",
                table: "merchelloDiscountUsages",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDownloadLinks_CustomerId",
                table: "merchelloDownloadLinks",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDownloadLinks_InvoiceId",
                table: "merchelloDownloadLinks",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDownloadLinks_Token",
                table: "merchelloDownloadLinks",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloEmailConfigurations_Enabled",
                table: "merchelloEmailConfigurations",
                column: "Enabled");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloEmailConfigurations_Topic",
                table: "merchelloEmailConfigurations",
                column: "Topic");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloEmailConfigurations_Topic_Enabled",
                table: "merchelloEmailConfigurations",
                columns: new[] { "Topic", "Enabled" });

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
                name: "IX_merchelloFulfilmentProviderConfigurations_ProviderKey",
                table: "merchelloFulfilmentProviderConfigurations",
                column: "ProviderKey");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloFulfilmentSyncLogs_ProviderConfigurationId",
                table: "merchelloFulfilmentSyncLogs",
                column: "ProviderConfigurationId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloFulfilmentSyncLogs_StartedAt",
                table: "merchelloFulfilmentSyncLogs",
                column: "StartedAt");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloFulfilmentSyncLogs_Status",
                table: "merchelloFulfilmentSyncLogs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloFulfilmentWebhookLogs_ExpiresAt",
                table: "merchelloFulfilmentWebhookLogs",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloFulfilmentWebhookLogs_ProviderConfigurationId_MessageId",
                table: "merchelloFulfilmentWebhookLogs",
                columns: new[] { "ProviderConfigurationId", "MessageId" });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloInvoices_Channel",
                table: "merchelloInvoices",
                column: "Channel");

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
                name: "IX_merchelloInvoices_DueDate",
                table: "merchelloInvoices",
                column: "DueDate",
                filter: "[DueDate] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloInvoices_InvoiceNumber",
                table: "merchelloInvoices",
                column: "InvoiceNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloInvoices_IsCancelled",
                table: "merchelloInvoices",
                column: "IsCancelled");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloInvoices_IsDeleted",
                table: "merchelloInvoices",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloInvoices_IsDeleted_DateCreated",
                table: "merchelloInvoices",
                columns: new[] { "IsDeleted", "DateCreated" });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloLineItems_DependantLineItemSku",
                table: "merchelloLineItems",
                column: "DependantLineItemSku");

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
                name: "IX_merchelloLineItems_TaxGroupId",
                table: "merchelloLineItems",
                column: "TaxGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOrders_CompletedDate",
                table: "merchelloOrders",
                column: "CompletedDate");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOrders_FulfilmentProviderConfigurationId",
                table: "merchelloOrders",
                column: "FulfilmentProviderConfigurationId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOrders_FulfilmentProviderReference",
                table: "merchelloOrders",
                column: "FulfilmentProviderReference");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOrders_InvoiceId",
                table: "merchelloOrders",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOrders_Status",
                table: "merchelloOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOrders_Status_CompletedDate",
                table: "merchelloOrders",
                columns: new[] { "Status", "CompletedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOrders_WarehouseId",
                table: "merchelloOrders",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOutboundDeliveries_ConfigurationId",
                table: "merchelloOutboundDeliveries",
                column: "ConfigurationId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOutboundDeliveries_DateCreated",
                table: "merchelloOutboundDeliveries",
                column: "DateCreated");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOutboundDeliveries_DeliveryType",
                table: "merchelloOutboundDeliveries",
                column: "DeliveryType");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOutboundDeliveries_DeliveryType_Status",
                table: "merchelloOutboundDeliveries",
                columns: new[] { "DeliveryType", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOutboundDeliveries_NextRetryUtc",
                table: "merchelloOutboundDeliveries",
                column: "NextRetryUtc");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOutboundDeliveries_Status",
                table: "merchelloOutboundDeliveries",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloOutboundDeliveries_Status_NextRetryUtc",
                table: "merchelloOutboundDeliveries",
                columns: new[] { "Status", "NextRetryUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloPaymentMethods_PaymentProviderSettingId_MethodAlias",
                table: "merchelloPaymentMethods",
                columns: new[] { "PaymentProviderSettingId", "MethodAlias" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloPaymentProviders_ProviderAlias",
                table: "merchelloPaymentProviders",
                column: "ProviderAlias",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloPayments_IdempotencyKey",
                table: "merchelloPayments",
                column: "IdempotencyKey",
                unique: true,
                filter: "[IdempotencyKey] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloPayments_InvoiceId_PaymentSuccess",
                table: "merchelloPayments",
                columns: new[] { "InvoiceId", "PaymentSuccess" });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloPayments_ParentPaymentId",
                table: "merchelloPayments",
                column: "ParentPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloPayments_TransactionId",
                table: "merchelloPayments",
                column: "TransactionId",
                unique: true,
                filter: "[TransactionId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloPayments_WebhookEventId",
                table: "merchelloPayments",
                column: "WebhookEventId",
                unique: true,
                filter: "[WebhookEventId] IS NOT NULL");

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
                name: "IX_merchelloProductRootCollections_ProductRootId",
                table: "merchelloProductRootCollections",
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
                name: "IX_merchelloProducts_AvailableForPurchase_CanPurchase",
                table: "merchelloProducts",
                columns: new[] { "AvailableForPurchase", "CanPurchase" });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProducts_Price",
                table: "merchelloProducts",
                column: "Price");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProducts_ProductRootId",
                table: "merchelloProducts",
                column: "ProductRootId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProducts_Sku",
                table: "merchelloProducts",
                column: "Sku");

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
                name: "IX_merchelloShippingTaxOverrides_CountryCode_StateOrProvinceCode",
                table: "merchelloShippingTaxOverrides",
                columns: new[] { "CountryCode", "StateOrProvinceCode" },
                unique: true,
                filter: "[StateOrProvinceCode] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloShippingTaxOverrides_ShippingTaxGroupId",
                table: "merchelloShippingTaxOverrides",
                column: "ShippingTaxGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloShippingWeightTiers_ShippingOptionId_CountryCode_StateOrProvinceCode",
                table: "merchelloShippingWeightTiers",
                columns: new[] { "ShippingOptionId", "CountryCode", "StateOrProvinceCode" });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloSigningKeys_ExpiredAt",
                table: "merchelloSigningKeys",
                column: "ExpiredAt");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloSigningKeys_IsActive",
                table: "merchelloSigningKeys",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloSigningKeys_KeyId",
                table: "merchelloSigningKeys",
                column: "KeyId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloSuppliers_DefaultFulfilmentProviderConfigurationId",
                table: "merchelloSuppliers",
                column: "DefaultFulfilmentProviderConfigurationId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloTaxGroupRates_TaxGroupId_CountryCode_StateOrProvinceCode",
                table: "merchelloTaxGroupRates",
                columns: new[] { "TaxGroupId", "CountryCode", "StateOrProvinceCode" },
                unique: true,
                filter: "[StateOrProvinceCode] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloTaxProviders_IsActive",
                table: "merchelloTaxProviders",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloTaxProviders_ProviderAlias",
                table: "merchelloTaxProviders",
                column: "ProviderAlias",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWarehouseProviderConfigs_WarehouseId_ProviderKey",
                table: "merchelloWarehouseProviderConfigs",
                columns: new[] { "WarehouseId", "ProviderKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWarehouses_Code",
                table: "merchelloWarehouses",
                column: "Code",
                unique: true,
                filter: "[Code] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWarehouses_FulfilmentProviderConfigurationId",
                table: "merchelloWarehouses",
                column: "FulfilmentProviderConfigurationId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWarehouses_SupplierId",
                table: "merchelloWarehouses",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWarehouseServiceRegions_WarehouseId",
                table: "merchelloWarehouseServiceRegions",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWebhookSubscriptions_IsActive",
                table: "merchelloWebhookSubscriptions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWebhookSubscriptions_Topic",
                table: "merchelloWebhookSubscriptions",
                column: "Topic");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWebhookSubscriptions_Topic_IsActive",
                table: "merchelloWebhookSubscriptions",
                columns: new[] { "Topic", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "merchelloAbandonedCheckouts");

            migrationBuilder.DropTable(
                name: "merchelloCustomerSegmentMembers");

            migrationBuilder.DropTable(
                name: "merchelloCustomerTags");

            migrationBuilder.DropTable(
                name: "merchelloDiscountUsages");

            migrationBuilder.DropTable(
                name: "merchelloDownloadLinks");

            migrationBuilder.DropTable(
                name: "merchelloEmailConfigurations");

            migrationBuilder.DropTable(
                name: "merchelloExchangeRateProviders");

            migrationBuilder.DropTable(
                name: "merchelloFulfilmentSyncLogs");

            migrationBuilder.DropTable(
                name: "merchelloFulfilmentWebhookLogs");

            migrationBuilder.DropTable(
                name: "merchelloLineItems");

            migrationBuilder.DropTable(
                name: "merchelloOutboundDeliveries");

            migrationBuilder.DropTable(
                name: "merchelloPaymentMethods");

            migrationBuilder.DropTable(
                name: "merchelloPayments");

            migrationBuilder.DropTable(
                name: "merchelloProductAllowedShippingOptions");

            migrationBuilder.DropTable(
                name: "merchelloProductExcludedShippingOptions");

            migrationBuilder.DropTable(
                name: "merchelloProductFiltersProducts");

            migrationBuilder.DropTable(
                name: "merchelloProductRootCollections");

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
                name: "merchelloShippingTaxOverrides");

            migrationBuilder.DropTable(
                name: "merchelloShippingWeightTiers");

            migrationBuilder.DropTable(
                name: "merchelloSigningKeys");

            migrationBuilder.DropTable(
                name: "merchelloTaxGroupRates");

            migrationBuilder.DropTable(
                name: "merchelloTaxProviders");

            migrationBuilder.DropTable(
                name: "merchelloWarehouseProviderConfigs");

            migrationBuilder.DropTable(
                name: "merchelloWarehouseServiceRegions");

            migrationBuilder.DropTable(
                name: "merchelloBaskets");

            migrationBuilder.DropTable(
                name: "merchelloCustomerSegments");

            migrationBuilder.DropTable(
                name: "merchelloDiscounts");

            migrationBuilder.DropTable(
                name: "merchelloWebhookSubscriptions");

            migrationBuilder.DropTable(
                name: "merchelloPaymentProviders");

            migrationBuilder.DropTable(
                name: "merchelloProductFilters");

            migrationBuilder.DropTable(
                name: "merchelloProductCollections");

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

            migrationBuilder.DropTable(
                name: "merchelloFulfilmentProviderConfigurations");
        }
    }
}
