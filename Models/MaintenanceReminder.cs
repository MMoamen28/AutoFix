using AutoFix.Models.Common;
using System;

namespace AutoFix.Models
{
    public class MaintenanceReminder : ISoftDeletable
    {
        public int Id { get; set; }
        public int CarId { get; set; }
        public Car Car { get; set; } = null!;

        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        public string ReminderType { get; set; } = "OilChange"; // OilChange, BrakeCheck, GeneralMaintenance, TimingBelt
        public string Title { get; set; } = string.Empty;
        public string MessageTemplate { get; set; } = string.Empty;
        
        public DateTime? DueDate { get; set; }
        public int? DueOdometerKm { get; set; }
        
        public bool IsSent { get; set; } = false;
        public DateTime? SentAt { get; set; }
        public string? SentChannel { get; set; } // WhatsApp, SMS
        public string Status { get; set; } = "Pending"; // Pending, Sent, Completed, Dismissed

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }

    public class EmployeeAdvance : ISoftDeletable
    {
        public int Id { get; set; }
        public int MechanicId { get; set; }
        public Mechanic Mechanic { get; set; } = null!;

        public decimal Amount { get; set; }
        public DateTime RequestedDate { get; set; } = DateTime.UtcNow;
        public string? Reason { get; set; }
        public bool IsDeducted { get; set; } = false;
        public DateTime? DeductedDate { get; set; }
        public string? ApprovedByUserId { get; set; }

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }

    public class EmployeeCustody : ISoftDeletable
    {
        public int Id { get; set; }
        public int MechanicId { get; set; }
        public Mechanic Mechanic { get; set; } = null!;

        public string ItemName { get; set; } = string.Empty; // e.g. Diagnostic Scanner, Torque Wrench Set
        public string? SerialNumber { get; set; }
        public DateTime AssignedDate { get; set; } = DateTime.UtcNow;
        public DateTime? ReturnedDate { get; set; }
        public string Status { get; set; } = "WithEmployee"; // WithEmployee, Returned, Damaged, Lost
        public string? Notes { get; set; }

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }

    public class CarInspection : ISoftDeletable
    {
        public int Id { get; set; }
        public string ReportNumber { get; set; } = string.Empty; // e.g. INSP-2026-0001
        
        public string CarPlate { get; set; } = string.Empty;
        public string CarChassis { get; set; } = string.Empty;
        public string CarMake { get; set; } = string.Empty;
        public string CarModel { get; set; } = string.Empty;
        public int CarYear { get; set; }
        public int OdometerKm { get; set; }

        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;

        // Stage B Relations
        public int? CustomerId { get; set; }
        public Customer? Customer { get; set; }

        public int? CarId { get; set; }
        public Car? Car { get; set; }

        public int? WorkOrderId { get; set; }
        public WorkOrder? WorkOrder { get; set; }

        public int? InvoiceId { get; set; }
        public Invoice? Invoice { get; set; }

        public string? InvoiceNumber { get; set; }
        public decimal? InvoiceAmount { get; set; }

        // Status & Revision Control (Draft / Final)
        public string Status { get; set; } = "Draft"; // Draft, Final
        public int RevisionNumber { get; set; } = 1;
        public int? PreviousRevisionId { get; set; }
        public bool IsCurrentRevision { get; set; } = true;
        public DateTime? FinalizedAt { get; set; }

        // Structured Checklist, Damage Markers & Diagnostic Results
        public string ChecklistDataJson { get; set; } = "{}";
        public string DamageMarkersJson { get; set; } = "[]"; // [{ id, x, y, view, description }]
        public string? DiagnosticScanResult { get; set; }
        public string? PdfFilePath { get; set; }

        public decimal OverallScore { get; set; } = 100; // Out of 100
        public string GeneralVerdict { get; set; } = "Good"; // Excellent, Good, Fair, Poor, Reject
        public string Notes { get; set; } = string.Empty;

        public DateTime InspectedAt { get; set; } = DateTime.UtcNow;
        public int? InspectedByMechanicId { get; set; }
        public Mechanic? InspectedByMechanic { get; set; }

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
