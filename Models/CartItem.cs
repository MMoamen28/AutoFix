using AutoFix.Models.Common;
using System;

namespace AutoFix.Models
{
    public class CartItem : ISoftDeletable
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }

        public string ItemType { get; set; } = string.Empty; // "Service" or "SparePart"
        public int ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; } = 1;
        public DateTime AddedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Customer Customer { get; set; } = null!;

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
