using AutoFix.DTOs.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace AutoFix.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;

        public AuthController(IHttpClientFactory httpClientFactory, IConfiguration config)
        {
            _httpClientFactory = httpClientFactory;
            _config = config;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
        {
            var tokenEndpoint = $"{_config["Keycloak:Authority"]}/protocol/openid-connect/token";
            var clientId = _config["Keycloak:ClientId"];
            var clientSecret = _config["Keycloak:ClientSecret"];

            var client = _httpClientFactory.CreateClient();

            var formData = new Dictionary<string, string>
            {
                ["grant_type"]    = "password",
                ["client_id"]     = clientId!,
                ["client_secret"] = clientSecret!,
                ["username"]      = dto.Username,
                ["password"]      = dto.Password
            };

            var response = await client.PostAsync(
                tokenEndpoint,
                new FormUrlEncodedContent(formData));

            if (!response.IsSuccessStatusCode)
                return Unauthorized(new { error = "Invalid username or password" });

            var json = await response.Content.ReadAsStringAsync();
            var tokenData = System.Text.Json.JsonDocument.Parse(json).RootElement;

            return Ok(new LoginResponseDto
            {
                AccessToken  = tokenData.GetProperty("access_token").GetString()!,
                RefreshToken = tokenData.GetProperty("refresh_token").GetString()!,
                ExpiresIn    = tokenData.GetProperty("expires_in").GetInt32(),
                TokenType    = "Bearer"
            });
        }

        [HttpPost("refresh")]
        [AllowAnonymous]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto dto)
        {
            var tokenEndpoint = $"{_config["Keycloak:Authority"]}/protocol/openid-connect/token";
            var clientId = _config["Keycloak:ClientId"];
            var clientSecret = _config["Keycloak:ClientSecret"];

            var client = _httpClientFactory.CreateClient();

            var formData = new Dictionary<string, string>
            {
                ["grant_type"]    = "refresh_token",
                ["client_id"]     = clientId!,
                ["client_secret"] = clientSecret!,
                ["refresh_token"] = dto.RefreshToken
            };

            var response = await client.PostAsync(
                tokenEndpoint,
                new FormUrlEncodedContent(formData));

            if (!response.IsSuccessStatusCode)
                return Unauthorized(new { error = "Invalid or expired refresh token" });

            var json = await response.Content.ReadAsStringAsync();
            var tokenData = System.Text.Json.JsonDocument.Parse(json).RootElement;

            return Ok(new LoginResponseDto
            {
                AccessToken  = tokenData.GetProperty("access_token").GetString()!,
                RefreshToken = tokenData.GetProperty("refresh_token").GetString()!,
                ExpiresIn    = tokenData.GetProperty("expires_in").GetInt32(),
                TokenType    = "Bearer"
            });
        }
    }
}
