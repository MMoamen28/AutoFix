using System;

namespace AutoFix.DTOs.Draft
{
    public class FormDraftDto
    {
        public string FormKey { get; set; } = string.Empty;
        public string FormDataJson { get; set; } = "{}";
        public DateTime UpdatedAt { get; set; }
    }

    public class SaveFormDraftDto
    {
        public string FormDataJson { get; set; } = "{}";
    }
}
