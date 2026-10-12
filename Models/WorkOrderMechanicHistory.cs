using AutoFix.Models.Common;
using System;

namespace AutoFix.Models
{
    public class WorkOrderMechanicHistory : ISoftDeletable
    {
        public int Id { get; set; }
        
        public int WorkOrderId { get; set; }
        public WorkOrder WorkOrder { get; set; } = null!;

        // Role: "Main", "Helper"
        public string Role { get; set; } = "Main";

        public int? PreviousMechanicId { get; set; }
        public Mechanic? PreviousMechanic { get; set; }

        public int? NewMechanicId { get; set; }
        public Mechanic? NewMechanic { get; set; }

        public string AssignedBy { get; set; } = "Admin";
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        public string? Reason { get; set; }

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
