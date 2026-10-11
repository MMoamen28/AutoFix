using AutoFix.Models.Common;
using System;
using System.Collections.Generic;

namespace AutoFix.Models
{
    public class Warehouse : ISoftDeletable
    {
        public int Id { get; set; }
        public string Name { get; set; } = "Main Warehouse";
        public string Code { get; set; } = "WH-01";
        public string? Location { get; set; }
        public bool IsDefault { get; set; } = true;

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }

    public class PartMovement : ISoftDeletable
    {
        public int Id { get; set; }
        public int SparePartId { get; set; }
        public SparePart SparePart { get; set; } = null!;

        public int WarehouseId { get; set; }
        public Warehouse Warehouse { get; set; } = null!;

        // MovementType: PurchaseIn, WorkOrderIssue, SalesReturn, PurchaseReturn, InventoryAdjustment, Transfer
        public string MovementType { get; set; } = "PurchaseIn";
        public decimal QuantityChanged { get; set; } // + or -
        public decimal BalanceAfter { get; set; }
        public decimal UnitCost { get; set; }
        public string ReferenceNumber { get; set; } = string.Empty; // e.g. PO-102, WO-504
        public string? Notes { get; set; }
        public string? CreatedByUserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
