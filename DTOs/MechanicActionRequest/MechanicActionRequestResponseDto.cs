using System;

namespace AutoFix.DTOs.MechanicActionRequest
{
    public class MechanicActionRequestResponseDto
    {
        public int Id { get; set; }
        public int MechanicId { get; set; }
        public string MechanicName { get; set; } = string.Empty;
        public string ActionType { get; set; } = string.Empty;
        public string ActionPayload { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? OwnerNote { get; set; }
        public DateTime RequestedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
    }
}
