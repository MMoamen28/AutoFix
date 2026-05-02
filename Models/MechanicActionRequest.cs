using System;
using AutoFix.Models;

namespace AutoFix.Models
{
    public class MechanicActionRequest
    {
        public int Id { get; set; }

        public int MechanicId { get; set; }
        public string MechanicName { get; set; } = string.Empty;

        public string ActionType { get; set; } = string.Empty;
        // "UpdateRepairOrderStatus" | "AddSparePart" | "AdjustStock"

        public string ActionPayload { get; set; } = string.Empty;
        // JSON string of the action data
        // e.g. { "repairOrderId": 5, "newStatus": "Completed", "notes": "Done" }

        public string Status { get; set; } = "Pending";
        // Pending | Approved | Rejected

        public string? OwnerNote { get; set; }
        // Owner can leave a note when approving or rejecting

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReviewedAt { get; set; }

        // Navigation
        public Mechanic Mechanic { get; set; } = null!;
    }
}
