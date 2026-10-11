using AutoFix.Models.Common;
using System;

namespace AutoFix.Models
{
    public class Supplier : ISoftDeletable
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ContactPerson { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Address { get; set; }
        public decimal BalanceDue { get; set; } = 0;
        public string? TaxNumber { get; set; }
        public string? Notes { get; set; }

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }

    public class TreasuryTransaction : ISoftDeletable
    {
        public int Id { get; set; }
        // Type: Income, Expense, SupplierPayment, CustomerReceipt, OwnerWithdrawal, OwnerDeposit
        public string TransactionType { get; set; } = "Income";
        public decimal Amount { get; set; }
        public decimal BalanceAfter { get; set; }
        public string Category { get; set; } = "General"; // Labor, Parts, Rent, Electricity, Salaries, etc.
        public string Description { get; set; } = string.Empty;
        public string? ReferenceNumber { get; set; }
        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
        public string? PerformedByUserId { get; set; }

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }

    public class InsuranceCompany : ISoftDeletable
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ContactPerson { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public decimal TotalInvoiced { get; set; } = 0;
        public decimal TotalPaid { get; set; } = 0;
        public decimal BalanceDue => TotalInvoiced - TotalPaid;
        public string? Notes { get; set; }

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
