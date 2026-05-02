using System.Collections.Generic;

namespace AutoFix.DTOs.RepairOrder
{
    public class RepairOrderResponseDto
    {
        public int Id { get; set; }
        public string Status { get; set; } = string.Empty;
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CarPlate { get; set; } = string.Empty;
        public string CarInfo { get; set; } = string.Empty;      // "2020 Toyota Corolla"
        public int? MechanicId { get; set; }
        public string? MechanicName { get; set; }
        public decimal TotalCost { get; set; }
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public List<string> Services { get; set; } = new();
    }
}
