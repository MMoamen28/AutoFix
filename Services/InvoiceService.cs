using AutoFix.Data;
using AutoFix.DTOs.Invoice;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class InvoiceService : IInvoiceService
    {
        private readonly AppDbContext _db;

        public InvoiceService(AppDbContext db)
        {
            _db = db;
        }

        private IQueryable<Invoice> BaseQuery()
        {
            return _db.Invoices
                .Include(i => i.Customer)
                .Include(i => i.Car)
                .Include(i => i.WorkOrder)
                .Include(i => i.Payments);
        }

        private static InvoiceResponseDto MapToDto(Invoice i)
        {
            return new InvoiceResponseDto
            {
                Id = i.Id,
                InvoiceNumber = i.InvoiceNumber,
                WorkOrderId = i.WorkOrderId,
                WorkOrderNumber = i.WorkOrder?.OrderNumber,
                CustomerId = i.CustomerId,
                CustomerName = i.Customer?.FullName ?? string.Empty,
                CustomerPhone = i.Customer?.Phone ?? string.Empty,
                CarId = i.CarId,
                CarPlate = i.Car?.LicensePlate ?? string.Empty,
                CarMakeModel = i.Car != null ? $"{i.Car.Make} {i.Car.Model}" : string.Empty,
                Subtotal = i.Subtotal,
                DiscountAmount = i.DiscountAmount,
                VatPercentage = i.VatPercentage,
                VatAmount = i.VatAmount,
                TotalAmount = i.TotalAmount,
                PaidAmount = i.PaidAmount,
                RemainingAmount = i.RemainingAmount,
                Status = i.Status,
                Currency = i.Currency,
                IssuedAt = i.IssuedAt,
                DueDate = i.DueDate,
                Notes = i.Notes,
                SnapshotDetailsJson = i.SnapshotDetailsJson,
                Payments = i.Payments.Where(p => !p.IsDeleted).OrderByDescending(p => p.PaidAt).Select(p => new PaymentResponseDto
                {
                    Id = p.Id,
                    Amount = p.Amount,
                    PaymentMethod = p.PaymentMethod,
                    ReferenceNumber = p.ReferenceNumber,
                    PaidAt = p.PaidAt,
                    ReceivedBy = p.ReceivedByUserId,
                    Notes = p.Notes
                }).ToList()
            };
        }

        public async Task<List<InvoiceResponseDto>> GetAllAsync(int? customerId = null)
        {
            var query = BaseQuery().AsNoTracking();

            if (customerId.HasValue && customerId.Value > 0)
            {
                query = query.Where(i => i.CustomerId == customerId.Value);
            }

            var list = await query.OrderByDescending(i => i.IssuedAt).ToListAsync();
            return list.Select(MapToDto).ToList();
        }

        public async Task<InvoiceResponseDto?> GetByIdAsync(int id)
        {
            var invoice = await BaseQuery().AsNoTracking().FirstOrDefaultAsync(i => i.Id == id);
            return invoice == null ? null : MapToDto(invoice);
        }

        public async Task<InvoiceResponseDto> CreateAsync(CreateInvoiceDto dto)
        {
            var customer = await _db.Customers.FindAsync(dto.CustomerId);
            if (customer == null) throw new InvalidOperationException($"Customer {dto.CustomerId} not found.");

            var car = await _db.Cars.FindAsync(dto.CarId);
            if (car == null) throw new InvalidOperationException($"Car {dto.CarId} not found.");

            decimal subtotal = 0;
            if (dto.WorkOrderId.HasValue)
            {
                var wo = await _db.WorkOrders.FindAsync(dto.WorkOrderId.Value);
                if (wo != null) subtotal = wo.TotalAmount;
            }

            var afterDiscount = Math.Max(0, subtotal - dto.DiscountAmount);
            var vatAmount = Math.Round(afterDiscount * (dto.VatPercentage / 100m), 2);
            var totalAmount = afterDiscount + vatAmount;

            var nextNum = $"INV-{DateTime.UtcNow:yyyyMM}-{(await _db.Invoices.CountAsync() + 1):D4}";

            var invoice = new Invoice
            {
                InvoiceNumber = nextNum,
                WorkOrderId = dto.WorkOrderId,
                CustomerId = dto.CustomerId,
                CarId = dto.CarId,
                Subtotal = subtotal,
                DiscountAmount = dto.DiscountAmount,
                VatPercentage = dto.VatPercentage,
                VatAmount = vatAmount,
                TotalAmount = totalAmount,
                PaidAmount = 0,
                Status = "Issued",
                Currency = "EGP",
                IssuedAt = DateTime.UtcNow,
                Notes = dto.Notes ?? string.Empty
            };

            _db.Invoices.Add(invoice);

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "CreateInvoice",
                EntityName = "Invoice",
                EntityId = nextNum,
                Details = $"Manual invoice {nextNum} created for Customer {customer.FullName}. Total: {totalAmount:F2} EGP.",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            return (await GetByIdAsync(invoice.Id))!;
        }

        public async Task<PaymentResponseDto> RecordPaymentAsync(int invoiceId, RecordPaymentDto dto, string? receivedBy = null)
        {
            var invoice = await _db.Invoices.Include(i => i.Payments).FirstOrDefaultAsync(i => i.Id == invoiceId);
            if (invoice == null) throw new KeyNotFoundException($"Invoice {invoiceId} not found.");

            if (dto.Amount > invoice.RemainingAmount)
            {
                throw new InvalidOperationException($"Payment amount ({dto.Amount:F2}) cannot exceed remaining invoice balance ({invoice.RemainingAmount:F2}).");
            }

            var payment = new InvoicePayment
            {
                InvoiceId = invoiceId,
                Amount = dto.Amount,
                PaymentMethod = dto.PaymentMethod,
                ReferenceNumber = dto.ReferenceNumber,
                PaidAt = DateTime.UtcNow,
                ReceivedByUserId = receivedBy ?? "Admin",
                Notes = dto.Notes
            };

            invoice.Payments.Add(payment);
            invoice.PaidAmount += dto.Amount;

            if (invoice.RemainingAmount <= 0)
            {
                invoice.Status = "Paid";
            }
            else
            {
                invoice.Status = "PartiallyPaid";
            }

            _db.AuditLogs.Add(new AuditLog
            {
                Action = "RecordInvoicePayment",
                EntityName = "InvoicePayment",
                EntityId = invoice.InvoiceNumber,
                Details = $"Recorded payment of {dto.Amount:F2} EGP ({dto.PaymentMethod}) on Invoice {invoice.InvoiceNumber}.",
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            return new PaymentResponseDto
            {
                Id = payment.Id,
                Amount = payment.Amount,
                PaymentMethod = payment.PaymentMethod,
                ReferenceNumber = payment.ReferenceNumber,
                PaidAt = payment.PaidAt,
                ReceivedBy = payment.ReceivedByUserId,
                Notes = payment.Notes,
                TotalAmount = invoice.TotalAmount,
                PaidAmount = invoice.PaidAmount,
                RemainingAmount = invoice.RemainingAmount
            };
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var invoice = await _db.Invoices.Include(i => i.Payments).FirstOrDefaultAsync(i => i.Id == id);
            if (invoice == null) return false;

            if (invoice.PaidAmount > 0)
            {
                throw new InvalidOperationException("Cannot delete an invoice that has recorded payments.");
            }

            _db.Invoices.Remove(invoice);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
