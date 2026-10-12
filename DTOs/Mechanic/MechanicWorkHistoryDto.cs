using System;
using System.Collections.Generic;

namespace AutoFix.DTOs.Mechanic
{
    public class MechanicWorkHistoryDto
    {
        public int MechanicId { get; set; }
        public string MechanicName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public bool IsActive { get; set; }
        public int TotalOrdersWorked { get; set; }
        public List<MechanicWorkHistoryItemDto> WorkOrders { get; set; } = new();
    }

    public class MechanicWorkHistoryItemDto
    {
        public int WorkOrderId { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string CarPlate { get; set; } = string.Empty;
        public string CarDescription { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // "Main" or "Helper"
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
    }
}
