using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.MechanicProfile
{
    public class CreateMechanicProfileDto
    {
        [Required]
        [MaxLength(100)]
        public string Specialization { get; set; } = string.Empty;

        [Required]
        [Range(0, 50)]
        public int YearsOfExperience { get; set; }

        [Required]
        [MaxLength(50)]
        public string CertificationNumber { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Bio { get; set; } = string.Empty;
    }
}
