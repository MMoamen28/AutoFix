using System.Collections.Generic;

namespace AutoFix.Models
{
    public class Mechanic
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string KeycloakUserId { get; set; } = string.Empty;
        public DateTime HiredAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public MechanicProfile? Profile { get; set; }
        public ICollection<RepairOrder> RepairOrders { get; set; } = new List<RepairOrder>();
    }
}
