using AutoFix.Models.Common;
using System;
using System.Collections.Generic;

namespace AutoFix.Models
{
    public class Service : ISoftDeletable
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = "Mechanical"; // Mechanical, Bodywork, Paint, Oils, Electrical
        public string NameArabic { get; set; } = string.Empty;
        public decimal BasePrice { get; set; }
        public decimal DefaultCost { get; set; } = 0;
        public int EstimatedMinutes { get; set; }
        public bool IsActive { get; set; } = true;

        // Navigation
        public ICollection<RepairOrderServiceJoin> RepairOrderServices { get; set; } = new List<RepairOrderServiceJoin>();
        public ICollection<ServiceSparePartJoin> ServiceSpareParts { get; set; } = new List<ServiceSparePartJoin>();

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
