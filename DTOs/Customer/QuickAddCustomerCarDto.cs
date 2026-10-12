using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.Customer
{
    public class QuickAddCustomerCarDto
    {
        // Customer fields
        [Required]
        public string FullName { get; set; } = string.Empty;

        [Required]
        public string Phone { get; set; } = string.Empty;

        public string? ExtraPhone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? CustomerNotes { get; set; }
        public bool AllowDuplicatePhone { get; set; } = false;

        // Car fields
        [Required]
        public string Make { get; set; } = string.Empty;

        [Required]
        public string Model { get; set; } = string.Empty;

        [Range(1950, 2050)]
        public int Year { get; set; }

        [Required]
        public string LicensePlate { get; set; } = string.Empty;

        public string? VIN { get; set; }

        public string? Color { get; set; }
        public int CurrentOdometerKm { get; set; } = 0;
        public string? CarNotes { get; set; }
        public bool AllowDuplicateCar { get; set; } = false;
    }

    public class QuickAddCustomerCarResponseDto
    {
        public CustomerResponseDto Customer { get; set; } = null!;
        public AutoFix.DTOs.Car.CarResponseDto Car { get; set; } = null!;
    }
}
