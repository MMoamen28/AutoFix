using System;

namespace AutoFix.DTOs.WorkOrder
{
    public class CarServiceHistoryDto
    {
        public int WorkOrderId { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public int? OdometerKm { get; set; }
        public string OperationName { get; set; } = string.Empty;
        public string LineType { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal? UnitCost { get; set; } // Null for customers
        public string? MechanicName { get; set; }
        public string WorkType { get; set; } = "Maintenance";
        public string Status { get; set; } = string.Empty;
    }
}
