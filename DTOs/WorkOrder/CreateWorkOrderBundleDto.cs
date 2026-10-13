using System.Collections.Generic;

namespace AutoFix.DTOs.WorkOrder
{
    public class CreateWorkOrderBundleDto
    {
        // Customer Info
        public int? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public string? CustomerNotes { get; set; }

        // Car Info
        public int? CarId { get; set; }
        public string? Make { get; set; }
        public string? Model { get; set; }
        public int Year { get; set; } = 2024;
        public string? LicensePlate { get; set; }
        public string? VIN { get; set; }
        public int? OdometerInKm { get; set; }

        // Work Order Info
        public string WorkType { get; set; } = "Maintenance"; // Maintenance or Inspection
        public string? CustomerComplaint { get; set; }
        public string? Notes { get; set; }
        public string? WorkDone { get; set; }
        public string? WorkToBeDone { get; set; }
        public int? AssignedTechnicianId { get; set; }

        // Requested Services & Parts Lines
        public List<CreateWorkOrderLineDto> Lines { get; set; } = new();

        // Confirmation flags for warnings
        public bool AllowLowerOdometer { get; set; } = false;
        public bool AllowDuplicatePhone { get; set; } = false;
        public bool AllowDuplicateCar { get; set; } = false;
    }
}
