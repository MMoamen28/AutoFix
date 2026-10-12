using AutoFix.Models.Common;
using System;

namespace AutoFix.Models
{
    public class Expense : ISoftDeletable
    {
        public int Id { get; set; }
        public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;
        
        // Category: Rent, Salaries, ElectricityWater, InternetPhone, ToolsEquipment, 
        // Cleaning, Transport, Marketing, TaxesFees, WorkshopMaintenance, Advances, Commission, Other
        public string Category { get; set; } = "Other";
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = "Cash"; // Cash, Card, BankTransfer
        public string? Note { get; set; }
        public string? ReceiptPhotoPath { get; set; }
        
        // Break-even classification: Fixed cost vs Variable cost
        public bool IsFixedCost { get; set; } = true;
        
        // Recurring monthly template
        public bool IsRecurringMonthly { get; set; } = false;
        
        public string? ApprovedBy { get; set; }
        public int? RelatedMechanicId { get; set; }
        public Mechanic? RelatedMechanic { get; set; }

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }

    public class BadDebtWriteOff : ISoftDeletable
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;
        public int? InvoiceId { get; set; }
        public Invoice? Invoice { get; set; }
        public decimal Amount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string ApprovedBy { get; set; } = string.Empty;
        public DateTime WrittenOffAt { get; set; } = DateTime.UtcNow;

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }

    public class MonthlyClosing : ISoftDeletable
    {
        public int Id { get; set; }
        public int Year { get; set; }
        public int Month { get; set; } // 1-12
        public bool IsLocked { get; set; } = false;
        public DateTime? LockedAt { get; set; }
        public string? LockedBy { get; set; }
        public string? SnapshotJson { get; set; } // JSON of locked P&L report
        public string? Notes { get; set; }

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
