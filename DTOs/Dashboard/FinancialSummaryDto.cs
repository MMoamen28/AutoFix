using System.Collections.Generic;

namespace AutoFix.DTOs.Dashboard
{
    public class FinancialSummaryDto
    {
        public string Period { get; set; } = "month";
        public decimal TotalRevenue { get; set; }
        public decimal TotalExpenses { get; set; }
        public decimal NetProfit { get; set; }
        public decimal RevenueChangePercentage { get; set; }
        public decimal ExpenseChangePercentage { get; set; }
        public decimal ProfitChangePercentage { get; set; }
        public List<decimal> RevenueTrend { get; set; } = new();
    }
}
