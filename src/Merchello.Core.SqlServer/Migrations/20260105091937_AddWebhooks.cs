using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.SqlServer.Migrations
{
    /// <inheritdoc />
    public partial class AddWebhooks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "merchelloWebhookSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Topic = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TargetUrl = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Secret = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    AuthType = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    AuthHeaderName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AuthHeaderValue = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Format = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    ApiVersion = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    TimeoutSeconds = table.Column<int>(type: "int", nullable: false),
                    FilterExpression = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Headers = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    SuccessCount = table.Column<int>(type: "int", nullable: false),
                    FailureCount = table.Column<int>(type: "int", nullable: false),
                    LastTriggeredUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastSuccessUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastFailureUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastErrorMessage = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExtendedData = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloWebhookSubscriptions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloWebhookDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Topic = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TargetUrl = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    RequestBody = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RequestHeaders = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ResponseStatusCode = table.Column<int>(type: "int", nullable: true),
                    ResponseBody = table.Column<string>(type: "nvarchar(max)", maxLength: 10000, nullable: true),
                    ResponseHeaders = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateSent = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateCompleted = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DurationMs = table.Column<int>(type: "int", nullable: false),
                    AttemptNumber = table.Column<int>(type: "int", nullable: false),
                    NextRetryUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloWebhookDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloWebhookDeliveries_merchelloWebhookSubscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "merchelloWebhookSubscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWebhookDeliveries_DateCreated",
                table: "merchelloWebhookDeliveries",
                column: "DateCreated");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWebhookDeliveries_NextRetryUtc",
                table: "merchelloWebhookDeliveries",
                column: "NextRetryUtc");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWebhookDeliveries_Status",
                table: "merchelloWebhookDeliveries",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWebhookDeliveries_Status_NextRetryUtc",
                table: "merchelloWebhookDeliveries",
                columns: new[] { "Status", "NextRetryUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWebhookDeliveries_SubscriptionId",
                table: "merchelloWebhookDeliveries",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWebhookSubscriptions_IsActive",
                table: "merchelloWebhookSubscriptions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWebhookSubscriptions_Topic",
                table: "merchelloWebhookSubscriptions",
                column: "Topic");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloWebhookSubscriptions_Topic_IsActive",
                table: "merchelloWebhookSubscriptions",
                columns: new[] { "Topic", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "merchelloWebhookDeliveries");

            migrationBuilder.DropTable(
                name: "merchelloWebhookSubscriptions");
        }
    }
}
