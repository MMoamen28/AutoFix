using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.MechanicActionRequest
{
    public class ReviewActionRequestDto
    {
        [Required]
        [RegularExpression("^(Approved|Rejected)$",
            ErrorMessage = "Decision must be Approved or Rejected")]
        public string Decision { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? OwnerNote { get; set; }
    }
}
