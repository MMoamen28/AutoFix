using AutoFix.Models.Common;
using System;

namespace AutoFix.Models
{
    public class CarOdometerLog : ISoftDeletable
    {
        public int Id { get; set; }
        
        public int CarId { get; set; }
        public Car Car { get; set; } = null!;

        public int OdometerKm { get; set; }
        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

        // Source: Manual, QuickAdd, WorkOrder, Inspection
        public string Source { get; set; } = "Manual";
        
        public string? ReferenceId { get; set; } // e.g. WO-2026-0001 or INSP-2026-0001
        public string? Notes { get; set; }

        public bool IsLowerReadingWarning { get; set; } = false;

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
