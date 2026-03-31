using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.SparePart
{
    public class AdjustStockDto
    {
        [Required]
        [Range(-10000, 10000, ErrorMessage = "Adjustment must be between -10000 and 10000")]
        public int Adjustment { get; set; }
        // Positive = adding stock, negative = removing stock

        [Required]
        [MaxLength(200)]
        public string Reason { get; set; } = string.Empty;
        // e.g. "Received shipment", "Used in repair order #42", "Damaged"
    }
}
