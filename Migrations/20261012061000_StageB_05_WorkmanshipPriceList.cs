using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoFix.Migrations
{
    /// <inheritdoc />
    public partial class StageB_05_WorkmanshipPriceList : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NameArabic",
                table: "Services",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Services",
                type: "INTEGER",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DefaultCost",
                table: "Services",
                type: "TEXT",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalWorkmanship",
                table: "WorkOrders",
                type: "TEXT",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "ServiceId",
                table: "WorkOrderLines",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderLines_ServiceId",
                table: "WorkOrderLines",
                column: "ServiceId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrderLines_Services_ServiceId",
                table: "WorkOrderLines",
                column: "ServiceId",
                principalTable: "Services",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrderLines_Services_ServiceId",
                table: "WorkOrderLines");

            migrationBuilder.DropIndex(
                name: "IX_WorkOrderLines_ServiceId",
                table: "WorkOrderLines");

            migrationBuilder.DropColumn(
                name: "ServiceId",
                table: "WorkOrderLines");

            migrationBuilder.DropColumn(
                name: "TotalWorkmanship",
                table: "WorkOrders");

            migrationBuilder.DropColumn(
                name: "DefaultCost",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "NameArabic",
                table: "Services");
        }
    }
}
