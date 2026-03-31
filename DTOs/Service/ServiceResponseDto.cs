namespace AutoFix.DTOs.Service
{
    public class ServiceResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal BasePrice { get; set; }
        public int EstimatedMinutes { get; set; }
    }
}
