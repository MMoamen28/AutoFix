using AutoFix.DTOs.Car;
using System;
using System.Collections.Generic;

namespace AutoFix.DTOs.Customer
{
    public class CustomerResponseDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string? ExtraPhone { get; set; }
        public string? Address { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public List<CarResponseDto> Cars { get; set; } = new();
    }
}
