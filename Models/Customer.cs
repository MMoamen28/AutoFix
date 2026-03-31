using System.Collections.Generic;

namespace AutoFix.Models
{
    public class Customer
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string KeycloakUserId { get; set; } = string.Empty;  // sub claim from JWT
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<Car> Cars { get; set; } = new List<Car>();
        public ICollection<RepairOrder> RepairOrders { get; set; } = new List<RepairOrder>();
    }
}
