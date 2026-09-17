import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Gift, Sparkles, X, Check, Clock } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface DailyRewardProps {
  onClaim: (amount: number) => void;
  onClose: () => void;
}

export default function DailyReward({ onClaim, onClose }: DailyRewardProps) {
  const REWARD_AMOUNT = 100;
  const [isClaimedToday, setIsClaimedToday] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const today = new Date().toDateString();
    const lastClaimed = localStorage.getItem('warmZone_lastClaimed');
    setIsClaimedToday(lastClaimed === today);

    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = Math.max(0, tomorrow.getTime() - now.getTime());

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClaimClick = () => {
    if (isClaimedToday) return;
    soundManager.playRewardSound();
    setIsClaimedToday(true);
    onClaim(REWARD_AMOUNT);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-neutral-900 border border-amber-500/30 p-8 rounded-3xl shadow-[0_0_40px_rgba(245,158,11,0.2)] w-full max-w-sm mx-4 flex flex-col items-center relative z-50 text-center"
    >
      <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
        <X className="w-5 h-5 text-white/70" />
      </button>

      <div className="relative mb-6">
        <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-20 rounded-full" />
        <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center relative shadow-lg">
          <Gift className="w-12 h-12 text-white" />
          <Sparkles className="w-6 h-6 text-yellow-200 absolute -top-2 -right-2 animate-pulse" />
        </div>
      </div>

      <h2 className="text-3xl font-black text-white mb-2">Daily Bonus</h2>
      <p className="text-neutral-400 text-sm mb-4">
        {isClaimedToday 
          ? "You have already claimed today's reward! (एक दिन में 1 रिवार्ड)" 
          : "Claim your daily free coins! Available once per day."}
      </p>

      <div className="bg-black/40 rounded-2xl p-4 w-full mb-6 border border-white/5 flex flex-col items-center">
        <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest block mb-1">Daily Reward</span>
        <div className="flex items-center gap-1.5">
          <span className="text-4xl font-mono font-bold text-amber-400">+{REWARD_AMOUNT}</span>
          <span className="text-amber-500/80 font-bold">Coins</span>
        </div>

        {isClaimedToday && (
          <div className="mt-3 pt-3 border-t border-white/10 w-full flex items-center justify-center gap-2 text-xs text-amber-300 font-mono font-semibold">
            <Clock className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Next Reward in: {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s</span>
          </div>
        )}
      </div>

      {isClaimedToday ? (
        <button 
          disabled
          className="w-full py-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl font-bold text-base flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <Check className="w-5 h-5 text-emerald-400" />
          Claimed Today (एक ही रिवार्ड प्रति दिन)
        </button>
      ) : (
        <button 
          onClick={handleClaimClick}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all transform hover:scale-105 active:scale-95"
        >
          Claim Reward
        </button>
      )}
    </motion.div>
  );
}
