namespace AutoFix.Models
{
    public class ServiceSparePartJoin
    {
        public int ServiceId { get; set; }
        public int SparePartId { get; set; }
        public int DefaultQuantity { get; set; } = 1;

        public Service Service { get; set; } = null!;
        public SparePart SparePart { get; set; } = null!;
    }
}
