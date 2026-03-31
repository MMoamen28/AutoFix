using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.Auth
{
    public class LoginRequestDto
    {
        [Required]
        [MaxLength(150)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Password { get; set; } = string.Empty;
    }
}
