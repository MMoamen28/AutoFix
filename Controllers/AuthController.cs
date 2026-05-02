using AutoFix.Data;
using AutoFix.DTOs.Auth;
using AutoFix.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
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

        public AuthController(IHttpClientFactory httpClientFactory, IConfiguration config, AppDbContext db)
        {
            _httpClientFactory = httpClientFactory;
            _config = config;
            _db = db;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto)
        {
            var adminToken = await GetKeycloakAdminTokenAsync();
            if (adminToken == null)
                return StatusCode(500, new { error = "Could not connect to Keycloak" });

            var httpClient = _httpClientFactory.CreateClient();
            var keycloakBase = _config["Keycloak:AdminBaseUrl"];
            // e.g. http://keycloak:8080/admin/realms/autofix

            // Step 1 — Create user in Keycloak
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

            // Step 2 — Get the new user's Keycloak ID from the Location header
            var location = createResponse.Headers.Location?.ToString();
            var keycloakUserId = location?.Split('/').Last();
            if (string.IsNullOrEmpty(keycloakUserId))
                return StatusCode(500, new { error = "Could not retrieve new user ID from Keycloak" });

            // Step 3 — Get the Customer role ID from Keycloak
            var rolesRequest = new HttpRequestMessage(HttpMethod.Get, $"{keycloakBase}/roles");
            rolesRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
            var rolesResponse = await httpClient.SendAsync(rolesRequest);
            var rolesJson = await rolesResponse.Content.ReadAsStringAsync();
            var roles = System.Text.Json.JsonDocument.Parse(rolesJson).RootElement;
            var customerRole = roles.EnumerateArray()
                .FirstOrDefault(r => r.GetProperty("name").GetString() == "Customer");
            var customerRoleId = customerRole.GetProperty("id").GetString();
            var customerRoleName = customerRole.GetProperty("name").GetString();

            // Step 4 — Assign Customer role to the new user
            var assignRolePayload = new[]
            {
                new { id = customerRoleId, name = customerRoleName }
            };
            var assignRequest = new HttpRequestMessage(HttpMethod.Post, $"{keycloakBase}/users/{keycloakUserId}/role-mappings/realm");
            assignRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
            assignRequest.Content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(assignRolePayload),
                System.Text.Encoding.UTF8,
                "application/json"
            );
            await httpClient.SendAsync(assignRequest);

            // Step 5 — Create Customer record in the database
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

            // Step 6 — Log them in immediately and return token
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
                TokenType = "Bearer"
            });
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
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

            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                return BadRequest(new { error = "Login failed", detail = err });
            }

            var json = await response.Content.ReadAsStringAsync();
            var tokenData = System.Text.Json.JsonDocument.Parse(json).RootElement;

            return Ok(new LoginResponseDto
            {
                AccessToken = tokenData.GetProperty("access_token").GetString()!,
                RefreshToken = tokenData.GetProperty("refresh_token").GetString()!,
                ExpiresIn = tokenData.GetProperty("expires_in").GetInt32(),
                TokenType = "Bearer"
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
            return System.Text.Json.JsonDocument.Parse(json)
                .RootElement.GetProperty("access_token").GetString();
        }
    }
}
