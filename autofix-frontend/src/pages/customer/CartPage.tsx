import React, { useState, useEffect } from 'react';
import { cartService } from '../../services/cartService';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { carService } from '../../services/carService';
import { CartItem } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Trash2, ArrowRight, Car, FileText, CheckCircle2, X, Receipt } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState<any[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState<number | string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);

  useEffect(() => {
    fetchCart();
    fetchCars();
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const data = await cartService.getCart();
      setItems(data);
    } catch (err: any) {
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const fetchCars = async () => {
    try {
      const data = await carService.getAll();
      setCars(data);
      if (data.length > 0) setSelectedCarId(data[0].id);
    } catch (err) {
      console.error('Failed to load cars');
    }
  };

  const handleUpdateQuantity = async (id: number, quantity: number) => {
    if (quantity < 1) return;
    try {
      await cartService.updateQuantity(id, { quantity });
      fetchCart();
      window.dispatchEvent(new Event('cart-updated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleRemove = async (id: number) => {
    if (!window.confirm('Remove this item?')) return;
    try {
      await cartService.removeFromCart(id);
      fetchCart();
      window.dispatchEvent(new Event('cart-updated'));
      toast.success('Item removed');
    } catch (err) {
      toast.error('Failed to remove item');
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear your entire cart?')) return;
    try {
      await cartService.clearCart();
      fetchCart();
      window.dispatchEvent(new Event('cart-updated'));
      toast.success('Cart cleared');
    } catch (err) {
      toast.error('Failed to clear cart');
    }
  };

  const handleCheckout = async () => {
    if (!selectedCarId) {
      toast.error('Please select a car');
      return;
    }
    setSubmitting(true);
    try {
      const order = await purchaseOrderService.placeOrder({
        carId: Number(selectedCarId),
        notes
      });
      setLastOrder(order);
      setItems([]);
      window.dispatchEvent(new Event('cart-updated'));
      setIsCheckoutOpen(false);
      setShowReceipt(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  if (loading) return <div className="p-20 text-center"><LoadingSpinner /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
            <ShoppingCart className="text-blue-500" size={36} />
            My Shopping Cart
          </h1>
          <p className="text-gray-400 mt-2">Review your selected services and parts before checkout.</p>
        </div>
        {items.length > 0 && (
          <button onClick={handleClear} className="text-red-400 font-bold flex items-center gap-2 hover:underline">
            <Trash2 size={18} />
            Clear Cart
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-[3rem] p-20 text-center flex flex-col items-center">
          <ShoppingCart className="text-gray-700 mb-6" size={80} />
          <h2 className="text-2xl font-bold text-white mb-4">Your cart is currently empty</h2>
          <p className="text-gray-500 mb-10 max-w-md">Browse our marketplace for premium services and precision spare parts.</p>
          <Link to="/marketplace" className="bg-blue-600 hover:bg-blue-50 text-white hover:text-blue-600 px-10 py-5 rounded-3xl font-black transition-all flex items-center gap-3">
            Go to Marketplace
            <ArrowRight size={20} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-6">
            {items.map(item => (
              <div key={item.id} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8 group">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 ${item.itemType === 'Service' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                  {item.itemType === 'Service' ? <FileText size={32} /> : <Car size={32} />}
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{item.itemType}</span>
                    <h3 className="text-xl font-bold text-white">{item.itemName}</h3>
                  </div>
                  <p className="text-gray-500 font-medium">${item.unitPrice.toFixed(2)} per unit</p>
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex items-center bg-gray-800 rounded-xl overflow-hidden border border-gray-700 h-12">
                    <button 
                      className="px-4 py-1 hover:bg-gray-700 transition-colors"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    >-</button>
                    <input 
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value))}
                      className="w-12 bg-transparent text-center font-bold text-white outline-none"
                    />
                    <button 
                      className="px-4 py-1 hover:bg-gray-700 transition-colors"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    >+</button>
                  </div>

                  <div className="w-32 text-right">
                    <p className="text-2xl font-black text-white">${item.subtotal.toFixed(2)}</p>
                  </div>

                  <button 
                    onClick={() => handleRemove(item.id)}
                    className="p-3 text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] p-10 sticky top-8">
              <h2 className="text-2xl font-bold text-white mb-8">Order Summary</h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-white font-medium">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Estimated Tax</span>
                  <span className="text-white font-medium">$0.00</span>
                </div>
                <div className="pt-4 border-t border-gray-800 flex justify-between items-end">
                  <span className="text-lg font-bold text-white">Total Amount</span>
                  <span className="text-4xl font-black text-blue-500">${total.toFixed(2)}</span>
                </div>
              </div>

              <button 
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-3"
              >
                Proceed to Checkout
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsCheckoutOpen(false)}></div>
          <div className="relative bg-[#0B0F1A] border border-gray-800 rounded-[3rem] w-full max-w-2xl p-12 overflow-hidden shadow-2xl">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
            
            <header className="flex justify-between items-start mb-10">
              <div>
                <h2 className="text-3xl font-black text-white mb-2">Finalize Your Order</h2>
                <p className="text-gray-400">Select which vehicle this service/part is for.</p>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-3 bg-gray-900 rounded-2xl hover:bg-gray-800 transition-colors">
                <X size={20} />
              </button>
            </header>

            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Select Vehicle</label>
                <div className="relative">
                  <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
                  <select 
                    value={selectedCarId}
                    onChange={(e) => setSelectedCarId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-blue-500 appearance-none transition-all"
                  >
                    <option value="" disabled>Choose a vehicle...</option>
                    {cars.map(car => (
                      <option key={car.id} value={car.id}>{car.year} {car.make} {car.model} ({car.licensePlate})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Additional Notes (Optional)</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tell our mechanics anything they should know..."
                  rows={4}
                  className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                <div className="flex justify-between items-center">
                  <p className="text-gray-400 font-medium">Order Total</p>
                  <p className="text-2xl font-black text-white">${total.toFixed(2)}</p>
                </div>
              </div>

              <button 
                onClick={handleCheckout}
                disabled={submitting || !selectedCarId}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 active:scale-95"
              >
                {submitting ? 'Processing Transaction...' : 'Place Secure Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl"></div>
          <div className="relative bg-white text-black w-full max-w-xl rounded-none shadow-2xl overflow-hidden font-mono p-12">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
            <div className="text-center mb-10">
              <div className="inline-flex p-3 bg-blue-600 rounded-xl mb-4 text-white">
                <Receipt size={32} />
              </div>
              <h2 className="text-3xl font-black tracking-tighter uppercase">Order Receipt</h2>
              <p className="text-sm font-bold text-gray-500 mt-1">TRANS-ID: {lastOrder.id}</p>
            </div>

            <div className="border-y-2 border-dashed border-gray-300 py-6 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="font-bold text-gray-500 uppercase">Customer</span>
                <span className="font-black">{lastOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-gray-500 uppercase">Vehicle</span>
                <span className="font-black">{lastOrder.carInfo}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-gray-500 uppercase">Date</span>
                <span className="font-black">{new Date(lastOrder.placedAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="py-8 space-y-4">
              <p className="text-xs font-black uppercase text-gray-400 mb-4">Line Items</p>
              {lastOrder.items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <p className="font-black uppercase text-sm">{item.itemName}</p>
                    <p className="text-[10px] text-gray-500">QTY: {item.quantity} × ${item.unitPrice.toFixed(2)}</p>
                  </div>
                  <span className="font-black">${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-dashed border-gray-300 pt-8 pb-4 flex justify-between items-end">
              <span className="font-black text-xl uppercase">Total Amount</span>
              <span className="font-black text-3xl">${lastOrder.totalAmount.toFixed(2)}</span>
            </div>

            <div className="mt-12 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-10">Thank you for choosing AutoFix Pro</p>
              <button 
                onClick={() => {
                  setShowReceipt(false);
                  navigate('/customer/orders');
                }}
                className="w-full bg-black text-white py-4 font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
              >
                Close & View Orders
              </button>
            </div>
            
            {/* Scalloped edge effect */}
            <div className="absolute -bottom-2 left-0 w-full flex">
              {Array.from({length: 20}).map((_, i) => (
                <div key={i} className="w-1/20 h-4 bg-[#0B0F1A] rounded-t-full"></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
