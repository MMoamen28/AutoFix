using AutoFix.Models.Common;
using System;
using System.Collections.Generic;

namespace AutoFix.Models
{
    public class Customer : ISoftDeletable
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? ExtraPhone { get; set; }
        public string? Address { get; set; }
        public string? Notes { get; set; }
        
        public string KeycloakUserId { get; set; } = string.Empty;  // preserved for Keycloak compatibility
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<Car> Cars { get; set; } = new List<Car>();
        public ICollection<RepairOrder> RepairOrders { get; set; } = new List<RepairOrder>();
        public ICollection<WorkOrder> WorkOrders { get; set; } = new List<WorkOrder>();
        public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
