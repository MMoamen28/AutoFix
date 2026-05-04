using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.PurchaseOrder
{
    public class UpdatePurchaseOrderStatusDto
    {
        [Required]
        [RegularExpression(
            "^(Pending|AssignedToMechanic|InProgress|Completed|Cancelled)$",
            ErrorMessage = "Invalid status value")]
        public string Status { get; set; } = string.Empty;
    }
}
