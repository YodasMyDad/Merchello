using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.SqlServer.Migrations
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
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShoppingFeedCondition",
                table: "merchelloProducts",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShoppingFeedBrand",
                table: "merchelloProductRoots",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShoppingFeedCondition",
                table: "merchelloProductRoots",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "new");

            migrationBuilder.CreateTable(
                name: "merchelloProductFeeds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    CountryCode = table.Column<string>(type: "nvarchar(2)", maxLength: 2, nullable: false),
                    CurrencyCode = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    LanguageCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    IncludeTaxInPrice = table.Column<bool>(type: "bit", nullable: true),
                    AccessTokenHash = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    FilterConfigJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CustomLabelsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CustomFieldsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ManualPromotionsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastSuccessfulProductFeedXml = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastSuccessfulPromotionsFeedXml = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastGeneratedUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastGenerationError = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false)
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
