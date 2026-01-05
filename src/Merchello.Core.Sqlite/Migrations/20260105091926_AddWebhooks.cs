using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.Sqlite.Migrations
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
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Topic = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    TargetUrl = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    Secret = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    AuthType = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1),
                    AuthHeaderName = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    AuthHeaderValue = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    Format = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 1),
                    ApiVersion = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    TimeoutSeconds = table.Column<int>(type: "INTEGER", nullable: false),
                    FilterExpression = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    Headers = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    SuccessCount = table.Column<int>(type: "INTEGER", nullable: false),
                    FailureCount = table.Column<int>(type: "INTEGER", nullable: false),
                    LastTriggeredUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastSuccessUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastFailureUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastErrorMessage = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateUpdated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ExtendedData = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloWebhookSubscriptions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloWebhookDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Topic = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    EntityId = table.Column<Guid>(type: "TEXT", nullable: true),
                    EntityType = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    TargetUrl = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    RequestBody = table.Column<string>(type: "TEXT", nullable: false),
                    RequestHeaders = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    ResponseStatusCode = table.Column<int>(type: "INTEGER", nullable: true),
                    ResponseBody = table.Column<string>(type: "TEXT", maxLength: 10000, nullable: true),
                    ResponseHeaders = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    ErrorMessage = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateSent = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DateCompleted = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DurationMs = table.Column<int>(type: "INTEGER", nullable: false),
                    AttemptNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    NextRetryUtc = table.Column<DateTime>(type: "TEXT", nullable: true)
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
