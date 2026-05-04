using System;
using System.Collections.Generic;

namespace AutoFix.DTOs.PurchaseOrder
{
    public class PurchaseOrderResponseDto
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public int CarId { get; set; }
        public string CarInfo { get; set; } = string.Empty;
        public int? MechanicId { get; set; }
        public string? MechanicName { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public string Notes { get; set; } = string.Empty;
        public DateTime PlacedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public List<PurchaseOrderItemDto> Items { get; set; } = new();
    }
}
