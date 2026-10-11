using AutoFix.Models.Common;
using System;
using System.Collections.Generic;

namespace AutoFix.Models
{
    public class Car : ISoftDeletable
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public string Make { get; set; } = string.Empty;       // e.g. Toyota
        public string Model { get; set; } = string.Empty;      // e.g. Corolla
        public int Year { get; set; }
        public string LicensePlate { get; set; } = string.Empty;
        public string VIN { get; set; } = string.Empty;        // Chassis / VIN
        
        public string? Color { get; set; }
        public string? Engine { get; set; }
        public string? FuelType { get; set; }                  // Gasoline, Diesel, Hybrid, Electric
        public int CurrentOdometerKm { get; set; } = 0;
        public string? Notes { get; set; }

        // Navigation
        public Customer Customer { get; set; } = null!;
        public ICollection<RepairOrder> RepairOrders { get; set; } = new List<RepairOrder>();
        public ICollection<WorkOrder> WorkOrders { get; set; } = new List<WorkOrder>();

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
