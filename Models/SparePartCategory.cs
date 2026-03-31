using System.Collections.Generic;

namespace AutoFix.Models
{
    public class SparePartCategory
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public ICollection<SparePart> SpareParts { get; set; } = new List<SparePart>();
    }
}
