import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Award, 
  History, 
  Trophy, 
  QrCode, 
  Leaf, 
  Recycle,
  Sparkles,
  Zap
} from 'lucide-react';

interface Transaction {
  id: string;
  transaction_type: 'EARNED_DISPOSAL' | 'REDEEMED_REWARD';
  points: number;
  details: {
    waste_category?: string;
    weight_kg?: number;
    title?: string;
    reward_id?: string;
  };
  created_at: string;
}

interface BarangayLeaderboard {
  barangay: string;
  total_points: number;
  active_households: number;
}

export default function App() {
  const [points, setPoints] = useState<number>(340);
  const [qrCode, setQrCode] = useState<string>('QR-BIN-8F2B7E');
  const [firstName] = useState<string>('Juan');
  const [lastName] = useState<string>('Palad');
  const [barangay, setBarangay] = useState<string>('Barangay 669');
  
  // Simulation States
  const [simulateCategory, setSimulateCategory] = useState<string>('recyclable');
  const [simulateWeight, setSimulateWeight] = useState<string>('2.5');
  const [simulating, setSimulating] = useState<boolean>(false);

  // Leaderboard & Transaction History lists
  const [leaderboard, setLeaderboard] = useState<BarangayLeaderboard[]>([
    { barangay: 'Barangay 669', total_points: 4890, active_households: 24 },
    { barangay: 'Barangay 402', total_points: 3120, active_households: 18 },
    { barangay: 'Barangay 712', total_points: 2950, active_households: 15 },
    { barangay: 'Barangay 305', total_points: 1820, active_households: 9 }
  ]);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: '1', transaction_type: 'EARNED_DISPOSAL', points: 37, details: { waste_category: 'recyclable', weight_kg: 2.5 }, created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: '2', transaction_type: 'EARNED_DISPOSAL', points: 16, details: { waste_category: 'biodegradable', weight_kg: 2.0 }, created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
    { id: '3', transaction_type: 'REDEEMED_REWARD', points: -50, details: { title: '1-Month Garbage Bag Supply' }, created_at: new Date(Date.now() - 3600000 * 48).toISOString() }
  ]);

  const BACKEND_URL = 'http://localhost:5000';

  useEffect(() => {
    // Attempt initial fetch from backend profile and leaderboard
    const fetchUserData = async () => {
      try {
        const profileRes = await fetch(`${BACKEND_URL}/api/v1/users/profile`, {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('citizen_token') }
        });
        if (profileRes.ok) {
          const data = await profileRes.json();
          if (data.profile) {
            setPoints(data.profile.points_balance);
            setQrCode(data.profile.qr_code_identifier);
            setBarangay(data.profile.barangay);
          }
        }

        const leaderboardRes = await fetch(`${BACKEND_URL}/api/v1/leaderboard`);
        if (leaderboardRes.ok) {
          const data = await leaderboardRes.json();
          if (data.barangays) setLeaderboard(data.barangays);
        }
      } catch (err) {
        console.warn("Backend offline. Loading Citizen portal in mock/demo mode.");
      }
    };

    fetchUserData();
  }, []);

  // Handle Simulated disposal points earning
  const handleSimulateDisposal = async () => {
    setSimulating(true);

    const weight = parseFloat(simulateWeight) || 1.0;
    
    // Simulate API request if online, else apply changes locally
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/citizens/dispose/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_code_identifier: qrCode,
          waste_category: simulateCategory,
          weight_kg: weight
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPoints(data.new_balance);
        
        // Append to local transaction log
        const newTx: Transaction = {
          id: String(Date.now()),
          transaction_type: 'EARNED_DISPOSAL',
          points: data.points_earned,
          details: { waste_category: simulateCategory, weight_kg: weight },
          created_at: new Date().toISOString()
        };
        setTransactions(prev => [newTx, ...prev]);
        
        alert(`Disposal verified! Earned +${data.points_earned} points.`);
        setSimulating(false);
        return;
      }
    } catch (err) {
      console.warn("Server offline, running mock transaction simulation.");
    }

    // Mock Offline fallback
    setTimeout(() => {
      let pointsPerKg = 5;
      if (simulateCategory === 'recyclable') pointsPerKg = 15;
      if (simulateCategory === 'biodegradable') pointsPerKg = 8;
      const pointsEarned = Math.round(weight * pointsPerKg);

      setPoints(prev => prev + pointsEarned);

      // Append transaction
      const mockTx: Transaction = {
        id: String(Date.now()),
        transaction_type: 'EARNED_DISPOSAL',
        points: pointsEarned,
        details: { waste_category: simulateCategory, weight_kg: weight },
        created_at: new Date().toISOString()
      };
      setTransactions(prev => [mockTx, ...prev]);

      // Update Leaderboard score
      setLeaderboard(prev => {
        return prev.map(item => {
          if (item.barangay === barangay) {
            return { ...item, total_points: item.total_points + pointsEarned };
          }
          return item;
        }).sort((a, b) => b.total_points - a.total_points);
      });

      setSimulating(false);
      alert(`Simulation Success! segretated ${weight} kg of ${simulateCategory} waste. Earned +${pointsEarned} points!`);
    }, 800);
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 font-sans max-w-md mx-auto flex flex-col justify-between border-x border-slate-900 shadow-2xl pb-10">
      
      {/* Top Banner Header */}
      <header className="p-4 bg-slate-900/60 backdrop-blur-md border-b border-slate-900 flex items-center justify-between sticky top-0 z-[1000]">
        <div className="flex items-center space-x-2.5">
          <img src="/binsinag-logo.png" alt="binSINAG" className="h-8 w-auto object-contain" />
          <h1 className="text-base font-bold text-white tracking-wide">binSINAG</h1>
        </div>
        <div className="flex items-center space-x-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 text-emerald-400 text-xs font-bold">
          <Sparkles className="h-3.5 w-3.5 fill-emerald-400" />
          <span>Citizen Portal</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-5 space-y-6 overflow-y-auto">
        
        {/* Profile Card & Points Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-white">{firstName} {lastName}</h2>
              <p className="text-xs text-slate-500 font-semibold">{barangay}</p>
            </div>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Award className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-6">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Available Balance</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <h3 className="text-4xl font-black text-white tracking-tight">{points}</h3>
              <span className="text-sm font-bold text-emerald-400">Points</span>
            </div>
          </div>
        </div>

        {/* QR Code Identification Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-white rounded-2xl shadow-xl">
              <QRCodeSVG value={qrCode} size={150} />
            </div>
          </div>
          <div className="flex items-center justify-center space-x-2.5 text-xs text-slate-300 font-medium">
            <QrCode className="h-4 w-4 text-emerald-400" />
            <span className="font-mono tracking-wider text-slate-200">{qrCode}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">Scan this household QR at any smart bin sensor to verify segregation</p>
        </div>

        {/* Disposal Simulator Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Recycle className="h-4.5 w-4.5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Segregation Simulator</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">Waste Category</label>
              <select 
                value={simulateCategory} 
                onChange={(e) => setSimulateCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold"
              >
                <option value="recyclable">Recyclable (Metal, Glass, Plastics) - High Points</option>
                <option value="biodegradable">Biodegradable (Kitchen scraps, leaves)</option>
                <option value="non-recyclable">Residual / Non-recyclable</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">Estimated Weight (kg)</label>
              <input 
                type="number" 
                step="0.1" 
                value={simulateWeight} 
                onChange={(e) => setSimulateWeight(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold"
              />
            </div>

            <button 
              onClick={handleSimulateDisposal}
              disabled={simulating}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/10"
            >
              <Zap className="h-3.5 w-3.5 fill-slate-950" />
              <span>{simulating ? 'Processing...' : 'Simulate Disposal Check-In'}</span>
            </button>
          </div>
        </div>

        {/* Barangay Leaderboard */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Trophy className="h-4.5 w-4.5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Barangay Leaderboard</h3>
          </div>

          <div className="space-y-3.5">
            {leaderboard.map((item, idx) => {
              const isMyBarangay = item.barangay === barangay;
              return (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    isMyBarangay 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-medium' 
                      : 'bg-slate-950/40 border-slate-850 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                      idx === 0 ? 'bg-amber-400 text-slate-950 shadow-md' :
                      idx === 1 ? 'bg-slate-300 text-slate-900' :
                      idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold">{item.barangay}</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">{item.active_households} active homes</p>
                    </div>
                  </div>
                  <span className="text-xs font-black tracking-wide">{item.total_points} pts</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction History list */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center space-x-2 mb-4 border-b border-slate-850 pb-3">
            <History className="h-4.5 w-4.5 text-slate-400" />
            <h3 className="text-sm font-bold text-white">Recent Points Activity</h3>
          </div>

          <div className="space-y-4">
            {transactions.map((tx) => {
              const isEarned = tx.transaction_type === 'EARNED_DISPOSAL';
              return (
                <div key={tx.id} className="flex justify-between items-center text-xs">
                  <div>
                    <h5 className="font-bold text-slate-200">
                      {isEarned 
                        ? `Segregated ${tx.details.waste_category}`
                        : `Redeemed ${tx.details.title}`}
                    </h5>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {isEarned && `${tx.details.weight_kg?.toFixed(1)} kg • `}
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`font-black text-xs ${isEarned ? 'text-emerald-400' : 'text-rose-400'}`}>
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
