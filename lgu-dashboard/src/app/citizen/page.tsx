"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Award, 
  History, 
  Trophy, 
  QrCode, 
  Leaf, 
  Sparkles,
  LogOut,
  Users,
  Building2,
  Ticket,
  ShoppingBag,
  PackageCheck,
  Sprout
} from 'lucide-react';
import ISegregateGame from '../../components/ISegregateGame';

interface Transaction {
  id: string;
  transaction_type: 'EARNED_DISPOSAL' | 'REDEEMED_REWARD' | 'GAME_REWARD';
  points: number;
  details: {
    waste_category?: string;
    weight_kg?: number;
    title?: string;
  };
  created_at: string;
}

interface FamilyLeaderboard {
  familyName: string;
  barangay: string;
  points: number;
  badge: string;
}

interface BarangayLeaderboard {
  barangay: string;
  total_points: number;
  active_households: number;
}

export default function CitizenPortalRoute() {
  const router = useRouter();
  const [points, setPoints] = useState<number>(3420);
  const [qrCode] = useState<string>('QR-BIN-8F2B7E');
  const [firstName] = useState<string>('Juan');
  const [lastName] = useState<string>('Palad');
  const [barangay] = useState<string>('Barangay 669');
  const [leaderboardTab, setLeaderboardTab] = useState<'family' | 'barangay'>('family');

  const [familyLeaderboard] = useState<FamilyLeaderboard[]>([
    { familyName: 'Palad Household', barangay: 'Barangay 669', points: 420, badge: '🥇 Top Segregator' },
    { familyName: 'Santos Household', barangay: 'Barangay 669', points: 380, badge: '🥈 Eco Master' },
    { familyName: 'Dela Cruz Household', barangay: 'Barangay 402', points: 310, badge: '🥉 Green Champ' },
    { familyName: 'Reyes Household', barangay: 'Barangay 712', points: 295, badge: '⭐ Active Family' },
  ]);

  const [barangayLeaderboard] = useState<BarangayLeaderboard[]>([
    { barangay: 'Barangay 669', total_points: 4890, active_households: 24 },
    { barangay: 'Barangay 402', total_points: 3120, active_households: 18 },
    { barangay: 'Barangay 712', total_points: 2950, active_households: 15 },
    { barangay: 'Barangay 305', total_points: 1820, active_households: 9 }
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: '1', transaction_type: 'GAME_REWARD', points: 45, details: { title: 'i-Segregate! Game Bonus' }, created_at: new Date().toISOString() },
    { id: '2', transaction_type: 'EARNED_DISPOSAL', points: 37, details: { waste_category: 'recyclable', weight_kg: 2.5 }, created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
    { id: '3', transaction_type: 'REDEEMED_REWARD', points: -50, details: { title: '1-Month Garbage Bag Supply' }, created_at: new Date(Date.now() - 3600000 * 48).toISOString() }
  ]);

  const handleScoreFromGame = (earnedPts: number) => {
    setPoints(prev => prev + earnedPts);
    const newTx: Transaction = {
      id: String(Date.now()),
      transaction_type: 'GAME_REWARD',
      points: earnedPts,
      details: { title: 'i-Segregate! Game Reward' },
      created_at: new Date().toISOString()
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  const handleRedeemVoucher = (cost: number, title: string) => {
    if (points < cost) {
      alert("Insufficient points balance!");
      return;
    }
    setPoints(prev => prev - cost);
    const newTx: Transaction = {
      id: String(Date.now()),
      transaction_type: 'REDEEMED_REWARD',
      points: -cost,
      details: { title },
      created_at: new Date().toISOString()
    };
    setTransactions(prev => [newTx, ...prev]);
    alert(`Successfully redeemed: ${title}! Voucher saved to account.`);
  };

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans max-w-md mx-auto flex flex-col justify-between border-x border-slate-200 shadow-xl pb-10">
      
      {/* Header bar */}
      <header className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-[1000] shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
            <Leaf className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900">Citizen Green Portal</h1>
            <p className="text-[9px] text-emerald-700 font-bold">Smart Household System</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-emerald-100/70 border border-emerald-200 px-2.5 py-1 rounded-full text-emerald-900 text-[10px] font-black">
            <Sparkles className="h-3 w-3 text-emerald-600 fill-emerald-600" />
            <span>LVL 12</span>
          </div>

          <button 
            onClick={handleLogout}
            className="p-1.5 bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 rounded-xl transition-all cursor-pointer"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-5 space-y-6 overflow-y-auto">
        
        {/* Household Profile & Points Card */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-500 rounded-3xl p-6 text-white relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">{firstName} {lastName}</h2>
              <p className="text-xs text-emerald-100 font-semibold">{barangay}</p>
            </div>
            <div className="p-3 bg-white/20 backdrop-blur-md text-white rounded-2xl">
              <Award className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-6">
            <span className="text-[9px] text-emerald-100 font-bold uppercase tracking-widest block">Household Eco-Points</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <h3 className="text-4xl font-black tracking-tight">{points}</h3>
              <span className="text-sm font-bold text-emerald-200">Points</span>
            </div>
          </div>
        </div>

        {/* 1. Household QR Code */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center shadow-sm space-y-3">
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-md">
              <QRCodeSVG value={qrCode} size={150} />
            </div>
          </div>
          <div className="flex items-center justify-center space-x-2 text-xs font-bold text-slate-800">
            <QrCode className="h-4 w-4 text-emerald-600" />
            <span className="font-mono tracking-wider text-slate-900">{qrCode}</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">Scan this household QR code at smart bins during disposal to record participation and earn rewards</p>
        </div>

        {/* 2. Leaderboards Section */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Solid Waste Leaderboards</h3>
            </div>

            {/* Family / Barangay Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-bold">
              <button
                onClick={() => setLeaderboardTab('family')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  leaderboardTab === 'family' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Family
              </button>
              <button
                onClick={() => setLeaderboardTab('barangay')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  leaderboardTab === 'barangay' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Barangay
              </button>
            </div>
          </div>

          {/* Family Leaderboard */}
          {leaderboardTab === 'family' && (
            <div className="space-y-3">
              {familyLeaderboard.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{item.familyName}</h4>
                      <p className="text-[9px] text-emerald-700 font-semibold">{item.badge}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-900">{item.points} pts</span>
                </div>
              ))}
            </div>
          )}

          {/* Barangay Leaderboard */}
          {leaderboardTab === 'barangay' && (
            <div className="space-y-3">
              {barangayLeaderboard.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{item.barangay}</h4>
                      <p className="text-[9px] text-slate-500 font-medium">{item.active_households} families active</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-700">{item.total_points} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. i-Segregate! Mini-Game Component */}
        <ISegregateGame onScorePoints={handleScoreFromGame} />

        {/* 4. Rewards Section */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Ticket className="h-5 w-5 text-emerald-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Local Business Vouchers</h3>
          </div>

          <div className="space-y-3">
            {[
              { 
                title: '₱50 Local Grocery Coupon', 
                cost: 3000, 
                partner: 'Barangay Mart',
                icon: ShoppingBag,
                bgColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                badge: 'MART'
              },
              { 
                title: '₱20 Reusable Bag Discount', 
                cost: 2000, 
                partner: 'Eco Supply Co.',
                icon: PackageCheck,
                bgColor: 'bg-teal-50 text-teal-600 border-teal-200',
                badge: 'ECO'
              },
              { 
                title: 'Organic Fertilizer (1kg)', 
                cost: 1000, 
                partner: 'Community Garden',
                icon: Sprout,
                bgColor: 'bg-amber-50 text-amber-600 border-amber-200',
                badge: 'GARDEN'
              },
            ].map((voucher, idx) => {
              const IconComp = voucher.icon;
              return (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center group hover:border-slate-300 transition-all">
                  <div className="flex items-center space-x-3">
                    {/* Business Partner Logo Avatar */}
                    <div className={`w-11 h-11 rounded-xl border ${voucher.bgColor} flex flex-col items-center justify-center shrink-0 shadow-xs`}>
                      <IconComp className="h-5 w-5" />
                      <span className="text-[7px] font-black tracking-widest uppercase mt-0.5 opacity-80">{voucher.badge}</span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{voucher.title}</h4>
                      <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Partner: <span className="text-slate-700 font-bold">{voucher.partner}</span></p>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleRedeemVoucher(voucher.cost, voucher.title)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    Redeem ({voucher.cost} pts)
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Points Record History */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <History className="h-4.5 w-4.5 text-slate-400" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Points History</h3>
          </div>

          <div className="space-y-3">
            {transactions.map((tx) => {
              const isEarned = tx.points > 0;
              return (
                <div key={tx.id} className="flex justify-between items-center text-xs">
                  <div>
                    <h5 className="font-bold text-slate-800">
                      {tx.details.title || `Segregated ${tx.details.waste_category}`}
                    </h5>
                    <p className="text-[8px] text-slate-400 mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`font-black text-xs ${isEarned ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {isEarned ? `+${tx.points}` : `${tx.points}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}
