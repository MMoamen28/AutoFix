namespace AutoFix.DTOs.Service
{
    public class ServiceResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string NameArabic { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = "Mechanical";
        public decimal BasePrice { get; set; }
        public decimal DefaultCost { get; set; } = 0;
        public int EstimatedMinutes { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; } = false;
    }
}
