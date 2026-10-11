using AutoFix.Models.Common;
using System;

namespace AutoFix.Models
{
    public class AppUser : ISoftDeletable
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        
        // Roles: Admin, Reception, Technician (Mechanic), Accountant, Customer
        public string Role { get; set; } = "Customer";
        
        // Condition 2: Block app until default admin changes password
        public bool MustChangePassword { get; set; } = false;
        
        // 5-attempt / 15-minute lockout
        public int FailedLoginAttempts { get; set; } = 0;
        public DateTime? LockoutEnd { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLoginAt { get; set; }

        // Optional link to Customer profile if role is Customer
        public int? CustomerId { get; set; }
        public Customer? Customer { get; set; }

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
