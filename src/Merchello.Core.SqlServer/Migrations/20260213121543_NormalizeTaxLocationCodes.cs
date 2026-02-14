using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.SqlServer.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeTaxLocationCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsTaxEstimated",
                table: "merchelloBaskets",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TaxEstimationReason",
                table: "merchelloBaskets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.Sql(
                """
                ;WITH normalized AS (
                    SELECT
                        Id,
                        ROW_NUMBER() OVER (
                            PARTITION BY
                                TaxGroupId,
                                UPPER(LTRIM(RTRIM(CountryCode))),
                                ISNULL(NULLIF(UPPER(LTRIM(RTRIM(StateOrProvinceCode))), ''), '')
                            ORDER BY DateCreated ASC, Id ASC
                        ) AS rn
                    FROM merchelloTaxGroupRates
                )
                DELETE FROM merchelloTaxGroupRates
                WHERE Id IN (SELECT Id FROM normalized WHERE rn > 1);
                """);

            migrationBuilder.Sql(
                """
                UPDATE merchelloTaxGroupRates
                SET
                    CountryCode = UPPER(LTRIM(RTRIM(CountryCode))),
                    StateOrProvinceCode = NULLIF(UPPER(LTRIM(RTRIM(StateOrProvinceCode))), '');
                """);

            migrationBuilder.Sql(
                """
                ;WITH normalized AS (
                    SELECT
                        Id,
                        ROW_NUMBER() OVER (
                            PARTITION BY
                                UPPER(LTRIM(RTRIM(CountryCode))),
                                ISNULL(NULLIF(UPPER(LTRIM(RTRIM(StateOrProvinceCode))), ''), '')
                            ORDER BY DateCreated ASC, Id ASC
                        ) AS rn
                    FROM merchelloShippingTaxOverrides
                )
                DELETE FROM merchelloShippingTaxOverrides
                WHERE Id IN (SELECT Id FROM normalized WHERE rn > 1);
                """);

            migrationBuilder.Sql(
                """
                UPDATE merchelloShippingTaxOverrides
                SET
                    CountryCode = UPPER(LTRIM(RTRIM(CountryCode))),
                    StateOrProvinceCode = NULLIF(UPPER(LTRIM(RTRIM(StateOrProvinceCode))), '');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsTaxEstimated",
                table: "merchelloBaskets");

            migrationBuilder.DropColumn(
                name: "TaxEstimationReason",
                table: "merchelloBaskets");
        }
    }
}
