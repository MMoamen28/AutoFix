using AutoFix.Data;
using AutoFix.DTOs.Auth;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _db;
        private readonly IDataFolderService _dataFolder;
        private readonly ILogger<AuthService> _logger;
        private readonly PasswordHasher<AppUser> _passwordHasher = new();

        public AuthService(AppDbContext db, IDataFolderService dataFolder, ILogger<AuthService> logger)
        {
            _db = db;
            _dataFolder = dataFolder;
            _logger = logger;
        }

        public async Task EnsureDefaultAdminCreatedAsync()
        {
            var adminUser = await _db.AppUsers.FirstOrDefaultAsync(u => u.Username == "admin");
            if (adminUser == null)
            {
                var newAdmin = new AppUser
                {
                    Username = "admin",
                    FullName = "Workshop Administrator",
                    Email = "admin@autofix.local",
                    Role = "Admin",
                    MustChangePassword = true, // Condition 2: Block app until default admin changes password
                    CreatedAt = DateTime.UtcNow
                };
                newAdmin.PasswordHash = _passwordHasher.HashPassword(newAdmin, "AutoFixAdmin2026!");
                _db.AppUsers.Add(newAdmin);
                await _db.SaveChangesAsync();

                _db.AuditLogs.Add(new AuditLog
                {
                    Action = "DefaultAdminCreated",
                    EntityName = "AppUser",
                    EntityId = newAdmin.Id.ToString(),
                    Details = "Initial admin user seeded. Password change required.",
                    Timestamp = DateTime.UtcNow
                });
                await _db.SaveChangesAsync();

                _logger.LogWarning("Default Admin user created: 'admin' (Must change password on first login).");
            }
        }

        public async Task<LoginResponseDto> LoginAsync(LoginRequestDto dto)
        {
            var user = await _db.AppUsers.FirstOrDefaultAsync(u => u.Username == dto.Username);
            if (user == null)
            {
                _logger.LogWarning("Login failed: User '{Username}' not found.", dto.Username);
                throw new UnauthorizedAccessException("Invalid username or password.");
            }

            // Lockout check (5 failed attempts / 15-minute lockout)
            if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow)
            {
                var remainingMinutes = Math.Ceiling((user.LockoutEnd.Value - DateTime.UtcNow).TotalMinutes);
                _logger.LogWarning("Login blocked for locked user '{Username}'. Remaining: {Minutes} min.", user.Username, remainingMinutes);
                throw new UnauthorizedAccessException($"Account is locked due to repeated failed login attempts. Please try again in {remainingMinutes} minutes.");
            }

            var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
            if (verificationResult == PasswordVerificationResult.Failed)
            {
                user.FailedLoginAttempts++;
                if (user.FailedLoginAttempts >= 5)
                {
                    user.LockoutEnd = DateTime.UtcNow.AddMinutes(15);
                    _logger.LogWarning("User '{Username}' locked out for 15 minutes after 5 failed attempts.", user.Username);
                }
                await _db.SaveChangesAsync();
                throw new UnauthorizedAccessException("Invalid username or password.");
            }

            // Reset failed counter on successful authentication
            user.FailedLoginAttempts = 0;
            user.LockoutEnd = null;
            user.LastLoginAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _db.AuditLogs.Add(new AuditLog
            {
                UserId = user.Id.ToString(),
                UserName = user.Username,
                Action = "LoginSuccess",
                EntityName = "AppUser",
                EntityId = user.Id.ToString(),
                Timestamp = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            var token = GenerateJwtToken(user);

            return new LoginResponseDto
            {
                AccessToken = token,
                RefreshToken = string.Empty,
                ExpiresIn = 86400, // 24 hours
                TokenType = "Bearer",
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                MustChangePassword = user.MustChangePassword,
                DataDirectory = _dataFolder.RootPath,
                IsFallbackDirectory = _dataFolder.IsFallback
            };
        }

        public async Task<LoginResponseDto> RegisterCustomerAsync(RegisterRequestDto dto)
        {
            var exists = await _db.AppUsers.AnyAsync(u => u.Username == dto.Username);
            if (exists)
            {
                throw new InvalidOperationException("Username already exists. Please choose another username.");
            }

            var customer = new Customer
            {
                FullName = $"{dto.FirstName} {dto.LastName}".Trim(),
                Email = dto.Email,
                Phone = dto.Phone,
                CreatedAt = DateTime.UtcNow
            };
            _db.Customers.Add(customer);
            await _db.SaveChangesAsync();

            var user = new AppUser
            {
                Username = dto.Username,
                FullName = customer.FullName,
                Email = dto.Email,
                Phone = dto.Phone,
                Role = "Customer",
                CustomerId = customer.Id,
                MustChangePassword = false,
                CreatedAt = DateTime.UtcNow
            };
            user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);
            _db.AppUsers.Add(user);
            await _db.SaveChangesAsync();

            _db.AuditLogs.Add(new AuditLog
            {
                UserId = user.Id.ToString(),
                UserName = user.Username,
                Action = "CustomerRegistered",
                EntityName = "Customer",
                EntityId = customer.Id.ToString(),
                Details = $"Customer and local account created for {user.Username}",
                Timestamp = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            var token = GenerateJwtToken(user);
            return new LoginResponseDto
            {
                AccessToken = token,
                RefreshToken = string.Empty,
                ExpiresIn = 86400,
                TokenType = "Bearer",
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                MustChangePassword = false,
                DataDirectory = _dataFolder.RootPath,
                IsFallbackDirectory = _dataFolder.IsFallback
            };
        }

        public async Task<LoginResponseDto?> ChangePasswordAsync(int userId, ChangePasswordDto dto)
        {
            var user = await _db.AppUsers.FindAsync(userId);
            if (user == null) return null;

            var verify = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.CurrentPassword);
            if (verify == PasswordVerificationResult.Failed)
            {
                throw new UnauthorizedAccessException("Current password is not correct.");
            }

            user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
            user.MustChangePassword = false;
            user.FailedLoginAttempts = 0;
            user.LockoutEnd = null;
            await _db.SaveChangesAsync();

            _db.AuditLogs.Add(new AuditLog
            {
                UserId = user.Id.ToString(),
                UserName = user.Username,
                Action = "PasswordChanged",
                EntityName = "AppUser",
                EntityId = user.Id.ToString(),
                Timestamp = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            var token = GenerateJwtToken(user);
            return new LoginResponseDto
            {
                AccessToken = token,
                RefreshToken = string.Empty,
                ExpiresIn = 86400,
                TokenType = "Bearer",
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                MustChangePassword = false,
                DataDirectory = _dataFolder.RootPath,
                IsFallbackDirectory = _dataFolder.IsFallback
            };
        }

        public async Task<bool> AdminResetPasswordAsync(int userId, string newPassword, string adminUserName)
        {
            var user = await _db.AppUsers.FindAsync(userId);
            if (user == null) return false;

            user.PasswordHash = _passwordHasher.HashPassword(user, newPassword);
            user.MustChangePassword = true; // Force user to change their reset password
            user.FailedLoginAttempts = 0;
            user.LockoutEnd = null;
            await _db.SaveChangesAsync();

            _db.AuditLogs.Add(new AuditLog
            {
                UserName = adminUserName,
                Action = "AdminPasswordReset",
                EntityName = "AppUser",
                EntityId = user.Id.ToString(),
                Details = $"Admin '{adminUserName}' reset password for user '{user.Username}'.",
                Timestamp = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            return true;
        }

        public async Task<UserProfileDto?> GetUserProfileAsync(int userId)
        {
            var user = await _db.AppUsers.FindAsync(userId);
            if (user == null) return null;

            return new UserProfileDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                Role = user.Role,
                MustChangePassword = user.MustChangePassword,
                DataDirectory = _dataFolder.RootPath,
                IsFallbackDirectory = _dataFolder.IsFallback
            };
        }

        public string GenerateJwtToken(AppUser user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = _dataFolder.GetOrCreateJwtSigningKey();

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new("sub", user.Id.ToString()),
                new(ClaimTypes.Name, user.Username),
                new("preferred_username", user.Username),
                new("name", user.FullName),
                new(ClaimTypes.Role, user.Role),
                new("roles", user.Role), // Multi-role compatibility with Keycloak claim mapper
                new("role", user.Role),
                new("must_change_password", user.MustChangePassword.ToString().ToLowerInvariant())
            };

            if (user.CustomerId.HasValue)
            {
                claims.Add(new Claim("customer_id", user.CustomerId.Value.ToString()));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
