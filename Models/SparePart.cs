using System;
using System.Collections.Generic;

namespace AutoFix.Models
{
    public class SparePart
    {
        public int Id { get; set; }
        public int CategoryId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string PartNumber { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Brand { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public int StockQuantity { get; set; }
        public int MinimumStockLevel { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public SparePartCategory Category { get; set; } = null!;
        public ICollection<ServiceSparePartJoin> ServiceSpareParts { get; set; } = new List<ServiceSparePartJoin>();
    }
}
