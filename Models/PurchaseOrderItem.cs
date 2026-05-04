namespace AutoFix.Models
{
    public class PurchaseOrderItem
    {
        public int Id { get; set; }
        public int PurchaseOrderId { get; set; }

        public string ItemType { get; set; } = string.Empty;
        // "Service" or "SparePart"

        public int ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string ItemDescription { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; }
        public decimal Subtotal { get; set; }
        // UnitPrice * Quantity

        // Navigation
        public PurchaseOrder PurchaseOrder { get; set; } = null!;
    }
}
