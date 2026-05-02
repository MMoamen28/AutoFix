using AutoFix.Data;
using AutoFix.DTOs.Mechanic;
using AutoFix.DTOs.MechanicProfile;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class MechanicService : IMechanicService
    {
        private readonly AppDbContext _db;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _config;

        public MechanicService(
            AppDbContext db, 
            IHttpClientFactory httpClientFactory,
            Microsoft.Extensions.Configuration.IConfiguration config)
        {
            _db = db;
            _httpClientFactory = httpClientFactory;
            _config = config;
        }

        public async Task<List<MechanicResponseDto>> GetAllAsync()
        {
            return await _db.Mechanics
                .AsNoTracking()
                .Select(m => new MechanicResponseDto
                {
                    Id = m.Id,
                    FirstName = m.FirstName,
                    LastName = m.LastName,
                    Email = m.Email,
                    KeycloakUserId = m.KeycloakUserId,
                    HiredAt = m.HiredAt,
                    Profile = m.Profile != null ? new MechanicProfileResponseDto
                    {
                        Id = m.Profile.Id,
                        Specialization = m.Profile.Specialization,
                        YearsOfExperience = m.Profile.YearsOfExperience,
                        CertificationNumber = m.Profile.CertificationNumber,
                        Bio = m.Profile.Bio
                    } : null
                })
                .ToListAsync();
        }

        public async Task<MechanicResponseDto?> GetByIdAsync(int id)
        {
            return await _db.Mechanics
                .AsNoTracking()
                .Where(m => m.Id == id)
                .Select(m => new MechanicResponseDto
                {
                    Id = m.Id,
                    FirstName = m.FirstName,
                    LastName = m.LastName,
                    Email = m.Email,
                    KeycloakUserId = m.KeycloakUserId,
                    HiredAt = m.HiredAt,
                    Profile = m.Profile != null ? new MechanicProfileResponseDto
                    {
                        Id = m.Profile.Id,
                        Specialization = m.Profile.Specialization,
                        YearsOfExperience = m.Profile.YearsOfExperience,
                        CertificationNumber = m.Profile.CertificationNumber,
                        Bio = m.Profile.Bio
                    } : null
                })
                .FirstOrDefaultAsync();
        }

        public async Task<MechanicResponseDto> CreateAsync(CreateMechanicDto dto)
        {
            var adminToken = await GetKeycloakAdminTokenAsync();
            if (adminToken == null) throw new Exception("Could not connect to Keycloak");

            var httpClient = _httpClientFactory.CreateClient();
            var keycloakBase = _config["Keycloak:AdminBaseUrl"];

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

            var createRequest = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Post, $"{keycloakBase}/users");
            createRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
            createRequest.Content = new System.Net.Http.StringContent(
                System.Text.Json.JsonSerializer.Serialize(createUserPayload),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            var createResponse = await httpClient.SendAsync(createRequest);

            if (!createResponse.IsSuccessStatusCode)
            {
                var err = await createResponse.Content.ReadAsStringAsync();
                throw new Exception($"Registration failed: {err}");
            }

            // Step 2 — Get the new user's Keycloak ID
            var location = createResponse.Headers.Location?.ToString();
            var keycloakUserId = location?.Split('/').Last();
            if (string.IsNullOrEmpty(keycloakUserId)) throw new Exception("Could not retrieve new user ID from Keycloak");

            // Step 3 — Get the Mechanic role ID
            var rolesRequest = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Get, $"{keycloakBase}/roles");
            rolesRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
            var rolesResponse = await httpClient.SendAsync(rolesRequest);
            var rolesJson = await rolesResponse.Content.ReadAsStringAsync();
            var roles = System.Text.Json.JsonDocument.Parse(rolesJson).RootElement;
            var mechanicRole = roles.EnumerateArray()
                .FirstOrDefault(r => r.GetProperty("name").GetString() == "Mechanic");
            var mechanicRoleId = mechanicRole.GetProperty("id").GetString();
            var mechanicRoleName = mechanicRole.GetProperty("name").GetString();

            // Step 4 — Assign Mechanic role
            var assignRolePayload = new[] { new { id = mechanicRoleId, name = mechanicRoleName } };
            var assignRequest = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Post, $"{keycloakBase}/users/{keycloakUserId}/role-mappings/realm");
            assignRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
            assignRequest.Content = new System.Net.Http.StringContent(
                System.Text.Json.JsonSerializer.Serialize(assignRolePayload),
                System.Text.Encoding.UTF8,
                "application/json"
            );
            await httpClient.SendAsync(assignRequest);

            // Step 5 — Create Mechanic in DB
            var mechanic = new Mechanic
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                KeycloakUserId = keycloakUserId
            };

            _db.Mechanics.Add(mechanic);
            await _db.SaveChangesAsync();

            return new MechanicResponseDto
            {
                Id = mechanic.Id,
                FirstName = mechanic.FirstName,
                LastName = mechanic.LastName,
                Email = mechanic.Email,
                KeycloakUserId = mechanic.KeycloakUserId,
                HiredAt = mechanic.HiredAt
            };
        }

        private async Task<string?> GetKeycloakAdminTokenAsync()
        {
            var httpClient = _httpClientFactory.CreateClient();
            var response = await httpClient.PostAsync(
                $"{_config["Keycloak:AuthServerUrl"]}/realms/master/protocol/openid-connect/token",
                new System.Net.Http.FormUrlEncodedContent(new Dictionary<string, string>
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

        public async Task<MechanicResponseDto?> UpdateAsync(int id, UpdateMechanicDto dto)
        {
            var mechanic = await _db.Mechanics.FindAsync(id);
            if (mechanic == null) return null;

            mechanic.FirstName = dto.FirstName;
            mechanic.LastName = dto.LastName;
            mechanic.Email = dto.Email;

            await _db.SaveChangesAsync();

            return await GetByIdAsync(mechanic.Id);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var mechanic = await _db.Mechanics.FindAsync(id);
            if (mechanic == null) return false;

            _db.Mechanics.Remove(mechanic);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
