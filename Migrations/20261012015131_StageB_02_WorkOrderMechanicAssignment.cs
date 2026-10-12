using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoFix.Migrations
{
    /// <inheritdoc />
    public partial class StageB_02_WorkOrderMechanicAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "HelperTechnicianId",
                table: "WorkOrders",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WorkOrderMechanicHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    WorkOrderId = table.Column<int>(type: "INTEGER", nullable: false),
                    Role = table.Column<string>(type: "TEXT", nullable: false),
                    PreviousMechanicId = table.Column<int>(type: "INTEGER", nullable: true),
                    NewMechanicId = table.Column<int>(type: "INTEGER", nullable: true),
                    AssignedBy = table.Column<string>(type: "TEXT", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Reason = table.Column<string>(type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DeletedBy = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkOrderMechanicHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkOrderMechanicHistories_Mechanics_NewMechanicId",
                        column: x => x.NewMechanicId,
                        principalTable: "Mechanics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_WorkOrderMechanicHistories_Mechanics_PreviousMechanicId",
                        column: x => x.PreviousMechanicId,
                        principalTable: "Mechanics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_WorkOrderMechanicHistories_WorkOrders_WorkOrderId",
                        column: x => x.WorkOrderId,
                        principalTable: "WorkOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_HelperTechnicianId",
                table: "WorkOrders",
                column: "HelperTechnicianId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderMechanicHistories_NewMechanicId",
                table: "WorkOrderMechanicHistories",
                column: "NewMechanicId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderMechanicHistories_PreviousMechanicId",
                table: "WorkOrderMechanicHistories",
                column: "PreviousMechanicId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderMechanicHistories_WorkOrderId",
                table: "WorkOrderMechanicHistories",
                column: "WorkOrderId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrders_Mechanics_HelperTechnicianId",
                table: "WorkOrders",
                column: "HelperTechnicianId",
                principalTable: "Mechanics",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrders_Mechanics_HelperTechnicianId",
                table: "WorkOrders");

            migrationBuilder.DropTable(
                name: "WorkOrderMechanicHistories");

            migrationBuilder.DropIndex(
                name: "IX_WorkOrders_HelperTechnicianId",
                table: "WorkOrders");

            migrationBuilder.DropColumn(
                name: "HelperTechnicianId",
                table: "WorkOrders");
        }
    }
}
