using AutoFix.Models.Common;
using System;
using System.Collections.Generic;

namespace AutoFix.Models
{
    public class SparePart : ISoftDeletable
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? NameArabic { get; set; }
        public string PartNumber { get; set; } = string.Empty;
        public string? OemNumber { get; set; }
        public string? Barcode { get; set; }
        public string? ShelfLocation { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Brand { get; set; } = string.Empty;
        public string Unit { get; set; } = "Piece"; // Piece, Liter, Set, Kit
        public decimal PurchasePrice { get; set; } = 0;
        public decimal UnitPrice { get; set; } // Selling Price
        public int StockQuantity { get; set; }
        public int MinimumStockLevel { get; set; }
        public bool IsActive { get; set; } = true;
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = "General";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ServiceSparePartJoin> ServiceSpareParts { get; set; } = new List<ServiceSparePartJoin>();

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
