namespace AutoFix.DTOs.MechanicProfile
{
    public class MechanicProfileResponseDto
    {
        public int Id { get; set; }
        public string Specialization { get; set; } = string.Empty;
        public int YearsOfExperience { get; set; }
        public string CertificationNumber { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
    }
}
