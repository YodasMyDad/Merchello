using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class RemoveProductFeedTokenAuth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccessTokenHash",
                table: "merchelloProductFeeds");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccessTokenHash",
                table: "merchelloProductFeeds",
                type: "TEXT",
                maxLength: 256,
                nullable: false,
                defaultValue: "");
        }
    }
}
