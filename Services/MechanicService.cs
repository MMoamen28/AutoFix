using AutoFix.Data;
using AutoFix.DTOs.Mechanic;
using AutoFix.DTOs.MechanicProfile;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class MechanicService : IMechanicService
    {
        private readonly AppDbContext _db;
        private readonly IHttpClientFactory? _httpClientFactory;
        private readonly Microsoft.Extensions.Configuration.IConfiguration? _config;

        public MechanicService(
            AppDbContext db, 
            IHttpClientFactory? httpClientFactory = null,
            Microsoft.Extensions.Configuration.IConfiguration? config = null)
        {
            _db = db;
            _httpClientFactory = httpClientFactory;
            _config = config;
        }

        public async Task<List<MechanicResponseDto>> GetAllAsync(bool includeArchived = false)
        {
            var query = _db.Mechanics.AsNoTracking();
            if (includeArchived)
            {
                query = query.IgnoreQueryFilters();
            }
            else
            {
                query = query.Where(m => !m.IsDeleted && m.IsActive);
            }

            return await query
                .OrderBy(m => m.FirstName)
                .ThenBy(m => m.LastName)
                .Select(m => new MechanicResponseDto
                {
                    Id = m.Id,
                    FirstName = m.FirstName,
                    LastName = m.LastName,
                    Phone = m.Phone,
                    Notes = m.Notes,
                    IsActive = m.IsActive && !m.IsDeleted,
                    IsDeleted = m.IsDeleted,
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
                    Phone = m.Phone,
                    Notes = m.Notes,
                    IsActive = m.IsActive && !m.IsDeleted,
                    IsDeleted = m.IsDeleted,
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
            // Mechanics are staff worker records only — no user login account created
            var (firstName, lastName) = ParseName(dto.FullName, dto.FirstName, dto.LastName);

            var mechanic = new Mechanic
            {
                FirstName = firstName,
                LastName = lastName,
                Phone = dto.Phone?.Trim(),
                Notes = dto.Notes?.Trim(),
                IsActive = dto.IsActive,
                Email = dto.Email?.Trim() ?? string.Empty,
                KeycloakUserId = string.Empty,
                HiredAt = DateTime.UtcNow
            };

            _db.Mechanics.Add(mechanic);
            await _db.SaveChangesAsync();

            return (await GetByIdAsync(mechanic.Id))!;
        }

        public async Task<MechanicResponseDto?> UpdateAsync(int id, UpdateMechanicDto dto)
        {
            var mechanic = await _db.Mechanics.FindAsync(id);
            if (mechanic == null) return null;

            var (firstName, lastName) = ParseName(dto.FullName, dto.FirstName, dto.LastName);
            mechanic.FirstName = firstName;
            mechanic.LastName = lastName;
            mechanic.Phone = dto.Phone?.Trim();
            mechanic.Notes = dto.Notes?.Trim();
            mechanic.IsActive = dto.IsActive;
            if (dto.Email != null) mechanic.Email = dto.Email.Trim();

            await _db.SaveChangesAsync();

            return await GetByIdAsync(mechanic.Id);
        }

        public async Task<bool> ArchiveAsync(int id)
        {
            var mechanic = await _db.Mechanics.FindAsync(id);
            if (mechanic == null) return false;

            mechanic.IsDeleted = true;
            mechanic.IsActive = false;
            mechanic.DeletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RestoreAsync(int id)
        {
            var mechanic = await _db.Mechanics.IgnoreQueryFilters().FirstOrDefaultAsync(m => m.Id == id);
            if (mechanic == null) return false;

            mechanic.IsDeleted = false;
            mechanic.IsActive = true;
            mechanic.DeletedAt = null;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            // Soft delete only to protect history
            return await ArchiveAsync(id);
        }

        public async Task<MechanicWorkHistoryDto?> GetWorkHistoryAsync(int id, DateTime? from = null, DateTime? to = null)
        {
            var mechanic = await _db.Mechanics.IgnoreQueryFilters().FirstOrDefaultAsync(m => m.Id == id);
            if (mechanic == null) return null;

            var query = _db.WorkOrders
                .AsNoTracking()
                .Include(w => w.Car)
                .Where(w => w.AssignedTechnicianId == id || w.HelperTechnicianId == id);

            if (from.HasValue)
            {
                query = query.Where(w => w.ReceivedAt >= from.Value);
            }
            if (to.HasValue)
            {
                query = query.Where(w => w.ReceivedAt <= to.Value);
            }

            var orders = await query
                .OrderByDescending(w => w.ReceivedAt)
                .ToListAsync();

            var items = orders.Select(w => new MechanicWorkHistoryItemDto
            {
                WorkOrderId = w.Id,
                OrderNumber = w.OrderNumber,
                Date = w.ReceivedAt,
                CarPlate = w.Car?.LicensePlate ?? string.Empty,
                CarDescription = $"{w.Car?.Make} {w.Car?.Model} ({w.Car?.Year})".Trim(),
                Role = w.AssignedTechnicianId == id ? "Main" : "Helper",
                Status = w.Status.ToString(),
                TotalAmount = w.TotalAmount
            }).ToList();

            return new MechanicWorkHistoryDto
            {
                MechanicId = mechanic.Id,
                MechanicName = $"{mechanic.FirstName} {mechanic.LastName}".Trim(),
                Phone = mechanic.Phone,
                IsActive = mechanic.IsActive && !mechanic.IsDeleted,
                TotalOrdersWorked = items.Count,
                WorkOrders = items
            };
        }

        private static (string firstName, string lastName) ParseName(string? fullName, string firstName, string lastName)
        {
            if (!string.IsNullOrWhiteSpace(fullName))
            {
                var parts = fullName.Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                return (parts[0], parts.Length > 1 ? parts[1] : string.Empty);
            }
            return (firstName?.Trim() ?? string.Empty, lastName?.Trim() ?? string.Empty);
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
    }
}
