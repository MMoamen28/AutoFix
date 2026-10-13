using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoFix.Migrations
{
    /// <inheritdoc />
    public partial class StageB_06_InvoiceTemplateAndWorkType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "WorkOrders",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WorkDone",
                table: "WorkOrders",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WorkToBeDone",
                table: "WorkOrders",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WorkType",
                table: "WorkOrders",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "InvoiceIdHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    InvoiceId = table.Column<int>(type: "INTEGER", nullable: false),
                    OldInvoiceNumber = table.Column<string>(type: "TEXT", nullable: false),
                    NewInvoiceNumber = table.Column<string>(type: "TEXT", nullable: false),
                    ChangedBy = table.Column<string>(type: "TEXT", nullable: false),
                    Reason = table.Column<string>(type: "TEXT", nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DeletedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvoiceIdHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InvoiceIdHistories_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_InvoiceNumber",
                table: "Invoices",
                column: "InvoiceNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceIdHistories_InvoiceId",
                table: "InvoiceIdHistories",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceIdHistories_OldInvoiceNumber",
                table: "InvoiceIdHistories",
                column: "OldInvoiceNumber");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InvoiceIdHistories");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_InvoiceNumber",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "WorkOrders");

            migrationBuilder.DropColumn(
                name: "WorkDone",
                table: "WorkOrders");

            migrationBuilder.DropColumn(
                name: "WorkToBeDone",
                table: "WorkOrders");

            migrationBuilder.DropColumn(
                name: "WorkType",
                table: "WorkOrders");
        }
    }
}
