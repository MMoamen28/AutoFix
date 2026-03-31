using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.SparePart
{
    public class UpdateSparePartDto
    {
        [Required]
        public int CategoryId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Brand { get; set; } = string.Empty;

        [Required]
        [Range(0.01, 99999.99)]
        public decimal UnitPrice { get; set; }

        [Required]
        [Range(0, int.MaxValue)]
        public int MinimumStockLevel { get; set; }

        public bool IsActive { get; set; }
    }
}
