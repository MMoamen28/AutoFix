using AutoFix.Models.Common;
using System;
using System.Collections.Generic;

namespace AutoFix.Models
{
    public class WorkOrder : ISoftDeletable
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; } = string.Empty; // e.g. WO-2026-0001
        
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        public int CarId { get; set; }
        public Car Car { get; set; } = null!;

        public int? AssignedTechnicianId { get; set; }
        public Mechanic? AssignedTechnician { get; set; }

        public int? HelperTechnicianId { get; set; }
        public Mechanic? HelperTechnician { get; set; }

        public int? InsuranceCompanyId { get; set; }
        public InsuranceCompany? InsuranceCompany { get; set; }
        public string? InsuranceClaimNumber { get; set; }

        public int OdometerInKm { get; set; }
        public string FuelLevel { get; set; } = "Quarter"; // Empty, Quarter, Half, ThreeQuarters, Full
        public string CustomerComplaint { get; set; } = string.Empty;
        public string InspectionNotes { get; set; } = string.Empty;
        
        // Work type: Maintenance (صيانة), Inspection (فحص سيارة)
        public string WorkType { get; set; } = "Maintenance";
        public string WorkDone { get; set; } = string.Empty; // ما تم تنفيذه
        public string WorkToBeDone { get; set; } = string.Empty; // ما سيتم تنفيذه
        public string Notes { get; set; } = string.Empty; // ملاحظات
        
        // Status: Pending, InProgress, WaitingForParts, Completed, Delivered, Cancelled
        public string Status { get; set; } = "Pending";
        
        public decimal TotalLabor { get; set; } = 0;
        public decimal TotalParts { get; set; } = 0;
        public decimal TotalWorkmanship { get; set; } = 0;
        public decimal TotalAmount { get; set; } = 0;

        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ExpectedDeliveryAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }

        public ICollection<WorkOrderLine> Lines { get; set; } = new List<WorkOrderLine>();
        public ICollection<WorkOrderPhoto> Photos { get; set; } = new List<WorkOrderPhoto>();
        public ICollection<WorkOrderMechanicHistory> MechanicHistories { get; set; } = new List<WorkOrderMechanicHistory>();

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }

    public class WorkOrderLine : ISoftDeletable
    {
        public int Id { get; set; }
        public int WorkOrderId { get; set; }
        public WorkOrder WorkOrder { get; set; } = null!;

        // LineType: LaborMechanical, LaborBodywork, LaborPaint, LaborOils, LaborElectrical, LaborOutsourced, LaborManufacturer, SparePart
        public string LineType { get; set; } = "LaborMechanical";
        public string Description { get; set; } = string.Empty;

        public int? ServiceId { get; set; }
        public Service? Service { get; set; }

        public int? SparePartId { get; set; }
        public SparePart? SparePart { get; set; }

        public bool IsExternalPart { get; set; } = false;
        public string? ExternalVendorName { get; set; }

        public decimal Quantity { get; set; } = 1;
        public decimal UnitCost { get; set; } = 0;
        public decimal UnitPrice { get; set; } = 0;
        public decimal Subtotal => Quantity * UnitPrice;

        public int? TechnicianId { get; set; }
        public Mechanic? Technician { get; set; }

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }

    public class WorkOrderPhoto : ISoftDeletable
    {
        public int Id { get; set; }
        public int WorkOrderId { get; set; }
        public WorkOrder WorkOrder { get; set; } = null!;

        public string FileName { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty; // Relative to Files/
        public string PhotoType { get; set; } = "Reception"; // Reception, Inspection, InProgress, Delivery, Document
        public string? Caption { get; set; }
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
