import client from './axiosClient';
import { CartItem, AddToCartDto } from '../types';

export const getCart        = ()                                    => client.get<CartItem[]>('/cart').then(r => r.data);
export const addToCart      = (dto: AddToCartDto)                   => client.post<CartItem>('/cart', dto).then(r => r.data);
export const updateQuantity = (cartItemId: number, dto: { quantity: number }) => client.put<CartItem>(`/cart/${cartItemId}`, dto).then(r => r.data);
export const removeFromCart = (cartItemId: number)                  => client.delete(`/cart/${cartItemId}`);
export const clearCart      = ()                                    => client.delete('/cart');
export const getCartTotal   = ()                                    => client.get<number>('/cart/total').then(r => r.data);

export const cartService = {
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  getCartTotal
};

export default cartService;
