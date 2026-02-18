using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class ProductFeedv1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ShoppingFeedBrand",
                table: "merchelloProducts",
                type: "TEXT",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShoppingFeedCondition",
                table: "merchelloProducts",
                type: "TEXT",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShoppingFeedBrand",
                table: "merchelloProductRoots",
                type: "TEXT",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShoppingFeedCondition",
                table: "merchelloProductRoots",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                defaultValue: "new");

            migrationBuilder.CreateTable(
                name: "merchelloProductFeeds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    CountryCode = table.Column<string>(type: "TEXT", maxLength: 2, nullable: false),
                    CurrencyCode = table.Column<string>(type: "TEXT", maxLength: 3, nullable: false),
                    LanguageCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    IncludeTaxInPrice = table.Column<bool>(type: "INTEGER", nullable: true),
                    AccessTokenHash = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    FilterConfigJson = table.Column<string>(type: "TEXT", nullable: true),
                    CustomLabelsJson = table.Column<string>(type: "TEXT", nullable: true),
                    CustomFieldsJson = table.Column<string>(type: "TEXT", nullable: true),
                    ManualPromotionsJson = table.Column<string>(type: "TEXT", nullable: true),
                    LastSuccessfulProductFeedXml = table.Column<string>(type: "TEXT", nullable: true),
                    LastSuccessfulPromotionsFeedXml = table.Column<string>(type: "TEXT", nullable: true),
                    LastGeneratedUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastGenerationError = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductFeeds", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductFeeds_IsEnabled",
                table: "merchelloProductFeeds",
                column: "IsEnabled");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductFeeds_Slug",
                table: "merchelloProductFeeds",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "merchelloProductFeeds");

            migrationBuilder.DropColumn(
                name: "ShoppingFeedBrand",
                table: "merchelloProducts");

            migrationBuilder.DropColumn(
                name: "ShoppingFeedCondition",
                table: "merchelloProducts");

            migrationBuilder.DropColumn(
                name: "ShoppingFeedBrand",
                table: "merchelloProductRoots");

            migrationBuilder.DropColumn(
                name: "ShoppingFeedCondition",
                table: "merchelloProductRoots");
        }
    }
}
