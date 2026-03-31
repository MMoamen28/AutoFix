using System.Collections.Generic;

namespace AutoFix.Models
{
    public class RepairOrder
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public int CarId { get; set; }
        public int? MechanicId { get; set; }           // nullable until assigned
        public string Status { get; set; } = "Pending"; // Pending | InProgress | Completed | Cancelled
        public string Notes { get; set; } = string.Empty;
        public decimal TotalCost { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }

        // Navigation
        public Customer Customer { get; set; } = null!;
        public Car Car { get; set; } = null!;
        public Mechanic? Mechanic { get; set; }
        public ICollection<RepairOrderServiceJoin> RepairOrderServices { get; set; } = new List<RepairOrderServiceJoin>();
    }
}
