using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.PurchaseOrder
{
    public class AssignMechanicDto
    {
        [Required]
        public int MechanicId { get; set; }
    }
}
