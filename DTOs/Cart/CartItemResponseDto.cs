using System;

namespace AutoFix.DTOs.Cart
{
    public class CartItemResponseDto
    {
        public int Id { get; set; }
        public string ItemType { get; set; } = string.Empty;
        public int ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; }
        public decimal Subtotal { get; set; }
        public DateTime AddedAt { get; set; }
    }
}
