using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.SqlServer.Migrations
{
    /// <inheritdoc />
    public partial class AbandonedCheckoutHardening : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_merchelloAbandonedCheckouts_BasketId",
                table: "merchelloAbandonedCheckouts");

            migrationBuilder.Sql(
                """
                ;WITH Ranked AS
                (
                    SELECT Id,
                           ROW_NUMBER() OVER (
                               PARTITION BY BasketId
                               ORDER BY DateCreated DESC, Id DESC) AS RowNum
                    FROM merchelloAbandonedCheckouts
                    WHERE BasketId IS NOT NULL
                )
                DELETE FROM merchelloAbandonedCheckouts
                WHERE Id IN (SELECT Id FROM Ranked WHERE RowNum > 1);
                """);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloAbandonedCheckouts_BasketId",
                table: "merchelloAbandonedCheckouts",
                column: "BasketId",
                unique: true,
                filter: "[BasketId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_merchelloAbandonedCheckouts_BasketId",
                table: "merchelloAbandonedCheckouts");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloAbandonedCheckouts_BasketId",
                table: "merchelloAbandonedCheckouts",
                column: "BasketId");
        }
    }
}
