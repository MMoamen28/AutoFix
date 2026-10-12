using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.Car
{
    public class CreateCarDto
    {
        public int? CustomerId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Make { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Model { get; set; } = string.Empty;

        [Required]
        [Range(1900, 2100, ErrorMessage = "Year must be between 1900 and 2100")]
        public int Year { get; set; }

        [Required]
        [MaxLength(20)]
        public string LicensePlate { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string VIN { get; set; } = string.Empty;

        public string? Color { get; set; }
        public int CurrentOdometerKm { get; set; } = 0;
        public string? Notes { get; set; }
        public bool AllowDuplicate { get; set; } = false;
        public bool AllowLowerOdometer { get; set; } = false;
    }
}
