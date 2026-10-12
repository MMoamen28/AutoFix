using AutoFix.Models.Common;
using System;

namespace AutoFix.Models
{
    public class TechnicianCommissionConfig : ISoftDeletable
    {
        public int Id { get; set; }
        public int MechanicId { get; set; }
        public Mechanic Mechanic { get; set; } = null!;

        public decimal MonthlyBaseSalary { get; set; } = 0;
        
        // CommissionType: PercentLaborRevenue, PercentLaborProfit, FixedPerWorkOrder, PerLaborType
        public string CommissionType { get; set; } = "PercentLaborRevenue";
        public decimal Rate { get; set; } = 10; // e.g. 10% or 100 EGP per order
        public string? LaborTypeRatesJson { get; set; } // JSON dictionary e.g. {"LaborMechanical": 10, "LaborElectrical": 15}
        
        public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }

    public class WorkOrderCommission : ISoftDeletable
    {
        public int Id { get; set; }
        public int WorkOrderId { get; set; }
        public WorkOrder WorkOrder { get; set; } = null!;
        public int MechanicId { get; set; }
        public Mechanic Mechanic { get; set; } = null!;

        // Snapshot values at the time of work order completion
        public decimal LaborRevenueSnapshot { get; set; }
        public decimal LaborCostSnapshot { get; set; }
        public decimal CommissionRateSnapshot { get; set; }
        public string CommissionTypeSnapshot { get; set; } = "PercentLaborRevenue";
        
        public decimal CommissionAmount { get; set; }
        public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;

        // Cancellation / Reversal
        public bool IsReversed { get; set; } = false;
        public DateTime? ReversedAt { get; set; }
        public string? ReversalReason { get; set; }

        // Payout linking to prevent double counting in P&L
        public int? PaidInExpenseId { get; set; }
        public Expense? PaidInExpense { get; set; }
        public DateTime? PaidAt { get; set; }

        // Soft delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
