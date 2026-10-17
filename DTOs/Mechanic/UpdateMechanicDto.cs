using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.Mechanic
{
    public class UpdateMechanicDto
    {
        [MaxLength(100)]
        public string? FullName { get; set; }

        public string? FirstName { get; set; }

        public string? LastName { get; set; }

        public string? Phone { get; set; }

        public string? Notes { get; set; }

        public bool IsActive { get; set; } = true;

        // Kept optional for backward compatibility
        public string? Email { get; set; }
    }
}
