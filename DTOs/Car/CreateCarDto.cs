using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.Car
{
    public class CreateCarDto
    {
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
        [MaxLength(17)]
        [MinLength(17, ErrorMessage = "VIN must be exactly 17 characters")]
        public string VIN { get; set; } = string.Empty;
    }
}
