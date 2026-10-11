using AutoFix.DTOs.Auth;
using AutoFix.Models;
using System.Threading.Tasks;

namespace AutoFix.Services.Interfaces
{
    public interface IAuthService
    {
        Task<LoginResponseDto> LoginAsync(LoginRequestDto dto);
        Task<LoginResponseDto> RegisterCustomerAsync(RegisterRequestDto dto);
        Task<LoginResponseDto?> ChangePasswordAsync(int userId, ChangePasswordDto dto);
        Task<bool> AdminResetPasswordAsync(int userId, string newPassword, string adminUserName);
        Task<UserProfileDto?> GetUserProfileAsync(int userId);
        Task EnsureDefaultAdminCreatedAsync();
        string GenerateJwtToken(AppUser user);
    }
}
