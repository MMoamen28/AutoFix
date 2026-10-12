using AutoFix.Models.Common;
using System;

namespace AutoFix.Models
{
    public class FormDraft : ISoftDeletable
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string FormKey { get; set; } = string.Empty;
        public string FormDataJson { get; set; } = "{}";
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
