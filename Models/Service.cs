using System.Collections.Generic;

namespace AutoFix.Models
{
    public class Service
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal BasePrice { get; set; }
        public int EstimatedMinutes { get; set; }

        // Navigation
        public ICollection<RepairOrderServiceJoin> RepairOrderServices { get; set; } = new List<RepairOrderServiceJoin>();
        public ICollection<ServiceSparePartJoin> ServiceSpareParts { get; set; } = new List<ServiceSparePartJoin>();
    }
}
