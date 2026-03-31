namespace AutoFix.DTOs.SparePartCategory
{
    public class SparePartCategoryResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int TotalParts { get; set; }
        public int ActiveParts { get; set; }
    }
}
