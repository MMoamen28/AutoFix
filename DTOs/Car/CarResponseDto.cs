namespace AutoFix.DTOs.Car
{
    public class CarResponseDto
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public string Make { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int Year { get; set; }
        public string LicensePlate { get; set; } = string.Empty;
        public string VIN { get; set; } = string.Empty;
        public string? Color { get; set; }
        public int CurrentOdometerKm { get; set; }
        public string? Notes { get; set; }
        public bool IsDeleted { get; set; } = false;
        public System.DateTime? DeletedAt { get; set; }
    }
}
