import React, { useState, useEffect } from 'react';
import { carService } from '../../services/carService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { Car, Plus, Shield, Hash, Calendar, Trash2 } from 'lucide-react';

const MyCarsPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = () => {
    setLoading(true);
    setError(null);
    carService.getAll()
      .then(setData)
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load cars'))
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await carService.create({ make, model, year: parseInt(year), licensePlate });
      setMake(''); 
      setModel(''); 
      setYear(''); 
      setLicensePlate('');
      toast.success('Vehicle added successfully!');
      fetchCars();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error adding vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-10 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
            <Car className="text-blue-500" size={36} />
            My Garage
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Manage your registered vehicles and their records.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Add Car Form */}
        <div className="xl:col-span-1">
          <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] p-10 sticky top-8">
            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
              <Plus className="text-blue-400" size={24} />
              Add New Vehicle
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Brand / Make</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                  <input value={make} onChange={e => setMake(e.target.value)} placeholder="e.g. Toyota" required 
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-blue-500 focus:bg-gray-800 transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Model Name</label>
                <div className="relative">
                  <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                  <input value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Camry" required 
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-blue-500 focus:bg-gray-800 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Year</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                    <input value={year} onChange={e => setYear(e.target.value)} placeholder="2023" type="number" required 
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-blue-500 focus:bg-gray-800 transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">License Plate</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                    <input value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="ABC-1234" required 
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-blue-500 focus:bg-gray-800 transition-all" />
                  </div>
                </div>
              </div>
              
              <button type="submit" disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 mt-4 active:scale-95">
                {submitting ? 'Processing...' : 'Register Vehicle'}
              </button>
            </form>
          </div>
        </div>

        {/* Cars List */}
        <div className="xl:col-span-2">
          {loading ? (
            <div className="flex justify-center py-20"><LoadingSpinner /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.length === 0 ? (
                <div className="col-span-full bg-gray-900/50 border border-gray-800 rounded-[2.5rem] p-20 text-center">
                  <Car className="mx-auto mb-6 text-gray-700" size={64} />
                  <p className="text-gray-500 text-xl font-medium">Your garage is currently empty.</p>
                  <p className="text-gray-600 mt-2">Add your first vehicle using the form on the left.</p>
                </div>
              ) : (
                data.map(car => (
                  <div key={car.id} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] p-8 hover:border-blue-500/50 transition-all group overflow-hidden relative">
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl group-hover:bg-blue-600/10 transition-colors"></div>
                    <div className="flex justify-between items-start mb-8">
                      <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center">
                        <Car className="text-blue-400" size={32} />
                      </div>
                      <button className="text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">{car.make} {car.model}</h3>
                    <div className="flex flex-wrap gap-3">
                      <span className="bg-gray-800 text-gray-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-gray-700">
                        {car.year}
                      </span>
                      <span className="bg-blue-600/10 text-blue-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-blue-500/20">
                        Plate: {car.licensePlate}
                      </span>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-gray-800 flex justify-between items-center">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-gray-900 bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400">
                            {i}
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">3 Service Records</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      {error && <div className="text-red-400 text-center py-10 bg-red-400/10 rounded-2xl border border-red-400/20">{error}</div>}
    </div>
  );
};

export default MyCarsPage;
