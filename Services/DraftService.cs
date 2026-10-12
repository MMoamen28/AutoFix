using AutoFix.Data;
using AutoFix.DTOs.Draft;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class DraftService : IDraftService
    {
        private readonly AppDbContext _db;

        public DraftService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<FormDraftDto?> GetDraftAsync(string userId, string formKey)
        {
            var draft = await _db.FormDrafts
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.UserId == userId && d.FormKey == formKey && !d.IsDeleted);

            if (draft == null) return null;

            return new FormDraftDto
            {
                FormKey = draft.FormKey,
                FormDataJson = draft.FormDataJson,
                UpdatedAt = draft.UpdatedAt
            };
        }

        public async Task<FormDraftDto> SaveDraftAsync(string userId, string formKey, string formDataJson)
        {
            var draft = await _db.FormDrafts
                .FirstOrDefaultAsync(d => d.UserId == userId && d.FormKey == formKey);

            if (draft != null)
            {
                draft.FormDataJson = formDataJson;
                draft.UpdatedAt = DateTime.UtcNow;
                draft.IsDeleted = false;
                draft.DeletedAt = null;
            }
            else
            {
                draft = new FormDraft
                {
                    UserId = userId,
                    FormKey = formKey,
                    FormDataJson = formDataJson,
                    UpdatedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };
                _db.FormDrafts.Add(draft);
            }

            await _db.SaveChangesAsync();

            return new FormDraftDto
            {
                FormKey = draft.FormKey,
                FormDataJson = draft.FormDataJson,
                UpdatedAt = draft.UpdatedAt
            };
        }

        public async Task<bool> DeleteDraftAsync(string userId, string formKey)
        {
            var draft = await _db.FormDrafts
                .FirstOrDefaultAsync(d => d.UserId == userId && d.FormKey == formKey);

            if (draft == null) return false;

            _db.FormDrafts.Remove(draft);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
