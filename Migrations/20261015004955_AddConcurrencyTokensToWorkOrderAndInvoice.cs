using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoFix.Migrations
{
    public partial class AddConcurrencyTokensToWorkOrderAndInvoice : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ConcurrencyToken",
                table: "WorkOrders",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ConcurrencyToken",
                table: "Invoices",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConcurrencyToken",
                table: "WorkOrders");

            migrationBuilder.DropColumn(
                name: "ConcurrencyToken",
                table: "Invoices");
        }
    }
}
