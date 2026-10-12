using AutoFix.Models.Common;
using System;
using System.Collections.Generic;

namespace AutoFix.Models
{
    public class Mechanic : ISoftDeletable
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Specialty { get; set; } // Mechanical, Electrical, Paint, Bodywork
        public string? Notes { get; set; }
        public bool IsActive { get; set; } = true;
        public string KeycloakUserId { get; set; } = string.Empty;
        public DateTime HiredAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public MechanicProfile? Profile { get; set; }
        public ICollection<RepairOrder> RepairOrders { get; set; } = new List<RepairOrder>();
        public ICollection<WorkOrder> AssignedWorkOrders { get; set; } = new List<WorkOrder>();

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
