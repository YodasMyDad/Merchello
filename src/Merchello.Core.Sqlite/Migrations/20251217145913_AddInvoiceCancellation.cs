using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.Sqlite.Migrations
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
                type: "TEXT",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CancelledBy",
                table: "merchelloInvoices",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateCancelled",
                table: "merchelloInvoices",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCancelled",
                table: "merchelloInvoices",
                type: "INTEGER",
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
