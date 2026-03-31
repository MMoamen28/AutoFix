using System.Collections.Generic;

namespace AutoFix.Models
{
    public class Car
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public string Make { get; set; } = string.Empty;       // e.g. Toyota
        public string Model { get; set; } = string.Empty;      // e.g. Corolla
        public int Year { get; set; }
        public string LicensePlate { get; set; } = string.Empty;
        public string VIN { get; set; } = string.Empty;        // max 17 chars

        // Navigation
        public Customer Customer { get; set; } = null!;
        public ICollection<RepairOrder> RepairOrders { get; set; } = new List<RepairOrder>();
    }
}
