using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.Sqlite.Migrations
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
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TaxEstimationReason",
                table: "merchelloBaskets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.Sql(
                """
                WITH normalized AS (
                    SELECT
                        Id,
                        ROW_NUMBER() OVER (
                            PARTITION BY
                                TaxGroupId,
                                UPPER(TRIM(CountryCode)),
                                CASE
                                    WHEN "StateOrProvinceCode" IS NULL OR TRIM("StateOrProvinceCode") = '' THEN ''
                                    ELSE UPPER(TRIM("StateOrProvinceCode"))
                                END
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
                    CountryCode = UPPER(TRIM(CountryCode)),
                    "StateOrProvinceCode" = CASE
                        WHEN "StateOrProvinceCode" IS NULL OR TRIM("StateOrProvinceCode") = '' THEN NULL
                        ELSE UPPER(TRIM("StateOrProvinceCode"))
                    END;
                """);

            migrationBuilder.Sql(
                """
                WITH normalized AS (
                    SELECT
                        Id,
                        ROW_NUMBER() OVER (
                            PARTITION BY
                                UPPER(TRIM(CountryCode)),
                                CASE
                                    WHEN "StateOrProvinceCode" IS NULL OR TRIM("StateOrProvinceCode") = '' THEN ''
                                    ELSE UPPER(TRIM("StateOrProvinceCode"))
                                END
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
                    CountryCode = UPPER(TRIM(CountryCode)),
                    "StateOrProvinceCode" = CASE
                        WHEN "StateOrProvinceCode" IS NULL OR TRIM("StateOrProvinceCode") = '' THEN NULL
                        ELSE UPPER(TRIM("StateOrProvinceCode"))
                    END;
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
