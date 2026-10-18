using System;

namespace AutoFix.Exceptions
{
    public class ValidationWarningException : InvalidOperationException
    {
        public string Code { get; }
        public bool RequiresConfirmation { get; } = true;
        public int? ExistingRecordId { get; }
        public string? ExistingRecordName { get; }

        public ValidationWarningException(string code, string arabicMessage, int? existingRecordId = null, string? existingRecordName = null)
            : base(arabicMessage)
        {
            Code = code;
            ExistingRecordId = existingRecordId;
            ExistingRecordName = existingRecordName;
        }
    }
}
