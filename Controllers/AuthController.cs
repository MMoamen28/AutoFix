using AutoFix.Data;
using AutoFix.DTOs.Auth;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly AppDbContext _db;
        private readonly IAuthService _authService;
        private readonly IDataFolderService _dataFolder;

        public AuthController(
            IHttpClientFactory httpClientFactory,
            IConfiguration config,
            AppDbContext db,
            IAuthService authService,
            IDataFolderService dataFolder)
        {
            _httpClientFactory = httpClientFactory;
            _config = config;
            _db = db;
            _authService = authService;
            _dataFolder = dataFolder;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
        {
            var authMode = _config["AuthMode"] ?? "Local";

            if (authMode.Equals("Local", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var response = await _authService.LoginAsync(dto);
                    return Ok(response);
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Unauthorized(new { error = "Login failed", message = ex.Message });
                }
                catch (Exception ex)
                {
                    return BadRequest(new { error = "Login failed", message = ex.Message });
                }
            }

            // --- Keycloak Mode (Preserved from original code) ---
            return await KeycloakLoginAsync(dto);
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto)
        {
            var authMode = _config["AuthMode"] ?? "Local";

            if (authMode.Equals("Local", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var response = await _authService.RegisterCustomerAsync(dto);
                    return Ok(response);
                }
                catch (Exception ex)
                {
                    return BadRequest(new { error = "Registration failed", message = ex.Message });
                }
            }

            // --- Keycloak Mode (Preserved from original code) ---
            return await KeycloakRegisterAsync(dto);
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (!int.TryParse(userIdStr, out var userId))
            {
                return Unauthorized(new { message = "Invalid user token." });
            }

            try
            {
                var response = await _authService.ChangePasswordAsync(userId, dto);
                return response != null ? Ok(response) : NotFound();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (int.TryParse(userIdStr, out var userId))
            {
                var profile = await _authService.GetUserProfileAsync(userId);
                if (profile != null) return Ok(profile);
            }

            return Ok(new
            {
                username = User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("preferred_username")?.Value ?? "User",
                role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Customer",
                dataDirectory = _dataFolder.RootPath,
                isFallbackDirectory = _dataFolder.IsFallback
            });
        }

        [HttpPost("admin-reset-password/{id}")]
        [Authorize(Roles = "Admin,Owner")]
        public async Task<IActionResult> AdminResetPassword(int id, [FromBody] ResetPasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                return BadRequest(new { message = "New password is required." });
            }

            var adminName = User.Identity?.Name ?? "Admin";
            var success = await _authService.AdminResetPasswordAsync(id, dto.NewPassword, adminName);
            return success 
                ? Ok(new { message = "User password reset successfully. User must change password on next login." })
                : NotFound(new { message = "User not found." });
        }

        // =========================================================================
        // LEGACY KEYCLOAK METHODS (100% Preserved for Backward Compatibility)
        // =========================================================================
        private async Task<IActionResult> KeycloakLoginAsync(LoginRequestDto dto)
        {
            var httpClient = _httpClientFactory.CreateClient();
            var response = await httpClient.PostAsync(
                $"{_config["Keycloak:Authority"]}/protocol/openid-connect/token",
                new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["grant_type"] = "password",
                    ["client_id"] = _config["Keycloak:ClientId"]!,
                    ["client_secret"] = _config["Keycloak:ClientSecret"]!,
                    ["username"] = dto.Username,
                    ["password"] = dto.Password
                })
            );

            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                string detail = "Invalid username or password";
                try
                {
                    var errDoc = System.Text.Json.JsonDocument.Parse(json);
                    if (errDoc.RootElement.TryGetProperty("error_description", out var desc))
                    {
                        detail = desc.GetString() ?? detail;
                    }
                }
                catch { }

                return BadRequest(new
                {
                    error = "Login failed",
                    detail = detail,
                    hint = "Check username and password are correct"
                });
            }

            var tokenData = System.Text.Json.JsonDocument.Parse(json).RootElement;
            return Ok(new LoginResponseDto
            {
                AccessToken = tokenData.GetProperty("access_token").GetString()!,
                RefreshToken = tokenData.GetProperty("refresh_token").GetString()!,
                ExpiresIn = tokenData.GetProperty("expires_in").GetInt32(),
                TokenType = "Bearer",
                Username = dto.Username,
                DataDirectory = _dataFolder.RootPath,
                IsFallbackDirectory = _dataFolder.IsFallback
            });
        }

        private async Task<IActionResult> KeycloakRegisterAsync(RegisterRequestDto dto)
        {
            var adminToken = await GetKeycloakAdminTokenAsync();
            if (adminToken == null)
                return StatusCode(500, new { error = "Could not connect to Keycloak" });

            var httpClient = _httpClientFactory.CreateClient();
            var keycloakBase = _config["Keycloak:AdminBaseUrl"];

            var createUserPayload = new
            {
                username = dto.Username,
                email = dto.Email,
                firstName = dto.FirstName,
                lastName = dto.LastName,
                enabled = true,
                credentials = new[]
                {
                    new { type = "password", value = dto.Password, temporary = false }
                }
            };

            var createRequest = new HttpRequestMessage(HttpMethod.Post, $"{keycloakBase}/users");
            createRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
            createRequest.Content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(createUserPayload),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            var createResponse = await httpClient.SendAsync(createRequest);
            if (!createResponse.IsSuccessStatusCode)
            {
                var err = await createResponse.Content.ReadAsStringAsync();
                return BadRequest(new { error = "Registration failed", detail = err });
            }

            var location = createResponse.Headers.Location?.ToString();
            var keycloakUserId = location?.Split('/').Last();
            if (string.IsNullOrEmpty(keycloakUserId))
                return StatusCode(500, new { error = "Could not retrieve new user ID from Keycloak" });

            var rolesRequest = new HttpRequestMessage(HttpMethod.Get, $"{keycloakBase}/roles");
            rolesRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
            var rolesResponse = await httpClient.SendAsync(rolesRequest);
            var rolesJson = await rolesResponse.Content.ReadAsStringAsync();
            var roles = System.Text.Json.JsonDocument.Parse(rolesJson).RootElement;
            var customerRole = roles.EnumerateArray().FirstOrDefault(r => r.GetProperty("name").GetString() == "Customer");
            var customerRoleId = customerRole.GetProperty("id").GetString();
            var customerRoleName = customerRole.GetProperty("name").GetString();

            var assignRolePayload = new[] { new { id = customerRoleId, name = customerRoleName } };
            var assignRequest = new HttpRequestMessage(HttpMethod.Post, $"{keycloakBase}/users/{keycloakUserId}/role-mappings/realm");
            assignRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
            assignRequest.Content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(assignRolePayload),
                System.Text.Encoding.UTF8,
                "application/json"
            );
            await httpClient.SendAsync(assignRequest);

            var customer = new Customer
            {
                FullName = $"{dto.FirstName} {dto.LastName}",
                Email = dto.Email,
                Phone = dto.Phone,
                KeycloakUserId = keycloakUserId,
                CreatedAt = DateTime.UtcNow
            };
            _db.Customers.Add(customer);
            await _db.SaveChangesAsync();

            var loginResponse = await httpClient.PostAsync(
                $"{_config["Keycloak:Authority"]}/protocol/openid-connect/token",
                new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["grant_type"] = "password",
                    ["client_id"] = _config["Keycloak:ClientId"]!,
                    ["client_secret"] = _config["Keycloak:ClientSecret"]!,
                    ["username"] = dto.Username,
                    ["password"] = dto.Password
                })
            );

            if (!loginResponse.IsSuccessStatusCode)
                return Ok(new { message = "Registered successfully. Please log in.", customerId = customer.Id });

            var tokenJson = await loginResponse.Content.ReadAsStringAsync();
            var tokenData = System.Text.Json.JsonDocument.Parse(tokenJson).RootElement;

            return Ok(new LoginResponseDto
            {
                AccessToken = tokenData.GetProperty("access_token").GetString()!,
                RefreshToken = tokenData.GetProperty("refresh_token").GetString()!,
                ExpiresIn = tokenData.GetProperty("expires_in").GetInt32(),
                TokenType = "Bearer",
                Username = dto.Username,
                DataDirectory = _dataFolder.RootPath,
                IsFallbackDirectory = _dataFolder.IsFallback
            });
        }

        private async Task<string?> GetKeycloakAdminTokenAsync()
        {
            var httpClient = _httpClientFactory.CreateClient();
            var response = await httpClient.PostAsync(
                $"{_config["Keycloak:AuthServerUrl"]}/realms/master/protocol/openid-connect/token",
                new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["grant_type"] = "password",
                    ["client_id"] = "admin-cli",
                    ["username"] = _config["Keycloak:AdminUsername"]!,
                    ["password"] = _config["Keycloak:AdminPassword"]!
                })
            );
            if (!response.IsSuccessStatusCode) return null;
            var json = await response.Content.ReadAsStringAsync();
            return System.Text.Json.JsonDocument.Parse(json).RootElement.GetProperty("access_token").GetString();
        }
    }
}
