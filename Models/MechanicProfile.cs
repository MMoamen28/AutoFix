namespace AutoFix.Models
{
    public class MechanicProfile
    {
        public int Id { get; set; }
        public int MechanicId { get; set; }
        public string Specialization { get; set; } = string.Empty;
        public int YearsOfExperience { get; set; }
        public string CertificationNumber { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;

        // Navigation
        public Mechanic Mechanic { get; set; } = null!;
    }
}
