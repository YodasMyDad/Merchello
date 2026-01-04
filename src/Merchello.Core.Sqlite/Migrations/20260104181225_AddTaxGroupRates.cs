using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class AddTaxGroupRates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "merchelloTaxGroupRates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TaxGroupId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CountryCode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    StateOrProvinceCode = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    TaxPercentage = table.Column<decimal>(type: "TEXT", precision: 5, scale: 2, nullable: false),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false)
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

            migrationBuilder.CreateIndex(
                name: "IX_merchelloTaxGroupRates_TaxGroupId_CountryCode_StateOrProvinceCode",
                table: "merchelloTaxGroupRates",
                columns: new[] { "TaxGroupId", "CountryCode", "StateOrProvinceCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "merchelloTaxGroupRates");
        }
    }
}
