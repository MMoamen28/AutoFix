namespace AutoFix.DTOs.Mechanic
{
    public class MechanicResponseDto
    {
        public int Id { get; set; }
        public string FullName => $"{FirstName} {LastName}".Trim();
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Notes { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; } = false;
        public string Email { get; set; } = string.Empty;
        public string KeycloakUserId { get; set; } = string.Empty;
        public DateTime HiredAt { get; set; }
        public AutoFix.DTOs.MechanicProfile.MechanicProfileResponseDto? Profile { get; set; }
    }
}
