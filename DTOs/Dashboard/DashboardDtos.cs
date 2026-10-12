using AutoFix.DTOs.WorkOrder;
using System;
using System.Collections.Generic;

namespace AutoFix.DTOs.Dashboard
{
    public class AdminDashboardDto
    {
        public int TotalActiveWorkOrders { get; set; }
        public int PendingOrdersCount { get; set; }
        public int InProgressOrdersCount { get; set; }
        public int CompletedOrdersCount { get; set; }
        public int DeliveredOrdersCount { get; set; }

        public decimal TodayRevenue { get; set; }
        public decimal MonthRevenue { get; set; }
        public decimal OutstandingReceivables { get; set; }

        public int TotalCustomers { get; set; }
        public int TotalCars { get; set; }
        public int LowStockPartsCount { get; set; }
        public int TotalInspectionsCount { get; set; }

        public List<WorkOrderResponseDto> RecentWorkOrders { get; set; } = new();
        public List<RecentInspectionSummaryDto> RecentInspections { get; set; } = new();
    }

    public class CustomerDashboardDto
    {
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        public List<CustomerCarSummaryDto> MyCars { get; set; } = new();
        public List<WorkOrderResponseDto> ActiveOrders { get; set; } = new();
        public List<WorkOrderResponseDto> OrderHistory { get; set; } = new();
        public List<CustomerInvoiceSummaryDto> Invoices { get; set; } = new();
        public List<CustomerInspectionSummaryDto> FinalizedInspections { get; set; } = new();
    }

    public class CustomerCarSummaryDto
    {
        public int Id { get; set; }
        public string Make { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int Year { get; set; }
        public string LicensePlate { get; set; } = string.Empty;
        public string VIN { get; set; } = string.Empty;
        public int CurrentOdometerKm { get; set; }
        public string? Color { get; set; }
    }

    public class CustomerInvoiceSummaryDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime IssuedAt { get; set; }
    }

    public class CustomerInspectionSummaryDto
    {
        public int Id { get; set; }
        public string ReportNumber { get; set; } = string.Empty;
        public string CarPlate { get; set; } = string.Empty;
        public string CarMakeModel { get; set; } = string.Empty;
        public decimal OverallScore { get; set; }
        public string GeneralVerdict { get; set; } = string.Empty;
        public DateTime InspectedAt { get; set; }
        public string Status { get; set; } = "Final";
        public int RevisionNumber { get; set; }
    }

    public class RecentInspectionSummaryDto
    {
        public int Id { get; set; }
        public string ReportNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CarPlate { get; set; } = string.Empty;
        public string CarMakeModel { get; set; } = string.Empty;
        public decimal OverallScore { get; set; }
        public string GeneralVerdict { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime InspectedAt { get; set; }
    }
}
