using System;

namespace AutoFix.DTOs.Expense
{
    public class ExpenseItemDto
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public string Category { get; set; } = "أخرى";
        public string Description { get; set; } = string.Empty;
        public string? ReferenceNumber { get; set; }
        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
        public string? PerformedBy { get; set; }
    }

    public class CreateExpenseDto
    {
        public decimal Amount { get; set; }
        public string Category { get; set; } = "أخرى";
        public string Description { get; set; } = string.Empty;
        public string? ReferenceNumber { get; set; }
        public DateTime? TransactionDate { get; set; }
    }

    public class ExpenseListSummaryDto
    {
        public decimal TotalAmount { get; set; }
        public System.Collections.Generic.Dictionary<string, decimal> TotalsByCategory { get; set; } = new();
        public System.Collections.Generic.List<ExpenseItemDto> Items { get; set; } = new();
    }
}
