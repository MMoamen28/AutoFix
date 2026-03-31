namespace AutoFix.Models
{
    public class RepairOrderServiceJoin
    {
        public int RepairOrderId { get; set; }
        public int ServiceId { get; set; }
        public int Quantity { get; set; } = 1;
        public decimal PriceAtTime { get; set; }

        public RepairOrder RepairOrder { get; set; } = null!;
        public Service Service { get; set; } = null!;
    }
}
