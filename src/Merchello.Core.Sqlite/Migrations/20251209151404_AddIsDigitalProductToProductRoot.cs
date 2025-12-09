using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class AddIsDigitalProductToProductRoot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDigitalProduct",
                table: "merchelloProductRoots",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsDigitalProduct",
                table: "merchelloProductRoots");
        }
    }
}
