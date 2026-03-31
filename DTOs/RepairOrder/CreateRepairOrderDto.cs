using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.RepairOrder
{
    public class CreateRepairOrderDto
    {
        [Required]
        public int CarId { get; set; }

        [MaxLength(1000)]
        public string Notes { get; set; } = string.Empty;

        [Required]
        [MinLength(1)]
        public List<int> ServiceIds { get; set; } = new();
    }
}
