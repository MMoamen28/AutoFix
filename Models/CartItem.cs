using System;
using System.ComponentModel.DataAnnotations;

namespace AutoFix.Models
{
    public class CartItem
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }

        public string ItemType { get; set; } = string.Empty;
        // "Service" or "SparePart"

        public int ItemId { get; set; }
        // ServiceId or SparePartId depending on ItemType

        public string ItemName { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; } = 1;

        public DateTime AddedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Customer Customer { get; set; } = null!;
    }
}
