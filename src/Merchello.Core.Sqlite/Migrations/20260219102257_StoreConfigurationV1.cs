using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class StoreConfigurationV1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "merchelloStores",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    StoreKey = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false, defaultValue: "default"),
                    InvoiceNumberPrefix = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false, defaultValue: "INV-"),
                    DisplayPricesIncTax = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    ShowStockLevels = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: true),
                    LowStockThreshold = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 5),
                    StoreName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false, defaultValue: "Acme Store"),
                    StoreEmail = table.Column<string>(type: "TEXT", maxLength: 254, nullable: true),
                    StoreSupportEmail = table.Column<string>(type: "TEXT", maxLength: 254, nullable: true),
                    StorePhone = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    StoreLogoMediaKey = table.Column<Guid>(type: "TEXT", nullable: true),
                    StoreWebsiteUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    StoreAddress = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false, defaultValue: "123 Commerce Street\nNew York, NY 10001\nUnited States"),
                    UcpTermsUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    UcpPrivacyUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    InvoiceRemindersJson = table.Column<string>(type: "TEXT", nullable: false),
                    PoliciesJson = table.Column<string>(type: "TEXT", nullable: false),
                    CheckoutJson = table.Column<string>(type: "TEXT", nullable: false),
                    AbandonedCheckoutJson = table.Column<string>(type: "TEXT", nullable: false),
                    EmailJson = table.Column<string>(type: "TEXT", nullable: false),
                    DateCreatedUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateUpdatedUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloStores", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloStores_StoreKey",
                table: "merchelloStores",
                column: "StoreKey",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "merchelloStores");
        }
    }
}
