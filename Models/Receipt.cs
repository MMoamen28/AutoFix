using System;
using System.Collections.Generic;
using AutoFix.Models;

namespace AutoFix.Models
{
    public class Receipt
    {
        public int Id { get; set; }

        public int RepairOrderId { get; set; }
        public int CustomerId { get; set; }

        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string CarInfo { get; set; } = string.Empty;
        // e.g. "2020 Toyota Corolla — ABC-1234"

        public string MechanicName { get; set; } = string.Empty;
        public List<string> ServicesPerformed { get; set; } = new();
        // stored as JSON in SQL Server

        public decimal TotalCost { get; set; }
        public string Notes { get; set; } = string.Empty;

        public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
        public bool IsOwnerCopy { get; set; } = false;
        // true = this is the owner's permanent copy
        // false = this is the customer's copy

        public string Status { get; set; } = "Issued";
        // Issued | Paid | Void

        // Navigation
        public RepairOrder RepairOrder { get; set; } = null!;
        public Customer Customer { get; set; } = null!;
    }
}
