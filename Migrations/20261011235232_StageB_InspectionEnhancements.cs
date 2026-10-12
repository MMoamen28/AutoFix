using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoFix.Migrations
{
    /// <inheritdoc />
    public partial class StageB_InspectionEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CarId",
                table: "CarInspections",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CustomerId",
                table: "CarInspections",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DamageMarkersJson",
                table: "CarInspections",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DiagnosticScanResult",
                table: "CarInspections",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FinalizedAt",
                table: "CarInspections",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "InvoiceAmount",
                table: "CarInspections",
                type: "TEXT",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "InvoiceId",
                table: "CarInspections",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InvoiceNumber",
                table: "CarInspections",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCurrentRevision",
                table: "CarInspections",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PdfFilePath",
                table: "CarInspections",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PreviousRevisionId",
                table: "CarInspections",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RevisionNumber",
                table: "CarInspections",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "CarInspections",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "WorkOrderId",
                table: "CarInspections",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CarInspections_CarId",
                table: "CarInspections",
                column: "CarId");

            migrationBuilder.CreateIndex(
                name: "IX_CarInspections_CustomerId",
                table: "CarInspections",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_CarInspections_InvoiceId",
                table: "CarInspections",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_CarInspections_WorkOrderId",
                table: "CarInspections",
                column: "WorkOrderId");

            migrationBuilder.AddForeignKey(
                name: "FK_CarInspections_Cars_CarId",
                table: "CarInspections",
                column: "CarId",
                principalTable: "Cars",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CarInspections_Customers_CustomerId",
                table: "CarInspections",
                column: "CustomerId",
                principalTable: "Customers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CarInspections_Invoices_InvoiceId",
                table: "CarInspections",
                column: "InvoiceId",
                principalTable: "Invoices",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CarInspections_WorkOrders_WorkOrderId",
                table: "CarInspections",
                column: "WorkOrderId",
                principalTable: "WorkOrders",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CarInspections_Cars_CarId",
                table: "CarInspections");

            migrationBuilder.DropForeignKey(
                name: "FK_CarInspections_Customers_CustomerId",
                table: "CarInspections");

            migrationBuilder.DropForeignKey(
                name: "FK_CarInspections_Invoices_InvoiceId",
                table: "CarInspections");

            migrationBuilder.DropForeignKey(
                name: "FK_CarInspections_WorkOrders_WorkOrderId",
                table: "CarInspections");

            migrationBuilder.DropIndex(
                name: "IX_CarInspections_CarId",
                table: "CarInspections");

            migrationBuilder.DropIndex(
                name: "IX_CarInspections_CustomerId",
                table: "CarInspections");

            migrationBuilder.DropIndex(
                name: "IX_CarInspections_InvoiceId",
                table: "CarInspections");

            migrationBuilder.DropIndex(
                name: "IX_CarInspections_WorkOrderId",
                table: "CarInspections");

            migrationBuilder.DropColumn(
                name: "CarId",
                table: "CarInspections");

            migrationBuilder.DropColumn(
                name: "CustomerId",
                table: "CarInspections");

            migrationBuilder.DropColumn(
                name: "DamageMarkersJson",
                table: "CarInspections");

            migrationBuilder.DropColumn(
                name: "DiagnosticScanResult",
                table: "CarInspections");

            migrationBuilder.DropColumn(
                name: "FinalizedAt",
                table: "CarInspections");

            migrationBuilder.DropColumn(
                name: "InvoiceAmount",
                table: "CarInspections");

            migrationBuilder.DropColumn(
                name: "InvoiceId",
                table: "CarInspections");

            migrationBuilder.DropColumn(
                name: "InvoiceNumber",
                table: "CarInspections");

            migrationBuilder.DropColumn(
                name: "IsCurrentRevision",
                table: "CarInspections");

            migrationBuilder.DropColumn(
                name: "PdfFilePath",
                table: "CarInspections");

            migrationBuilder.DropColumn(
                name: "PreviousRevisionId",
                table: "CarInspections");

            migrationBuilder.DropColumn(
                name: "RevisionNumber",
                table: "CarInspections");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "CarInspections");

            migrationBuilder.DropColumn(
                name: "WorkOrderId",
                table: "CarInspections");
        }
    }
}
