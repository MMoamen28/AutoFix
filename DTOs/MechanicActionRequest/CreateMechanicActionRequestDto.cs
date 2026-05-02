using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.MechanicActionRequest
{
    public class CreateMechanicActionRequestDto
    {
        [Required]
        [RegularExpression("^(UpdateRepairOrderStatus|AddSparePart|AdjustStock)$")]
        public string ActionType { get; set; } = string.Empty;

        [Required]
        public string ActionPayload { get; set; } = string.Empty;
        // Must be valid JSON string
    }
}
