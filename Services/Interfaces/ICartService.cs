using System.Collections.Generic;
using System.Threading.Tasks;
using AutoFix.DTOs.Cart;

namespace AutoFix.Services.Interfaces
{
    public interface ICartService
    {
        Task<List<CartItemResponseDto>> GetCartAsync(int customerId);
        Task<CartItemResponseDto> AddToCartAsync(int customerId, AddToCartDto dto);
        Task<CartItemResponseDto?> UpdateQuantityAsync(int cartItemId, int customerId, UpdateCartItemDto dto);
        Task<bool> RemoveFromCartAsync(int cartItemId, int customerId);
        Task<bool> ClearCartAsync(int customerId);
        Task<decimal> GetCartTotalAsync(int customerId);
    }
}
