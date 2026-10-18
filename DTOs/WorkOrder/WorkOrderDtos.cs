using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.WorkOrder
{
    public class CreateWorkOrderDto
    {
        [Required]
        public int CustomerId { get; set; }

        [Required]
        public int CarId { get; set; }

        public int? AssignedTechnicianId { get; set; }
        public int? HelperTechnicianId { get; set; }
        public int? InsuranceCompanyId { get; set; }
        public string? InsuranceClaimNumber { get; set; }

        public int OdometerInKm { get; set; }
        public string FuelLevel { get; set; } = "Quarter"; // Empty, Quarter, Half, ThreeQuarters, Full
        public string CustomerComplaint { get; set; } = string.Empty;
        public string? InspectionNotes { get; set; }
        public DateTime? ExpectedDeliveryAt { get; set; }

        // Work type and template notes
        public string WorkType { get; set; } = "Maintenance"; // Maintenance, Inspection
        public string? WorkDone { get; set; }
        public string? WorkToBeDone { get; set; }
        public string? Notes { get; set; }

        public List<CreateWorkOrderLineDto> Lines { get; set; } = new();
    }

    public class CreateWorkOrderLineDto
    {
        // LineType: LaborMechanical, LaborBodywork, LaborPaint, LaborOils, LaborElectrical, LaborOutsourced, LaborManufacturer, SparePart
        [Required]
        public string LineType { get; set; } = "LaborMechanical";
        
        [Required]
        public string Description { get; set; } = string.Empty;

        public int? ServiceId { get; set; }
        public int? SparePartId { get; set; }
        public bool IsExternalPart { get; set; } = false;
        public string? ExternalVendorName { get; set; }

        public decimal Quantity { get; set; } = 1;
        public decimal UnitCost { get; set; } = 0;
        public decimal UnitPrice { get; set; } = 0;
        public int? TechnicianId { get; set; }
        public DateTime? AddedAt { get; set; }
        public string? RevisionReason { get; set; }
    }

    public class UpdateWorkOrderLineDto
    {
        public string? LineType { get; set; }
        public string? Description { get; set; }
        public int? ServiceId { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? UnitCost { get; set; }
        public int? TechnicianId { get; set; }
        public string? RevisionReason { get; set; }
    }

    public class UpdateWorkOrderDto
    {
        public int? AssignedTechnicianId { get; set; }
        public int? HelperTechnicianId { get; set; }
        public int? InsuranceCompanyId { get; set; }
        public string? InsuranceClaimNumber { get; set; }
        public int OdometerInKm { get; set; }
        public string FuelLevel { get; set; } = "Quarter";
        public string CustomerComplaint { get; set; } = string.Empty;
        public string? InspectionNotes { get; set; }
        public string? WorkType { get; set; }
        public string? WorkDone { get; set; }
        public string? WorkToBeDone { get; set; }
        public string? Notes { get; set; }
        public string? ConcurrencyToken { get; set; }
        public DateTime? ExpectedDeliveryAt { get; set; }
        public List<CreateWorkOrderLineDto> Lines { get; set; } = new();
    }

    public class AssignMechanicRequestDto
    {
        public int? MainMechanicId { get; set; }
        public int? HelperMechanicId { get; set; }
        public string? Reason { get; set; }
        public string? AssignedBy { get; set; }
    }

    public class WorkOrderMechanicHistoryDto
    {
        public int Id { get; set; }
        public int WorkOrderId { get; set; }
        public string Role { get; set; } = "Main";
        public int? PreviousMechanicId { get; set; }
        public string? PreviousMechanicName { get; set; }
        public int? NewMechanicId { get; set; }
        public string? NewMechanicName { get; set; }
        public string AssignedBy { get; set; } = string.Empty;
        public DateTime AssignedAt { get; set; }
        public string? Reason { get; set; }
    }

    public class WorkOrderStatusTransitionDto
    {
        [Required]
        public string NewStatus { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class ConvertWorkOrderToInvoiceDto
    {
        public decimal? VatPercentage { get; set; } = 14.0m;
        public decimal? DiscountAmount { get; set; } = 0m;
        public string? Currency { get; set; } = "EGP";
        public string? Notes { get; set; }
    }

    public class WorkOrderResponseDto
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public string ConcurrencyToken { get; set; } = string.Empty;

        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;

        public int CarId { get; set; }
        public string CarMake { get; set; } = string.Empty;
        public string CarModel { get; set; } = string.Empty;
        public string CarPlate { get; set; } = string.Empty;
        public string CarChassis { get; set; } = string.Empty;

        public int? AssignedTechnicianId { get; set; }
        public string? AssignedTechnicianName { get; set; }

        public int? HelperTechnicianId { get; set; }
        public string? HelperTechnicianName { get; set; }

        public int OdometerInKm { get; set; }
        public string FuelLevel { get; set; } = "Quarter";
        public string CustomerComplaint { get; set; } = string.Empty;
        public string InspectionNotes { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";

        public string WorkType { get; set; } = "Maintenance";
        public string WorkDone { get; set; } = string.Empty;
        public string WorkToBeDone { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;

        public decimal TotalLabor { get; set; }
        public decimal TotalParts { get; set; }
        public decimal TotalWorkmanship { get; set; }
        public decimal TotalAmount { get; set; }

        public DateTime ReceivedAt { get; set; }
        public DateTime? ExpectedDeliveryAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }

        public int? InvoiceId { get; set; }
        public string? InvoiceNumber { get; set; }
        public string? InvoiceStatus { get; set; }
        public decimal? PaidAmount { get; set; }
        public decimal? RemainingAmount { get; set; }

        public List<WorkOrderLineResponseDto> Lines { get; set; } = new();
        public List<WorkOrderPhotoResponseDto> Photos { get; set; } = new();
        public List<WorkOrderMechanicHistoryDto> MechanicHistories { get; set; } = new();
    }

    public class WorkOrderLineResponseDto
    {
        public int Id { get; set; }
        public string LineType { get; set; } = "LaborMechanical";
        public string Description { get; set; } = string.Empty;
        public int? ServiceId { get; set; }
        public string? ServiceName { get; set; }
        public int? SparePartId { get; set; }
        public string? SparePartName { get; set; }
        public bool IsExternalPart { get; set; }
        public string? ExternalVendorName { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Subtotal => Quantity * UnitPrice;
        public int? TechnicianId { get; set; }
        public string? TechnicianName { get; set; }
        public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    }

    public class WorkOrderPhotoResponseDto
    {
        public int Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public string PhotoType { get; set; } = "Reception";
        public string? Caption { get; set; }
        public DateTime UploadedAt { get; set; }
    }
}
