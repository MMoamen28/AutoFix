using System;
using System.Collections.Generic;

namespace AutoFix.DTOs.Receipt
{
    public class ReceiptResponseDto
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
        public DateTime IssuedAt { get; set; }
        public bool IsOwnerCopy { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
