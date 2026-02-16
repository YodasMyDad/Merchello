using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.SqlServer.Migrations
{
    /// <inheritdoc />
    public partial class FulfilmentWebhookLogContract : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_merchelloFulfilmentWebhookLogs_ProviderConfigurationId_MessageId",
                table: "merchelloFulfilmentWebhookLogs");

            migrationBuilder.AlterColumn<string>(
                name: "MessageId",
                table: "merchelloFulfilmentWebhookLogs",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(256)",
                oldMaxLength: 256,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloFulfilmentWebhookLogs_ProviderConfigurationId_MessageId",
                table: "merchelloFulfilmentWebhookLogs",
                columns: new[] { "ProviderConfigurationId", "MessageId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_merchelloFulfilmentWebhookLogs_ProviderConfigurationId_MessageId",
                table: "merchelloFulfilmentWebhookLogs");

            migrationBuilder.AlterColumn<string>(
                name: "MessageId",
                table: "merchelloFulfilmentWebhookLogs",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(256)",
                oldMaxLength: 256);

            migrationBuilder.CreateIndex(
                name: "IX_merchelloFulfilmentWebhookLogs_ProviderConfigurationId_MessageId",
                table: "merchelloFulfilmentWebhookLogs",
                columns: new[] { "ProviderConfigurationId", "MessageId" });
        }
    }
}
