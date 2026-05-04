using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.Cart
{
    public class AddToCartDto
    {
        [Required]
        [RegularExpression("^(Service|SparePart)$",
            ErrorMessage = "ItemType must be Service or SparePart")]
        public string ItemType { get; set; } = string.Empty;

        [Required]
        public int ItemId { get; set; }

        [Required]
        [Range(1, 100, ErrorMessage = "Quantity must be between 1 and 100")]
        public int Quantity { get; set; } = 1;
    }
}
