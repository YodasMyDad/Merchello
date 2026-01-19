using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class AddDownloadLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExtendedData",
                table: "merchelloProductRoots",
                type: "TEXT",
                maxLength: 3000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "merchelloDownloadLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "TEXT", nullable: false),
                    LineItemId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CustomerId = table.Column<Guid>(type: "TEXT", nullable: false),
                    MediaId = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    FileName = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    Token = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    ExpiresUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    MaxDownloads = table.Column<int>(type: "INTEGER", nullable: true),
                    DownloadCount = table.Column<int>(type: "INTEGER", nullable: false),
                    LastDownloadUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloDownloadLinks", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDownloadLinks_CustomerId",
                table: "merchelloDownloadLinks",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDownloadLinks_InvoiceId",
                table: "merchelloDownloadLinks",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloDownloadLinks_Token",
                table: "merchelloDownloadLinks",
                column: "Token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "merchelloDownloadLinks");

            migrationBuilder.DropColumn(
                name: "ExtendedData",
                table: "merchelloProductRoots");
        }
    }
}
