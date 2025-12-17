using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.SqlServer.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceCancellation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CancellationReason",
                table: "merchelloInvoices",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CancelledBy",
                table: "merchelloInvoices",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateCancelled",
                table: "merchelloInvoices",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCancelled",
                table: "merchelloInvoices",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloInvoices_IsCancelled",
                table: "merchelloInvoices",
                column: "IsCancelled");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_merchelloInvoices_IsCancelled",
                table: "merchelloInvoices");

            migrationBuilder.DropColumn(
                name: "CancellationReason",
                table: "merchelloInvoices");

            migrationBuilder.DropColumn(
                name: "CancelledBy",
                table: "merchelloInvoices");

            migrationBuilder.DropColumn(
                name: "DateCancelled",
                table: "merchelloInvoices");

            migrationBuilder.DropColumn(
                name: "IsCancelled",
                table: "merchelloInvoices");
        }
    }
}
