using AutoFix.Models.Common;
using System;
using System.Collections.Generic;

namespace AutoFix.Models
{
    public class Invoice : ISoftDeletable
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty; // e.g. INV-2026-0001
        
        public int? WorkOrderId { get; set; }
        public WorkOrder? WorkOrder { get; set; }

        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        public int CarId { get; set; }
        public Car Car { get; set; } = null!;

        public int? InsuranceCompanyId { get; set; }
        public InsuranceCompany? InsuranceCompany { get; set; }

        // Monetary breakdown
        public decimal Subtotal { get; set; } = 0;
        public decimal DiscountAmount { get; set; } = 0;
        public decimal VatPercentage { get; set; } = 0; // e.g. 14% EGP
        public decimal VatAmount { get; set; } = 0;
        public decimal TotalAmount { get; set; } = 0;
        public decimal PaidAmount { get; set; } = 0;
        public decimal RemainingAmount => TotalAmount - PaidAmount;

        // Status: Draft, Issued, PartiallyPaid, Paid, Cancelled, Credited
        public string Status { get; set; } = "Issued";
        public string Currency { get; set; } = "EGP";

        public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DueDate { get; set; }
        public string Notes { get; set; } = string.Empty;

        // Snapshot JSON of items at the time of issue
        public string SnapshotDetailsJson { get; set; } = "[]";

        public ICollection<InvoicePayment> Payments { get; set; } = new List<InvoicePayment>();
        public ICollection<InvoiceIdHistory> IdHistories { get; set; } = new List<InvoiceIdHistory>();

        [System.ComponentModel.DataAnnotations.ConcurrencyCheck]
        public string ConcurrencyToken { get; set; } = Guid.NewGuid().ToString("N");

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }

    public class InvoicePayment : ISoftDeletable
    {
        public int Id { get; set; }
        public int InvoiceId { get; set; }
        public Invoice Invoice { get; set; } = null!;

        public decimal Amount { get; set; }
        // PaymentMethod: Cash, Card, BankTransfer, Cheque
        public string PaymentMethod { get; set; } = "Cash";
        public string? ReferenceNumber { get; set; }
        public DateTime PaidAt { get; set; } = DateTime.UtcNow;
        public string? ReceivedByUserId { get; set; }
        public string? Notes { get; set; }

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }

    public class InvoiceIdHistory : ISoftDeletable
    {
        public int Id { get; set; }
        public int InvoiceId { get; set; }
        public Invoice Invoice { get; set; } = null!;

        public string OldInvoiceNumber { get; set; } = string.Empty;
        public string NewInvoiceNumber { get; set; } = string.Empty;
        public string ChangedBy { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
