using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class RemoveTaxRoundingFromInvoiceAndBasket : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TaxRounding",
                table: "merchelloInvoices");

            migrationBuilder.DropColumn(
                name: "TaxRounding",
                table: "merchelloBaskets");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TaxRounding",
                table: "merchelloInvoices",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TaxRounding",
                table: "merchelloBaskets",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }
    }
}
