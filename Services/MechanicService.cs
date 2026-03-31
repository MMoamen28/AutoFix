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
        public MechanicService(AppDbContext db) => _db = db;

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
            var mechanic = new Mechanic
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                KeycloakUserId = dto.KeycloakUserId
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
