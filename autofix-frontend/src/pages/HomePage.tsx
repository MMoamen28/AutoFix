import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, Shield, Zap, BarChart3, 
  ChevronRight, ArrowRight, Star, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white overflow-x-hidden">
      {/* Navigation Backdrop Overlay */}
      <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none"></div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-8 animate-fade-in">
          <Star size={16} fill="currentColor" />
          <span>Next-Generation Workshop OS</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none mb-8 animate-fade-in">
          The Future of <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-emerald-400">
            Auto Logistics.
          </span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-xl text-gray-400 leading-relaxed mb-12 animate-fade-in delay-100">
          Streamline your automotive empire with precision engineering. From inventory to executive approvals, manage everything in one unified dashboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in delay-200">
          <button 
            onClick={handleStart}
            className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all shadow-2xl shadow-blue-600/20 active:scale-95"
          >
            Access System
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button 
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-gray-900/50 hover:bg-gray-800 border border-gray-800 rounded-2xl font-bold text-lg transition-all backdrop-blur-xl"
          >
            Join as Customer
          </button>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-6 py-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={Shield} 
            title="Owner Privilege" 
            desc="Multi-tier RBAC with mandatory executive approvals for critical mechanic actions."
            color="blue"
          />
          <FeatureCard 
            icon={Zap} 
            title="Instant Logistics" 
            desc="Real-time inventory tracking and automated receipt generation upon service completion."
            color="purple"
          />
          <FeatureCard 
            icon={BarChart3} 
            title="Revenue Intelligence" 
            desc="Advanced analytics and consolidated reporting for your entire workshop network."
            color="emerald"
          />
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-gray-900/30 border-y border-gray-800/50 py-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-12 h-12 rounded-full border-4 border-[#0B0F1A] bg-gray-800 flex items-center justify-center">
                  <Users size={20} className="text-gray-400" />
                </div>
              ))}
            </div>
            <div>
              <p className="font-bold text-xl">500+ Workshops</p>
              <p className="text-gray-500 text-sm">Managing 50k+ vehicles monthly</p>
            </div>
          </div>
          
          <div className="flex gap-12 text-gray-500 font-bold tracking-widest text-sm uppercase">
            <span>Precision</span>
            <span>Performance</span>
            <span>Reliability</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Wrench size={16} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">AutoFix Pro</span>
        </div>
        <p className="text-gray-600 text-sm">© 2026 AutoFix Systems. Built for the elite automotive tier.</p>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<any> = ({ icon: Icon, title, desc, color }) => {
  const colors: any = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  };

  return (
    <div className="group p-10 bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] hover:border-blue-500/30 transition-all duration-500 cursor-default">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 ${colors[color]} group-hover:scale-110 transition-transform`}>
        <Icon size={28} />
      </div>
      <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors">{title}</h3>
      <p className="text-gray-500 leading-relaxed mb-6">{desc}</p>
      <div className="flex items-center gap-2 text-sm font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
        Explore Module
        <ChevronRight size={16} />
      </div>
    </div>
  );
};

export default HomePage;
