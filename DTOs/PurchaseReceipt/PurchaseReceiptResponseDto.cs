using System;
using System.Collections.Generic;
using AutoFix.DTOs.PurchaseOrder;

namespace AutoFix.DTOs.PurchaseReceipt
{
    public class PurchaseReceiptResponseDto
    {
        public int Id { get; set; }
        public int PurchaseOrderId { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string CarInfo { get; set; } = string.Empty;
        public string? MechanicName { get; set; }
        public List<PurchaseOrderItemDto> Items { get; set; } = new();
        public decimal TotalAmount { get; set; }
        public string Notes { get; set; } = string.Empty;
        public DateTime IssuedAt { get; set; }
        public bool IsOwnerCopy { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
