using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.Auth
{
    public class RefreshTokenRequestDto
    {
        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }
}
