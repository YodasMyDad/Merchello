using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Merchello.Core.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class ProductSyncv1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "merchelloProductSyncRuns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Direction = table.Column<int>(type: "INTEGER", nullable: false),
                    Profile = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    RequestedByUserId = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    RequestedByUserName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    InputFileName = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    InputFilePath = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    OutputFileName = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    OutputFilePath = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    OptionsJson = table.Column<string>(type: "TEXT", nullable: true),
                    ItemsProcessed = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    ItemsSucceeded = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    ItemsFailed = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    WarningCount = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    ErrorCount = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    StartedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CompletedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DateCreatedUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ErrorMessage = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductSyncRuns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "merchelloProductSyncIssues",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    RunId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Severity = table.Column<int>(type: "INTEGER", nullable: false),
                    Stage = table.Column<int>(type: "INTEGER", nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Message = table.Column<string>(type: "TEXT", nullable: false),
                    RowNumber = table.Column<int>(type: "INTEGER", nullable: true),
                    Handle = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    Sku = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    Field = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    DateCreatedUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_merchelloProductSyncIssues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_merchelloProductSyncIssues_merchelloProductSyncRuns_RunId",
                        column: x => x.RunId,
                        principalTable: "merchelloProductSyncRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductSyncIssues_DateCreatedUtc",
                table: "merchelloProductSyncIssues",
                column: "DateCreatedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductSyncIssues_RunId",
                table: "merchelloProductSyncIssues",
                column: "RunId");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductSyncIssues_Severity",
                table: "merchelloProductSyncIssues",
                column: "Severity");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductSyncIssues_Stage",
                table: "merchelloProductSyncIssues",
                column: "Stage");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductSyncRuns_DateCreatedUtc",
                table: "merchelloProductSyncRuns",
                column: "DateCreatedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductSyncRuns_Direction",
                table: "merchelloProductSyncRuns",
                column: "Direction");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductSyncRuns_StartedAtUtc",
                table: "merchelloProductSyncRuns",
                column: "StartedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_merchelloProductSyncRuns_Status",
                table: "merchelloProductSyncRuns",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "merchelloProductSyncIssues");

            migrationBuilder.DropTable(
                name: "merchelloProductSyncRuns");
        }
    }
}
