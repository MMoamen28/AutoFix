using AutoFix.Models.Common;
using System;
using System.Collections.Generic;

namespace AutoFix.Models
{
    public class Receipt : ISoftDeletable
    {
        public int Id { get; set; }

        public int RepairOrderId { get; set; }
        public int CustomerId { get; set; }

        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string CarInfo { get; set; } = string.Empty;

        public string MechanicName { get; set; } = string.Empty;
        public List<string> ServicesPerformed { get; set; } = new();

        public decimal TotalCost { get; set; }
        public string Notes { get; set; } = string.Empty;

        public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
        public bool IsOwnerCopy { get; set; } = false;
        public string Status { get; set; } = "Issued"; // Issued | Paid | Void

        // Navigation
        public RepairOrder RepairOrder { get; set; } = null!;
        public Customer Customer { get; set; } = null!;

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
