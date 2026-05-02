import React, { useState, useEffect } from 'react';
import { mechanicService } from '../../services/mechanicService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { UserPlus, Wrench, Mail, Shield, Lock, User } from 'lucide-react';

const MechanicsPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state — matches CreateMechanicDto
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMechanics();
  }, []);

  const fetchMechanics = () => {
    setLoading(true);
    setError(null);
    mechanicService.getAll()
      .then(setData)
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load mechanics'))
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      await mechanicService.create({ firstName, lastName, email, username, password });
      setFirstName('');
      setLastName('');
      setEmail('');
      setUsername('');
      setPassword('');
      toast.success('Mechanic account created successfully!');
      fetchMechanics();
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.response?.data || 'Error creating mechanic';
      toast.error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wrench className="text-blue-400" size={28} />
            Mechanic Management
          </h1>
          <p className="text-gray-400 mt-1">Create and manage mechanic accounts</p>
        </div>
      </header>

      {/* Add Mechanic Form */}
      <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-8">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <UserPlus size={20} className="text-blue-400" />
          Hire New Mechanic
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">First Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <input value={firstName} onChange={e => setFirstName(e.target.value)} 
                  placeholder="Ahmed" required 
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Last Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <input value={lastName} onChange={e => setLastName(e.target.value)} 
                  placeholder="Hassan" required 
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Username</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <input value={username} onChange={e => setUsername(e.target.value)} 
                  placeholder="mechanic_ahmed" required 
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} 
                  placeholder="ahmed@autofix.com" required 
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} 
                  placeholder="Min 8 characters" required 
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-all" />
              </div>
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95">
                {submitting ? 'Creating...' : 'Create Mechanic Account'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Mechanics List */}
      {loading ? <LoadingSpinner /> : (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Active Mechanics ({data.length})</h2>
          {data.length === 0 ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center">
              <Wrench className="mx-auto mb-4 text-gray-600" size={48} />
              <p className="text-gray-500 text-lg">No mechanics registered yet</p>
              <p className="text-gray-600 text-sm mt-1">Use the form above to hire your first mechanic</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.map(m => (
                <div key={m.id} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                      <Wrench className="text-blue-400" size={20} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{m.firstName} {m.lastName}</h3>
                      <p className="text-gray-500 text-sm">{m.email}</p>
                    </div>
                  </div>
                  {m.profile && (
                    <div className="border-t border-gray-800 pt-3 mt-3 space-y-1">
                      {m.profile.specialization && <p className="text-sm text-gray-400">🔧 {m.profile.specialization}</p>}
                      {m.profile.yearsOfExperience > 0 && <p className="text-sm text-gray-400">📅 {m.profile.yearsOfExperience} yrs experience</p>}
                      {m.profile.certificationNumber && <p className="text-sm text-gray-400">📋 Cert #{m.profile.certificationNumber}</p>}
                    </div>
                  )}
                  <div className="mt-3 text-xs text-gray-600">Hired: {m.hiredAt ? new Date(m.hiredAt).toLocaleDateString() : 'N/A'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <div className="text-red-400 text-center mt-4 bg-red-400/10 border border-red-400/20 rounded-xl p-4">{error}</div>}
    </div>
  );
};

export default MechanicsPage;
