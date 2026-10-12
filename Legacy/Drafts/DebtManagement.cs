using AutoFix.Models.Common;
using System;

namespace AutoFix.Models
{
    public class PromiseToPay : ISoftDeletable
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;
        public int? InvoiceId { get; set; }
        public Invoice? Invoice { get; set; }
        public DateTime PromisedDate { get; set; }
        public decimal Amount { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Fulfilled, Missed
        public string RecordedBy { get; set; } = "Admin";
        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }

    public class DebtReminderLog : ISoftDeletable
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;
        public string Channel { get; set; } = "WhatsApp"; // WhatsApp, SMS, Phone
        public string SentToPhone { get; set; } = string.Empty;
        public string SentBy { get; set; } = "Admin";
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public decimal TotalOverdueAmount { get; set; }
        public string MessageSnippet { get; set; } = string.Empty;

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
