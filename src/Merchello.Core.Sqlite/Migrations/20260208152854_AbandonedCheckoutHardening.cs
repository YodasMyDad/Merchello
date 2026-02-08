using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.Sqlite.Migrations
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
                DELETE FROM merchelloAbandonedCheckouts
                WHERE rowid IN
                (
                    SELECT rowid
                    FROM
                    (
                        SELECT rowid,
                               ROW_NUMBER() OVER (
                                   PARTITION BY BasketId
                                   ORDER BY DateCreated DESC, Id DESC) AS RowNum
                        FROM merchelloAbandonedCheckouts
                        WHERE BasketId IS NOT NULL
                    )
                    WHERE RowNum > 1
                );
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
