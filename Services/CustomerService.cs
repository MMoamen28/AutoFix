using AutoFix.Data;
using AutoFix.DTOs.Customer;
using AutoFix.Models;
using AutoFix.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoFix.Services
{
    public class CustomerService : ICustomerService
    {
        private readonly AppDbContext _db;
        public CustomerService(AppDbContext db) => _db = db;

        public async Task<List<CustomerResponseDto>> GetAllAsync()
        {
            return await _db.Customers
                .AsNoTracking()
                .Select(c => new CustomerResponseDto
                {
                    Id = c.Id,
                    FullName = c.FullName,
                    Email = c.Email,
                    Phone = c.Phone,
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<CustomerResponseDto?> GetByIdAsync(int id)
        {
            return await _db.Customers
                .AsNoTracking()
                .Where(c => c.Id == id)
                .Select(c => new CustomerResponseDto
                {
                    Id = c.Id,
                    FullName = c.FullName,
                    Email = c.Email,
                    Phone = c.Phone,
                    CreatedAt = c.CreatedAt
                })
                .FirstOrDefaultAsync();
        }

        public async Task<CustomerResponseDto> CreateAsync(CreateCustomerDto dto)
        {
            var customer = new Customer
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Phone = dto.Phone
            };

            _db.Customers.Add(customer);
            await _db.SaveChangesAsync();

            return new CustomerResponseDto
            {
                Id = customer.Id,
                FullName = customer.FullName,
                Email = customer.Email,
                Phone = customer.Phone,
                CreatedAt = customer.CreatedAt
            };
        }

        public async Task<CustomerResponseDto?> UpdateAsync(int id, UpdateCustomerDto dto)
        {
            var customer = await _db.Customers.FindAsync(id);
            if (customer == null) return null;

            customer.FullName = dto.FullName;
            customer.Email = dto.Email;
            customer.Phone = dto.Phone;

            await _db.SaveChangesAsync();

            return new CustomerResponseDto
            {
                Id = customer.Id,
                FullName = customer.FullName,
                Email = customer.Email,
                Phone = customer.Phone,
                CreatedAt = customer.CreatedAt
            };
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var customer = await _db.Customers.FindAsync(id);
            if (customer == null) return false;

            _db.Customers.Remove(customer);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
