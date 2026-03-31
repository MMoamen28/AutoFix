using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.Mechanic
{
    public class CreateMechanicDto
    {
        [Required]
        [MaxLength(50)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string KeycloakUserId { get; set; } = string.Empty;
    }
}
