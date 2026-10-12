using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.Customer
{
    public class CreateCustomerDto
    {
        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? Email { get; set; }

        [Required]
        [MaxLength(20)]
        public string Phone { get; set; } = string.Empty;

        public string? ExtraPhone { get; set; }
        public string? Address { get; set; }
        public string? Notes { get; set; }
        public bool AllowDuplicate { get; set; } = false;
    }
}
