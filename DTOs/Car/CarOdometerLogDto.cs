using System;

namespace AutoFix.DTOs.Car
{
    public class CarOdometerLogDto
    {
        public int Id { get; set; }
        public int CarId { get; set; }
        public int OdometerKm { get; set; }
        public DateTime RecordedAt { get; set; }
        public string Source { get; set; } = string.Empty;
        public string? ReferenceId { get; set; }
        public string? Notes { get; set; }
        public bool IsLowerReadingWarning { get; set; }
    }

    public class UpdateOdometerRequestDto
    {
        public int NewOdometerKm { get; set; }
        public string? Source { get; set; } = "Manual";
        public string? ReferenceId { get; set; }
        public string? Notes { get; set; }
        public bool AllowLowerOdometer { get; set; } = false;
    }
}
