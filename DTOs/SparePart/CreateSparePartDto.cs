using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.SparePart
{
    public class CreateSparePartDto
    {
        [Required]
        public int CategoryId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string PartNumber { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Brand { get; set; } = string.Empty;

        [Required]
        [Range(0.01, 99999.99, ErrorMessage = "Unit price must be between 0.01 and 99999.99")]
        public decimal UnitPrice { get; set; }

        [Required]
        [Range(0, int.MaxValue, ErrorMessage = "Stock quantity cannot be negative")]
        public int StockQuantity { get; set; }

        [Required]
        [Range(0, int.MaxValue, ErrorMessage = "Minimum stock level cannot be negative")]
        public int MinimumStockLevel { get; set; }
    }
}
