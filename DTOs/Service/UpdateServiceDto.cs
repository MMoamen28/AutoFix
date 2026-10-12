using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.Service
{
    public class UpdateServiceDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(100)]
        public string NameArabic { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        public string Category { get; set; } = "Mechanical";

        [Required]
        [Range(0, 100000)]
        public decimal BasePrice { get; set; }

        [Range(0, 100000)]
        public decimal DefaultCost { get; set; } = 0;

        [Range(1, 1440)]
        public int EstimatedMinutes { get; set; } = 30;

        public bool IsActive { get; set; } = true;
    }
}
