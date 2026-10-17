using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoFix.Migrations
{
    [Microsoft.EntityFrameworkCore.Infrastructure.DbContext(typeof(AutoFix.Data.AppDbContext))]
    [Migration("20261013064800_StageB_07_WorkOrderLineAddedAt")]
    public partial class StageB_07_WorkOrderLineAddedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AddedAt",
                table: "WorkOrderLines",
                type: "TEXT",
                nullable: false,
                defaultValue: new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.Sql("UPDATE WorkOrderLines SET AddedAt = COALESCE((SELECT ReceivedAt FROM WorkOrders WHERE WorkOrders.Id = WorkOrderLines.WorkOrderId), AddedAt);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AddedAt",
                table: "WorkOrderLines");
        }
    }
}
