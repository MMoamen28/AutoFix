using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace AutoFix.DTOs.Invoice
{
    public class CreateInvoiceDto
    {
        public int? WorkOrderId { get; set; }

        [Required]
        public int CustomerId { get; set; }

        [Required]
        public int CarId { get; set; }

        public decimal DiscountAmount { get; set; } = 0;
        public decimal VatPercentage { get; set; } = 14.0m; // Default Egyptian VAT 14%
        public string? Notes { get; set; }
    }

    public class RecordPaymentDto
    {
        public int? InvoiceId { get; set; }

        [Required]
        [Range(0.01, 10000000, ErrorMessage = "Payment amount must be greater than zero.")]
        public decimal Amount { get; set; }

        [Required]
        public string PaymentMethod { get; set; } = "Cash";

        public string? ReferenceNumber { get; set; }
        public string? Notes { get; set; }
    }

    public class InvoiceResponseDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public int? WorkOrderId { get; set; }
        public string? WorkOrderNumber { get; set; }

        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;

        public int CarId { get; set; }
        public string CarPlate { get; set; } = string.Empty;
        public string CarMakeModel { get; set; } = string.Empty;

        public decimal Subtotal { get; set; }
        public decimal TotalWorkmanship { get; set; }
        public decimal TotalLabor { get; set; }
        public decimal TotalParts { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal VatPercentage { get; set; }
        public decimal VatAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }

        public string Status { get; set; } = "Issued";
        public string Currency { get; set; } = "EGP";
        public DateTime IssuedAt { get; set; }
        public DateTime? DueDate { get; set; }
        public string Notes { get; set; } = string.Empty;

        public string SnapshotDetailsJson { get; set; } = "[]";
        public string ConcurrencyToken { get; set; } = string.Empty;
        public List<PaymentResponseDto> Payments { get; set; } = new();
        public List<InvoiceIdHistoryResponseDto> IdHistories { get; set; } = new();
    }

    public class UpdateInvoiceNumberDto
    {
        [Required(ErrorMessage = "New invoice ID is required.")]
        public string NewInvoiceNumber { get; set; } = string.Empty;

        public string? Reason { get; set; }
        public string? ConcurrencyToken { get; set; }
    }

    public class UpdateInvoiceDateDto
    {
        [Required(ErrorMessage = "New issue date is required.")]
        public DateTime NewIssuedAt { get; set; }

        public string? Reason { get; set; }
        public string? ConcurrencyToken { get; set; }
    }

    public class InvoiceIdHistoryResponseDto
    {
        public int Id { get; set; }
        public int InvoiceId { get; set; }
        public string OldInvoiceNumber { get; set; } = string.Empty;
        public string NewInvoiceNumber { get; set; } = string.Empty;
        public string ChangedBy { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public DateTime ChangedAt { get; set; }
    }

    public class PaymentResponseDto
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string? ReferenceNumber { get; set; }
        public DateTime PaidAt { get; set; }
        public string? ReceivedBy { get; set; }
        public string? Notes { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public decimal RemainingBalance => RemainingAmount;
    }

    public class CreditInvoiceRequestDto
    {
        [Required(ErrorMessage = "Reason for credit note is required.")]
        public string Reason { get; set; } = string.Empty;
    }

    public class CreateCreditNoteDto
    {
        [Required]
        public int InvoiceId { get; set; }

        [Required(ErrorMessage = "Reason for credit note is required.")]
        public string Reason { get; set; } = string.Empty;
    }

    public class CreditNoteResponseDto
    {
        public int Id { get; set; }
        public string CreditNoteNumber { get; set; } = string.Empty;
        public int InvoiceId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public int? WorkOrderId { get; set; }
        public string? WorkOrderNumber { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string CarPlate { get; set; } = string.Empty;
        public string CarMakeModel { get; set; } = string.Empty;
        public decimal InvoiceTotal { get; set; }
        public decimal AmountRefunded { get; set; }
        public bool StockRestored { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string IssuedBy { get; set; } = string.Empty;
        public DateTime IssuedAt { get; set; }
        public string Notes { get; set; } = string.Empty;
    }
}


