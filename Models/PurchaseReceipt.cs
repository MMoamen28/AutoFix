using System;

namespace AutoFix.Models
{
    public class PurchaseReceipt
    {
        public int Id { get; set; }
        public int PurchaseOrderId { get; set; }
        public int CustomerId { get; set; }

        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string CarInfo { get; set; } = string.Empty;
        // e.g. "2020 Toyota Corolla — ABC-1234"

        public string? MechanicName { get; set; }

        public string ItemsSummary { get; set; } = string.Empty;
        // JSON array of purchased items stored as string

        public decimal TotalAmount { get; set; }
        public string Notes { get; set; } = string.Empty;

        public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
        public bool IsOwnerCopy { get; set; } = false;

        public string Status { get; set; } = "Issued";
        // Issued | Paid | Void

        // Navigation
        public PurchaseOrder PurchaseOrder { get; set; } = null!;
        public Customer Customer { get; set; } = null!;
    }
}
