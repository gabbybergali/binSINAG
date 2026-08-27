"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, ShieldAlert, Navigation, Award, ArrowRight, Lock, User, RefreshCw, Cpu, Radio } from 'lucide-react';

type Role = 'lgu' | 'driver' | 'citizen';

export default function EntryPortal() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loggingIn, setLoggingIn] = useState<boolean>(false);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    if (role === 'lgu') {
      setEmail('admin@binsinag.gov.ph');
      setPassword('••••••••');
    } else if (role === 'driver') {
      setEmail('driver.karl@logistics.ph');
      setPassword('••••••••');
    } else {
      setEmail('juan.palad@household.ph');
      setPassword('••••••••');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);

    setTimeout(() => {
      setLoggingIn(false);
      if (selectedRole) {
        router.push(`/${selectedRole}`);
      }
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Visual background glowing green gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="text-center mb-6 z-10 flex flex-col items-center">
        <img 
          src="/binsinag-logo.png" 
          alt="binSINAG Logo" 
          className="h-48 md:h-56 w-auto mb-2 drop-shadow-lg object-contain transition-all duration-300 hover:scale-105" 
        />
        <p className="text-xs text-slate-500 uppercase tracking-widest font-extrabold">Smart Solid Waste System Web Portal</p>
      </div>

      {/* Portal Selection Grid / Login form panel */}
      <div className="w-full max-w-md z-10">
        {!selectedRole ? (
          <div className="space-y-4">
            <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider text-center mb-6">Select Designated Role to Log In</h2>
            
            {/* 1. LGU */}
            <button
              onClick={() => handleRoleSelect('lgu')}
              className="w-full bg-white border border-slate-200 rounded-3xl p-5 hover:border-emerald-500 hover:shadow-md transition-all text-left flex items-center justify-between group cursor-pointer shadow-xs"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">LGU Officer Dashboard</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Fill Level & Weight Analytics, AI Insights</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1.5 transition-all" />
            </button>

            {/* 2. Driver */}
            <button
              onClick={() => handleRoleSelect('driver')}
              className="w-full bg-white border border-slate-200 rounded-3xl p-5 hover:border-emerald-500 hover:shadow-md transition-all text-left flex items-center justify-between group cursor-pointer shadow-xs"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl">
                  <Navigation className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Truck Driver Dashboard</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Smart Bin Map, AI Routing & Fuel Savings</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1.5 transition-all" />
            </button>

            {/* 3. Citizen */}
            <button
              onClick={() => handleRoleSelect('citizen')}
              className="w-full bg-white border border-slate-200 rounded-3xl p-5 hover:border-emerald-500 hover:shadow-md transition-all text-left flex items-center justify-between group cursor-pointer shadow-xs"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Citizen Green Portal</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Household QR, Leaderboards & i-Segregate!</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1.5 transition-all" />
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 capitalize">
                  {selectedRole === 'lgu' ? 'LGU Officer Login' : selectedRole === 'driver' ? 'Truck Driver Login' : 'Citizen Login'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Enter credentials to proceed</p>
              </div>
              <button 
                onClick={() => setSelectedRole(null)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
              >
                Change Role
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5 pl-1">Username / Email</label>
                <div className="relative">
                  <User className="h-4.5 w-4.5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                    placeholder="Enter email or ID"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5 pl-1">Password</label>
                <div className="relative">
                  <Lock className="h-4.5 w-4.5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                    placeholder="Enter password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3.5 mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm tracking-wide transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
              >
                {loggingIn ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                    <span>Verifying Session...</span>
                  </>
                ) : (
                  <span>Access System</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
