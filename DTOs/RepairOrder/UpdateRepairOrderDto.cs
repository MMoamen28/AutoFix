using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.RepairOrder
{
    public class UpdateRepairOrderDto
    {
        [Required]
        [RegularExpression("^(Pending|InProgress|Completed|Cancelled)$",
            ErrorMessage = "Status must be Pending, InProgress, Completed, or Cancelled")]
        public string Status { get; set; } = string.Empty;

        public int? MechanicId { get; set; }

        [MaxLength(1000)]
        public string Notes { get; set; } = string.Empty;
    }
}
