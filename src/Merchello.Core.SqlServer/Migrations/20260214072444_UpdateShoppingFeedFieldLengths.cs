using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.SqlServer.Migrations
{
    /// <inheritdoc />
    public partial class UpdateShoppingFeedFieldLengths : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Prevent migration failure when existing data exceeds the new title limit.
            migrationBuilder.Sql("""
                UPDATE [merchelloProducts]
                SET [ShoppingFeedTitle] = LEFT([ShoppingFeedTitle], 150)
                WHERE [ShoppingFeedTitle] IS NOT NULL AND LEN([ShoppingFeedTitle]) > 150;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "ShoppingFeedTitle",
                table: "merchelloProducts",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ShoppingFeedDescription",
                table: "merchelloProducts",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ShoppingFeedTitle",
                table: "merchelloProducts",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(150)",
                oldMaxLength: 150,
                oldNullable: true);

            // Prevent migration failure when rolling back description length to 100.
            migrationBuilder.Sql("""
                UPDATE [merchelloProducts]
                SET [ShoppingFeedDescription] = LEFT([ShoppingFeedDescription], 100)
                WHERE [ShoppingFeedDescription] IS NOT NULL AND LEN([ShoppingFeedDescription]) > 100;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "ShoppingFeedDescription",
                table: "merchelloProducts",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000,
                oldNullable: true);
        }
    }
}
