using AutoFix.Models;
using Microsoft.EntityFrameworkCore;

namespace AutoFix.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<Mechanic> Mechanics => Set<Mechanic>();
        public DbSet<MechanicProfile> MechanicProfiles => Set<MechanicProfile>();
        public DbSet<Car> Cars => Set<Car>();
        public DbSet<RepairOrder> RepairOrders => Set<RepairOrder>();
        public DbSet<Service> Services => Set<Service>();
        public DbSet<SparePart> SpareParts => Set<SparePart>();
        public DbSet<SparePartCategory> SparePartCategories => Set<SparePartCategory>();
        public DbSet<RepairOrderServiceJoin> RepairOrderServices => Set<RepairOrderServiceJoin>();
        public DbSet<ServiceSparePartJoin> ServiceSpareParts => Set<ServiceSparePartJoin>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // One-to-many: SparePartCategory → SparePart
            modelBuilder.Entity<SparePart>()
                .HasOne(sp => sp.Category)
                .WithMany(c => c.SpareParts)
                .HasForeignKey(sp => sp.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            // Unique index on PartNumber
            modelBuilder.Entity<SparePart>()
                .HasIndex(sp => sp.PartNumber)
                .IsUnique();
            // One-to-one: Mechanic → MechanicProfile
            modelBuilder.Entity<Mechanic>()
                .HasOne(m => m.Profile)
                .WithOne(p => p.Mechanic)
                .HasForeignKey<MechanicProfile>(p => p.MechanicId)
                .OnDelete(DeleteBehavior.Cascade);

            // One-to-many: Customer → Cars
            modelBuilder.Entity<Car>()
                .HasOne(c => c.Customer)
                .WithMany(cu => cu.Cars)
                .HasForeignKey(c => c.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            // One-to-many: Customer → RepairOrders
            modelBuilder.Entity<RepairOrder>()
                .HasOne(ro => ro.Customer)
                .WithMany(c => c.RepairOrders)
                .HasForeignKey(ro => ro.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            // One-to-many: Car → RepairOrders
            modelBuilder.Entity<RepairOrder>()
                .HasOne(ro => ro.Car)
                .WithMany(c => c.RepairOrders)
                .HasForeignKey(ro => ro.CarId)
                .OnDelete(DeleteBehavior.Restrict);

            // One-to-many: Mechanic → RepairOrders (nullable FK)
            modelBuilder.Entity<RepairOrder>()
                .HasOne(ro => ro.Mechanic)
                .WithMany(m => m.RepairOrders)
                .HasForeignKey(ro => ro.MechanicId)
                .OnDelete(DeleteBehavior.SetNull);

            // Many-to-many: RepairOrder ↔ Service (composite PK on join table)
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

            // Many-to-many: Service ↔ SparePart (composite PK on join table)
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

            // Decimal precision
            modelBuilder.Entity<RepairOrder>()
                .Property(ro => ro.TotalCost).HasPrecision(10, 2);
            modelBuilder.Entity<Service>()
                .Property(s => s.BasePrice).HasPrecision(10, 2);
            modelBuilder.Entity<SparePart>()
                .Property(sp => sp.UnitPrice).HasPrecision(10, 2);
            modelBuilder.Entity<RepairOrderServiceJoin>()
                .Property(ros => ros.PriceAtTime).HasPrecision(10, 2);
        }
    }
}
