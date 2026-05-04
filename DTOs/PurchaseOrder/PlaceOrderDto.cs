using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.PurchaseOrder
{
    public class PlaceOrderDto
    {
        [Required]
        public int CarId { get; set; }
        // The car this purchase is for

        [MaxLength(500)]
        public string Notes { get; set; } = string.Empty;
        // Customer can add notes about what they need done
    }
}
