using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.Mechanic
{
    public class CreateMechanicDto
    {
        [MaxLength(100)]
        public string? FullName { get; set; }

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string? Phone { get; set; }

        public string? Notes { get; set; }

        public bool IsActive { get; set; } = true;

        // Kept optional for backward compatibility
        public string? Email { get; set; }

        public string? Username { get; set; }

        public string? Password { get; set; }
    }
}
