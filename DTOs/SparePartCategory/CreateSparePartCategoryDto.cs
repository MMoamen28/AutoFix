using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.SparePartCategory
{
    public class CreateSparePartCategoryDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;
    }
}
