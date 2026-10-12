using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.Inspection
{
    public class CreateInspectionDto
    {
        public int? CustomerId { get; set; }
        public int? CarId { get; set; }
        public int? WorkOrderId { get; set; }
        public int? InvoiceId { get; set; }

        public string CarPlate { get; set; } = string.Empty;
        public string CarChassis { get; set; } = string.Empty;
        public string CarMake { get; set; } = string.Empty;
        public string CarModel { get; set; } = string.Empty;
        public int CarYear { get; set; }
        public int OdometerKm { get; set; }

        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;

        public string? InvoiceNumber { get; set; }
        public decimal? InvoiceAmount { get; set; }

        public string Status { get; set; } = "Draft"; // Draft, Final
        public string ChecklistDataJson { get; set; } = "{}";
        public string DamageMarkersJson { get; set; } = "[]";
        public string? DiagnosticScanResult { get; set; }
        public string Notes { get; set; } = string.Empty;
        public string GeneralVerdict { get; set; } = "Good";
        public decimal OverallScore { get; set; } = 100;
        public DateTime InspectedAt { get; set; } = DateTime.UtcNow;
    }

    public class UpdateInspectionDto
    {
        public int? CustomerId { get; set; }
        public int? CarId { get; set; }
        public int? WorkOrderId { get; set; }
        public int? InvoiceId { get; set; }

        public string CarPlate { get; set; } = string.Empty;
        public string CarChassis { get; set; } = string.Empty;
        public string CarMake { get; set; } = string.Empty;
        public string CarModel { get; set; } = string.Empty;
        public int CarYear { get; set; }
        public int OdometerKm { get; set; }

        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;

        public string? InvoiceNumber { get; set; }
        public decimal? InvoiceAmount { get; set; }

        public string Status { get; set; } = "Draft";
        public string ChecklistDataJson { get; set; } = "{}";
        public string DamageMarkersJson { get; set; } = "[]";
        public string? DiagnosticScanResult { get; set; }
        public string Notes { get; set; } = string.Empty;
        public string GeneralVerdict { get; set; } = "Good";
        public decimal OverallScore { get; set; } = 100;
        public DateTime InspectedAt { get; set; } = DateTime.UtcNow;
    }

    public class InspectionResponseDto
    {
        public int Id { get; set; }
        public string ReportNumber { get; set; } = string.Empty;

        public int? CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;

        public int? CarId { get; set; }
        public string CarPlate { get; set; } = string.Empty;
        public string CarChassis { get; set; } = string.Empty;
        public string CarMake { get; set; } = string.Empty;
        public string CarModel { get; set; } = string.Empty;
        public int CarYear { get; set; }
        public int OdometerKm { get; set; }

        public int? WorkOrderId { get; set; }
        public string? WorkOrderNumber { get; set; }

        public int? InvoiceId { get; set; }
        public string? InvoiceNumber { get; set; }
        public decimal? InvoiceAmount { get; set; }

        public string Status { get; set; } = "Draft"; // Draft, Final
        public int RevisionNumber { get; set; } = 1;
        public int? PreviousRevisionId { get; set; }
        public bool IsCurrentRevision { get; set; } = true;
        public DateTime? FinalizedAt { get; set; }

        public string ChecklistDataJson { get; set; } = "{}";
        public string DamageMarkersJson { get; set; } = "[]";
        public string? DiagnosticScanResult { get; set; }
        public string? PdfFilePath { get; set; }

        public decimal OverallScore { get; set; } = 100;
        public string GeneralVerdict { get; set; } = "Good";
        public string Notes { get; set; } = string.Empty;

        public DateTime InspectedAt { get; set; }
        public int? InspectedByMechanicId { get; set; }
        public string? InspectedByMechanicName { get; set; }

        public List<InspectionRevisionSummaryDto> Revisions { get; set; } = new();
    }

    public class InspectionRevisionSummaryDto
    {
        public int Id { get; set; }
        public string ReportNumber { get; set; } = string.Empty;
        public int RevisionNumber { get; set; }
        public DateTime InspectedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsCurrentRevision { get; set; }
    }
}
