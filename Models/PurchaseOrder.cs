using System;
using System.Collections.Generic;

namespace AutoFix.Models
{
    public class PurchaseOrder
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public int CarId { get; set; }
        public int? MechanicId { get; set; }
        // Assigned by Owner after purchase

        public string Status { get; set; } = "Pending";
        // Pending | AssignedToMechanic | InProgress | Completed | Cancelled

        public decimal TotalAmount { get; set; }
        public string Notes { get; set; } = string.Empty;

        public DateTime PlacedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }

        // Navigation
        public Customer Customer { get; set; } = null!;
        public Car Car { get; set; } = null!;
        public Mechanic? Mechanic { get; set; }
        public ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
        public PurchaseReceipt? Receipt { get; set; }
    }
}
