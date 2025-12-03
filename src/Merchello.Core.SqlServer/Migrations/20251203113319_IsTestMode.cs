using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.SqlServer.Migrations
{
    /// <inheritdoc />
    public partial class IsTestMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsTestMode",
                table: "merchelloPaymentProviders",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsTestMode",
                table: "merchelloPaymentProviders");
        }
    }
}
