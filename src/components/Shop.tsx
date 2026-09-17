import React from 'react';
import { motion } from 'motion/react';
import { X, Lock, Check, Coins, Palette } from 'lucide-react';

export type Skin = {
  id: string;
  name: string;
  hue: number;
  price: number;
};

export const AVAILABLE_SKINS: Skin[] = [
  { id: 'random', name: '🎲 Random Color Each Game', hue: 270, price: 0 },
  { id: 'rainbow', name: '🌈 Multi-Color Rainbow', hue: 300, price: 0 },
  { id: 'black', name: '🐍 Black Mamba', hue: 220, price: 0 },
  { id: 'white', name: '⚪ Albino White Python', hue: 0, price: 50 },
  { id: 'yellow', name: '💛 Sun Yellow Python', hue: 50, price: 50 },
  { id: 'green', name: '🟢 Emerald Green', hue: 140, price: 100 },
  { id: 'red', name: '🔴 Ruby Viper', hue: 350, price: 100 },
  { id: 'blue', name: '🔵 Ocean Cobra', hue: 210, price: 150 },
  { id: 'orange', name: '🟠 Rattlesnake Orange', hue: 25, price: 150 },
  { id: 'purple', name: '🟣 Amethyst Boa', hue: 280, price: 200 },
  { id: 'gold', name: '👑 Golden Royal Mamba', hue: 45, price: 300 },
];

interface ShopProps {
  coins: number;
  ownedSkins: string[];
  selectedSkin: string;
  onClose: () => void;
  onBuySkin: (skinId: string, price: number) => void;
  onSelectSkin: (skinId: string) => void;
  onWatchAd: () => void;
}

export default function Shop({ coins, ownedSkins, selectedSkin, onClose, onBuySkin, onSelectSkin, onWatchAd }: ShopProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-neutral-900 border border-white/10 p-6 rounded-3xl shadow-2xl w-full max-w-lg mx-4 flex flex-col items-center relative z-50 overflow-hidden"
    >
      <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
        <X className="w-5 h-5 text-white/70" />
      </button>

      <div className="flex items-center gap-3 mb-6">
        <Palette className="w-6 h-6 text-rose-500" />
        <h2 className="text-2xl font-black text-white">Snake Colors & Skins</h2>
        <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full border border-amber-500/30 ml-auto">
          <Coins className="w-4 h-4" />
          <span className="font-bold">{coins}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mb-6 max-h-[50vh] overflow-y-auto pr-1">
        {AVAILABLE_SKINS.map((skin) => {
          const isOwned = ownedSkins.includes(skin.id);
          const isSelected = selectedSkin === skin.id;

          return (
            <div 
              key={skin.id}
              onClick={() => {
                if (isOwned) onSelectSkin(skin.id);
                else if (coins >= skin.price) onBuySkin(skin.id, skin.price);
              }}
              className={`relative p-3 rounded-2xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                isSelected ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 
                isOwned ? 'border-white/20 bg-white/5 hover:bg-white/10' : 
                coins >= skin.price ? 'border-green-500/50 bg-green-500/10 hover:bg-green-500/20' : 
                'border-white/5 bg-white/5 opacity-75'
              }`}
            >
              <div 
                className="w-12 h-12 rounded-full border-2 border-white/30 shadow-lg relative flex items-center justify-center overflow-hidden"
                style={{ 
                  background: skin.id === 'random' ? 'linear-gradient(135deg, #f43f5e, #3b82f6, #10b981, #eab308)' :
                              skin.id === 'rainbow' ? 'linear-gradient(90deg, #ef4444, #eab308, #22c55e, #06b6d4, #a855f7)' :
                              skin.id === 'black' ? '#1e293b' :
                              skin.id === 'white' ? '#f8fafc' :
                              skin.id === 'yellow' ? '#eab308' :
                              `hsl(${skin.hue}, 85%, 55%)`
                }}
              >
                <div className="w-3 h-3 bg-white/40 rounded-full absolute top-2 left-2 pointer-events-none" />
              </div>
              <span className="text-xs font-bold text-center text-white/90 truncate w-full">{skin.name}</span>
              
              {isOwned ? (
                isSelected ? (
                  <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <Check className="w-3 h-3"/> Selected
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-400 font-medium">Owned</span>
                )
              ) : (
                <span className={`text-[11px] flex items-center gap-1 font-bold ${coins >= skin.price ? 'text-green-400' : 'text-rose-400'}`}>
                  {coins < skin.price && <Lock className="w-3 h-3" />}
                  <Coins className="w-3 h-3" />
                  {skin.price}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="w-full bg-black/40 rounded-xl p-4 flex items-center justify-between border border-white/5">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white">Need more coins?</span>
          <span className="text-xs text-neutral-400">Watch a short video to get +50 Coins</span>
        </div>
        <button 
          onClick={onWatchAd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-colors"
        >
          Watch Ad (+50)
        </button>
      </div>
    </motion.div>
  );
}
