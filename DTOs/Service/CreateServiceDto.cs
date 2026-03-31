using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.Service
{
    public class CreateServiceDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [Range(0, 10000)]
        public decimal BasePrice { get; set; }

        [Required]
        [Range(1, 1440)]
        public int EstimatedMinutes { get; set; }
    }
}
