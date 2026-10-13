using AutoFix.Models;
using AutoFix.Models.Common;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Http;

namespace AutoFix.Data
{
    public class AppDbContext : DbContext
    {
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor? httpContextAccessor = null) : base(options)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        // Core original entities
        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<Mechanic> Mechanics => Set<Mechanic>();
        public DbSet<MechanicProfile> MechanicProfiles => Set<MechanicProfile>();
        public DbSet<Car> Cars => Set<Car>();
        public DbSet<RepairOrder> RepairOrders => Set<RepairOrder>();
        public DbSet<Service> Services => Set<Service>();
        public DbSet<SparePart> SpareParts => Set<SparePart>();
        public DbSet<RepairOrderServiceJoin> RepairOrderServices => Set<RepairOrderServiceJoin>();
        public DbSet<ServiceSparePartJoin> ServiceSpareParts => Set<ServiceSparePartJoin>();
        public DbSet<Receipt> Receipts => Set<Receipt>();
        public DbSet<CartItem> CartItems => Set<CartItem>();

        // Stage A additions: Auth & Audit
        public DbSet<AppUser> AppUsers => Set<AppUser>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

        // Stage B-E forward-compatible entities
        public DbSet<WorkOrder> WorkOrders => Set<WorkOrder>();
        public DbSet<WorkOrderLine> WorkOrderLines => Set<WorkOrderLine>();
        public DbSet<WorkOrderPhoto> WorkOrderPhotos => Set<WorkOrderPhoto>();
        public DbSet<Invoice> Invoices => Set<Invoice>();
        public DbSet<InvoicePayment> InvoicePayments => Set<InvoicePayment>();
        public DbSet<Warehouse> Warehouses => Set<Warehouse>();
        public DbSet<PartMovement> PartMovements => Set<PartMovement>();
        public DbSet<Supplier> Suppliers => Set<Supplier>();
        public DbSet<TreasuryTransaction> TreasuryTransactions => Set<TreasuryTransaction>();
        public DbSet<InsuranceCompany> InsuranceCompanies => Set<InsuranceCompany>();
        public DbSet<MaintenanceReminder> MaintenanceReminders => Set<MaintenanceReminder>();
        public DbSet<EmployeeAdvance> EmployeeAdvances => Set<EmployeeAdvance>();
        public DbSet<EmployeeCustody> EmployeeCustodies => Set<EmployeeCustody>();
        public DbSet<CarInspection> CarInspections => Set<CarInspection>();
        public DbSet<CarOdometerLog> CarOdometerLogs => Set<CarOdometerLog>();
        public DbSet<WorkOrderMechanicHistory> WorkOrderMechanicHistories => Set<WorkOrderMechanicHistory>();
        public DbSet<FormDraft> FormDrafts => Set<FormDraft>();
        public DbSet<InvoiceIdHistory> InvoiceIdHistories => Set<InvoiceIdHistory>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. Unique index on PartNumber
            modelBuilder.Entity<SparePart>()
                .HasIndex(sp => sp.PartNumber)
                .IsUnique();

            // 2. One-to-one: Mechanic → MechanicProfile
            modelBuilder.Entity<Mechanic>()
                .HasOne(m => m.Profile)
                .WithOne(p => p.Mechanic)
                .HasForeignKey<MechanicProfile>(p => p.MechanicId)
                .OnDelete(DeleteBehavior.Cascade);

            // 3. One-to-many: Customer → Cars
            modelBuilder.Entity<Car>()
                .HasOne(c => c.Customer)
                .WithMany(cu => cu.Cars)
                .HasForeignKey(c => c.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CarOdometerLog>()
                .HasOne(ol => ol.Car)
                .WithMany(c => c.OdometerLogs)
                .HasForeignKey(ol => ol.CarId)
                .OnDelete(DeleteBehavior.Cascade);

            // 4. One-to-many: Customer → RepairOrders
            modelBuilder.Entity<RepairOrder>()
                .HasOne(ro => ro.Customer)
                .WithMany(c => c.RepairOrders)
                .HasForeignKey(ro => ro.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            // 5. One-to-many: Car → RepairOrders
            modelBuilder.Entity<RepairOrder>()
                .HasOne(ro => ro.Car)
                .WithMany(c => c.RepairOrders)
                .HasForeignKey(ro => ro.CarId)
                .OnDelete(DeleteBehavior.Restrict);

            // 6. One-to-many: Mechanic → RepairOrders (nullable FK)
            modelBuilder.Entity<RepairOrder>()
                .HasOne(ro => ro.Mechanic)
                .WithMany(m => m.RepairOrders)
                .HasForeignKey(ro => ro.MechanicId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<WorkOrder>()
                .HasOne(w => w.HelperTechnician)
                .WithMany()
                .HasForeignKey(w => w.HelperTechnicianId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<WorkOrderMechanicHistory>()
                .HasOne(h => h.WorkOrder)
                .WithMany(w => w.MechanicHistories)
                .HasForeignKey(h => h.WorkOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WorkOrderMechanicHistory>()
                .HasOne(h => h.PreviousMechanic)
                .WithMany()
                .HasForeignKey(h => h.PreviousMechanicId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<WorkOrderMechanicHistory>()
                .HasOne(h => h.NewMechanic)
                .WithMany()
                .HasForeignKey(h => h.NewMechanicId)
                .OnDelete(DeleteBehavior.SetNull);

            // 7. Many-to-many: RepairOrder ↔ Service
            modelBuilder.Entity<RepairOrderServiceJoin>()
                .HasKey(ros => new { ros.RepairOrderId, ros.ServiceId });

            modelBuilder.Entity<RepairOrderServiceJoin>()
                .HasOne(ros => ros.RepairOrder)
                .WithMany(ro => ro.RepairOrderServices)
                .HasForeignKey(ros => ros.RepairOrderId);

            modelBuilder.Entity<RepairOrderServiceJoin>()
                .HasOne(ros => ros.Service)
                .WithMany(s => s.RepairOrderServices)
                .HasForeignKey(ros => ros.ServiceId);

            // 8. Many-to-many: Service ↔ SparePart
            modelBuilder.Entity<ServiceSparePartJoin>()
                .HasKey(ssp => new { ssp.ServiceId, ssp.SparePartId });

            modelBuilder.Entity<ServiceSparePartJoin>()
                .HasOne(ssp => ssp.Service)
                .WithMany(s => s.ServiceSpareParts)
                .HasForeignKey(ssp => ssp.ServiceId);

            modelBuilder.Entity<ServiceSparePartJoin>()
                .HasOne(ssp => ssp.SparePart)
                .WithMany(sp => sp.ServiceSpareParts)
                .HasForeignKey(ssp => ssp.SparePartId);

            // 9. Receipt configurations
            modelBuilder.Entity<Receipt>()
                .HasOne(r => r.RepairOrder)
                .WithMany()
                .HasForeignKey(r => r.RepairOrderId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Receipt>()
                .HasOne(r => r.Customer)
                .WithMany()
                .HasForeignKey(r => r.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Receipt>()
                .Property(r => r.ServicesPerformed)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new()
                );

            // 10. CartItem → Customer
            modelBuilder.Entity<CartItem>()
                .HasOne(c => c.Customer)
                .WithMany()
                .HasForeignKey(c => c.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            // 11. WorkOrderLine → Service
            modelBuilder.Entity<WorkOrderLine>()
                .HasOne(wl => wl.Service)
                .WithMany()
                .HasForeignKey(wl => wl.ServiceId)
                .OnDelete(DeleteBehavior.SetNull);

            // 12. AppUser unique username
            modelBuilder.Entity<AppUser>()
                .HasIndex(u => u.Username)
                .IsUnique();

            // 13. FormDraft unique per user and form
            modelBuilder.Entity<FormDraft>()
                .HasIndex(d => new { d.UserId, d.FormKey })
                .IsUnique();

            // 14. Unique index on InvoiceNumber (system-wide uniqueness)
            modelBuilder.Entity<Invoice>()
                .HasIndex(i => i.InvoiceNumber)
                .IsUnique();

            // 14b. Unique index on WorkOrder.OrderNumber (system-wide uniqueness)
            modelBuilder.Entity<WorkOrder>()
                .HasIndex(w => w.OrderNumber)
                .IsUnique();

            // 15. InvoiceIdHistory configuration
            modelBuilder.Entity<InvoiceIdHistory>()
                .HasOne(h => h.Invoice)
                .WithMany(i => i.IdHistories)
                .HasForeignKey(h => h.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<InvoiceIdHistory>()
                .HasIndex(h => h.OldInvoiceNumber);

            // Universal Soft Delete
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (typeof(ISoftDeletable).IsAssignableFrom(entityType.ClrType))
                {
                    var parameter = Expression.Parameter(entityType.ClrType, "e");
                    var property = Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted));
                    var compare = Expression.Equal(property, Expression.Constant(false));
                    var lambda = Expression.Lambda(compare, parameter);
                    modelBuilder.Entity(entityType.ClrType).HasQueryFilter(lambda);
                }
            }

            // Decimal precisions (cross-database safe)
            modelBuilder.Entity<RepairOrder>().Property(ro => ro.TotalCost).HasPrecision(18, 2);
            modelBuilder.Entity<Service>().Property(s => s.BasePrice).HasPrecision(18, 2);
            modelBuilder.Entity<Service>().Property(s => s.DefaultCost).HasPrecision(18, 2);
            modelBuilder.Entity<SparePart>().Property(sp => sp.UnitPrice).HasPrecision(18, 2);
            modelBuilder.Entity<SparePart>().Property(sp => sp.PurchasePrice).HasPrecision(18, 2);
            modelBuilder.Entity<RepairOrderServiceJoin>().Property(ros => ros.PriceAtTime).HasPrecision(18, 2);
            modelBuilder.Entity<Receipt>().Property(r => r.TotalCost).HasPrecision(18, 2);
            modelBuilder.Entity<CartItem>().Property(c => c.UnitPrice).HasPrecision(18, 2);

            modelBuilder.Entity<WorkOrder>().Property(w => w.TotalLabor).HasPrecision(18, 2);
            modelBuilder.Entity<WorkOrder>().Property(w => w.TotalParts).HasPrecision(18, 2);
            modelBuilder.Entity<WorkOrder>().Property(w => w.TotalWorkmanship).HasPrecision(18, 2);
            modelBuilder.Entity<WorkOrder>().Property(w => w.TotalAmount).HasPrecision(18, 2);
            modelBuilder.Entity<WorkOrderLine>().Property(wl => wl.Quantity).HasPrecision(18, 2);
            modelBuilder.Entity<WorkOrderLine>().Property(wl => wl.UnitCost).HasPrecision(18, 2);
            modelBuilder.Entity<WorkOrderLine>().Property(wl => wl.UnitPrice).HasPrecision(18, 2);

            modelBuilder.Entity<Invoice>().Property(i => i.Subtotal).HasPrecision(18, 2);
            modelBuilder.Entity<Invoice>().Property(i => i.DiscountAmount).HasPrecision(18, 2);
            modelBuilder.Entity<Invoice>().Property(i => i.VatPercentage).HasPrecision(18, 2);
            modelBuilder.Entity<Invoice>().Property(i => i.VatAmount).HasPrecision(18, 2);
            modelBuilder.Entity<Invoice>().Property(i => i.TotalAmount).HasPrecision(18, 2);
            modelBuilder.Entity<Invoice>().Property(i => i.PaidAmount).HasPrecision(18, 2);
            modelBuilder.Entity<InvoicePayment>().Property(ip => ip.Amount).HasPrecision(18, 2);

            modelBuilder.Entity<PartMovement>().Property(pm => pm.QuantityChanged).HasPrecision(18, 2);
            modelBuilder.Entity<PartMovement>().Property(pm => pm.BalanceAfter).HasPrecision(18, 2);
            modelBuilder.Entity<PartMovement>().Property(pm => pm.UnitCost).HasPrecision(18, 2);

            modelBuilder.Entity<Supplier>().Property(s => s.BalanceDue).HasPrecision(18, 2);
            modelBuilder.Entity<TreasuryTransaction>().Property(t => t.Amount).HasPrecision(18, 2);
            modelBuilder.Entity<TreasuryTransaction>().Property(t => t.BalanceAfter).HasPrecision(18, 2);
            modelBuilder.Entity<InsuranceCompany>().Property(ic => ic.TotalInvoiced).HasPrecision(18, 2);
            modelBuilder.Entity<InsuranceCompany>().Property(ic => ic.TotalPaid).HasPrecision(18, 2);
            modelBuilder.Entity<EmployeeAdvance>().Property(ea => ea.Amount).HasPrecision(18, 2);
            modelBuilder.Entity<CarInspection>().Property(ci => ci.OverallScore).HasPrecision(18, 2);
            modelBuilder.Entity<CarInspection>().Property(ci => ci.InvoiceAmount).HasPrecision(18, 2);
        }

        public override int SaveChanges()
        {
            ApplySoftDelete();
            EnrichAuditLogs();
            return base.SaveChanges();
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            ApplySoftDelete();
            EnrichAuditLogs();
            return await base.SaveChangesAsync(cancellationToken);
        }

        private void EnrichAuditLogs()
        {
            try
            {
                var deviceName = _httpContextAccessor?.HttpContext?.Request?.Headers["X-Device-Name"].FirstOrDefault();
                if (string.IsNullOrWhiteSpace(deviceName))
                {
                    deviceName = _httpContextAccessor?.HttpContext?.User?.Identity?.Name;
                }

                if (!string.IsNullOrWhiteSpace(deviceName))
                {
                    foreach (var entry in ChangeTracker.Entries<AuditLog>())
                    {
                        if (entry.State == EntityState.Added)
                        {
                            if (string.IsNullOrWhiteSpace(entry.Entity.UserName) || entry.Entity.UserName == "admin")
                            {
                                entry.Entity.UserName = deviceName;
                            }
                            if (string.IsNullOrWhiteSpace(entry.Entity.UserId))
                            {
                                entry.Entity.UserId = deviceName;
                            }
                        }
                    }
                }
            }
            catch
            {
                // Safety: ignore any exception in context enrichment
            }
        }

        private void ApplySoftDelete()
        {
            foreach (var entry in ChangeTracker.Entries())
            {
                if (entry.Entity is ISoftDeletable softDeletable && entry.State == EntityState.Deleted)
                {
                    entry.State = EntityState.Modified;
                    softDeletable.IsDeleted = true;
                    softDeletable.DeletedAt = DateTime.UtcNow;
                }
            }
        }
    }
}
