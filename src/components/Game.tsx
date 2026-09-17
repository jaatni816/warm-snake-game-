import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, LeaderboardEntry } from '../game/engine';
import { Play, RotateCcw, Zap, Magnet, Trophy, Gift, LogOut, HelpCircle, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Shop, { AVAILABLE_SKINS } from './Shop';
import DailyReward from './DailyReward';
import HowToPlay from './HowToPlay';
import { soundManager } from '../utils/sound';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  
  const [status, setStatus] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activePowerups, setActivePowerups] = useState({ magnet: 0, doubleFood: 0, speed: 0 });

  // Meta-game state
  const [coins, setCoins] = useState(0);
  const [ownedSkins, setOwnedSkins] = useState<string[]>(['random', 'rainbow', 'black', 'white', 'yellow', 'green', 'red']);
  const [selectedSkin, setSelectedSkin] = useState('random');
  const [showShop, setShowShop] = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  // Load saved data
  useEffect(() => {
    const savedCoins = localStorage.getItem('warmZone_coins');
    if (savedCoins) setCoins(parseInt(savedCoins, 10));

    const savedSkins = localStorage.getItem('warmZone_skins');
    if (savedSkins) setOwnedSkins(JSON.parse(savedSkins));

    const savedSelected = localStorage.getItem('warmZone_selectedSkin');
    if (savedSelected) setSelectedSkin(savedSelected);

    const lastClaimed = localStorage.getItem('warmZone_lastClaimed');
    const today = new Date().toDateString();
    if (lastClaimed !== today) {
      setShowDaily(true);
    }
  }, []);

  // Save meta-game data
  useEffect(() => {
    localStorage.setItem('warmZone_coins', coins.toString());
    localStorage.setItem('warmZone_skins', JSON.stringify(ownedSkins));
    localStorage.setItem('warmZone_selectedSkin', selectedSkin);
  }, [coins, ownedSkins, selectedSkin]);

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    
    if (!engineRef.current) {
      engineRef.current = new GameEngine();
      engineRef.current.initAmbient();
      engineRef.current.onLeaderboardUpdate = (lb) => {
        setLeaderboard(lb);
      };
    }
    
    const handleResize = () => {
      if (canvasRef.current && engineRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        engineRef.current.viewportWidth = window.innerWidth;
        engineRef.current.viewportHeight = window.innerHeight;
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    let animationFrameId: number;
    let lastTime = performance.now();
    
    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      
      if (engineRef.current && canvasRef.current) {
         const safeDt = Math.min(dt, 0.1); 
         engineRef.current.update(safeDt);
         engineRef.current.draw(canvasRef.current.getContext('2d')!, canvasRef.current.width, canvasRef.current.height);
         
         if (status === 'playing') {
           const player = engineRef.current.worms.find(w => w.isPlayer);
           if (player) {
              setScore(Math.floor(player.score));
              setActivePowerups({ 
                magnet: player.powerups.magnet, 
                doubleFood: player.powerups.doubleFood, 
                speed: player.powerups.speed 
              });
           }
         }
      }
      
      animationFrameId = requestAnimationFrame(loop);
    };
    
    animationFrameId = requestAnimationFrame(loop);
    
    return () => {
       window.removeEventListener('resize', handleResize);
       cancelAnimationFrame(animationFrameId);
    };
  }, [status]);

  // Spacebar boost listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && engineRef.current && status === 'playing') {
        const player = engineRef.current.worms.find(w => w.isPlayer);
        if (player) {
          if (!player.isBoosting) soundManager.playBoostSound();
          player.isBoosting = true;
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && engineRef.current) {
        const player = engineRef.current.worms.find(w => w.isPlayer);
        if (player) player.isBoosting = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [status]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (engineRef.current && status === 'playing') {
      engineRef.current.mouseX = e.clientX;
      engineRef.current.mouseY = e.clientY;
    }
  }, [status]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (engineRef.current && status === 'playing' && e.touches[0]) {
      engineRef.current.mouseX = e.touches[0].clientX;
      engineRef.current.mouseY = e.touches[0].clientY;
    }
  }, [status]);

  const handleMouseDown = useCallback(() => {
    if (engineRef.current && status === 'playing') {
      const player = engineRef.current.worms.find(w => w.isPlayer);
      if (player) {
        if (!player.isBoosting) soundManager.playBoostSound();
        player.isBoosting = true;
      }
    }
  }, [status]);

  const handleMouseUp = useCallback(() => {
    if (engineRef.current) {
      const player = engineRef.current.worms.find(w => w.isPlayer);
      if (player) player.isBoosting = false;
    }
  }, []);
  
  const startGame = () => {
    soundManager.initContext();
    soundManager.startMusic();

    if (engineRef.current) {
      // Automatically pick a random color & skin for the snake every time!
      const playableSkins = AVAILABLE_SKINS.filter(s => s.id !== 'random');
      const pickedSkin = playableSkins[Math.floor(Math.random() * playableSkins.length)];
      const randomHue = Math.floor(Math.random() * 360);

      engineRef.current.spawnPlayer('Player', pickedSkin.hue || randomHue, pickedSkin.id);
      engineRef.current.onGameOver = (finalScore) => {
         setStatus('gameover');
         setCoins(c => c + Math.floor(finalScore / 10));
      };
      engineRef.current.onLeaderboardUpdate = (lb) => {
         setLeaderboard(lb);
       };
      engineRef.current.viewportWidth = window.innerWidth;
      engineRef.current.viewportHeight = window.innerHeight;
    }
    setStatus('playing');
  };

  const handleClaimDaily = (amount: number) => {
    setCoins(c => c + amount);
    localStorage.setItem('warmZone_lastClaimed', new Date().toDateString());
    setShowDaily(false);
  };

  const handleBuySkin = (skinId: string, price: number) => {
    if (coins >= price && !ownedSkins.includes(skinId)) {
      setCoins(c => c - price);
      setOwnedSkins(prev => [...prev, skinId]);
      setSelectedSkin(skinId);
      soundManager.playRewardSound();
    }
  };

  const handleWatchAd = () => {
    setTimeout(() => {
      setCoins(c => c + 50);
      soundManager.playRewardSound();
    }, 500);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans text-neutral-100 selection:bg-rose-500/30">
      
      {/* Top Corner Audio Control Button */}
      <div className="absolute top-5 left-5 z-50 pointer-events-auto">
        <button
          onClick={handleToggleSound}
          className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all shadow-xl active:scale-95"
          title="Toggle Music & Sound Effects"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-rose-400" />
              <span className="text-neutral-400">Sound OFF</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-semibold">Sound ON 🎵</span>
            </>
          )}
        </button>
      </div>

      {/* Game Canvas */}
      <canvas 
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        className="block w-full h-full cursor-crosshair touch-none"
      />
      
      {/* HUD (Heads Up Display) */}
      <AnimatePresence>
        {status === 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Score */}
            <div className="absolute top-16 left-5 flex flex-col">
              <span className="text-xs text-neutral-400 font-medium tracking-widest uppercase mb-0.5 drop-shadow-md">Score</span>
              <span className="text-4xl font-bold font-mono text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                {score}
              </span>
              <span className="text-xs text-amber-400/80 font-medium mt-1">Hold click / Space for Boost ⚡</span>
            </div>

            {/* Leaderboard */}
            <div className="absolute top-5 right-5 w-60 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-3.5 shadow-2xl">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10 text-neutral-300">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Top Snakes</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {leaderboard.map((entry, idx) => (
                  <div key={entry.id} className={`flex items-center justify-between text-xs ${entry.isPlayer ? 'font-bold text-white bg-white/10 -mx-1.5 px-2 py-1 rounded-md' : 'text-neutral-400'}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="opacity-50 font-mono w-3">{idx + 1}.</span>
                      <span className="truncate max-w-[110px]" style={{ color: entry.isPlayer ? '#fff' : `hsl(${entry.colorHue}, 80%, 70%)` }}>
                        {entry.name}
                      </span>
                    </div>
                    <span className="font-mono">{entry.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Powerups */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
              {activePowerups.speed > 0 && (
                <div className="flex items-center gap-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 px-4 py-2 rounded-full backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-bold font-mono">{(activePowerups.speed / 1000).toFixed(1)}s</span>
                </div>
              )}
              {activePowerups.magnet > 0 && (
                <div className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 text-purple-400 px-4 py-2 rounded-full backdrop-blur-md shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                  <Magnet className="w-4 h-4" />
                  <span className="text-sm font-bold font-mono">{(activePowerups.magnet / 1000).toFixed(1)}s</span>
                </div>
              )}
              {activePowerups.doubleFood > 0 && (
                <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/50 text-amber-400 px-4 py-2 rounded-full backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <span className="font-bold text-lg leading-none">2x</span>
                  <span className="text-sm font-bold font-mono">{(activePowerups.doubleFood / 1000).toFixed(1)}s</span>
                </div>
              )}
            </div>

            {/* Bottom Right HUD Controls (Menu + Boost) */}
            <div className="absolute bottom-6 right-6 pointer-events-auto flex items-center gap-3">
              <button
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
                className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 active:scale-95 text-white font-black px-5 py-3 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-2 text-sm uppercase tracking-wider select-none border border-amber-300/30 transition-transform"
              >
                <Zap className="w-5 h-5 fill-current animate-pulse" />
                <span>BOOST</span>
              </button>

              <button
                onClick={() => setStatus('idle')}
                className="bg-neutral-900/80 hover:bg-neutral-800 text-white/70 hover:text-white border border-white/10 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 backdrop-blur-md transition-colors shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                Menu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Menu / Game Over Overlay */}
      <AnimatePresence>
        {status !== 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-neutral-900 border border-white/10 p-7 rounded-3xl shadow-2xl w-full max-w-md mx-4 flex flex-col items-center relative">
                
                {/* Coins Display in Menu */}
                <div className="absolute -top-4 right-4 bg-amber-500/20 border border-amber-500/40 text-amber-400 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-md">
                   <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center font-black text-[10px] text-amber-900">C</div>
                   <span className="font-bold font-mono">{coins}</span>
                </div>

                {status === 'idle' ? (
                  <>
                    <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl rotate-12 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(244,63,94,0.4)]">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center -rotate-12">
                        <div className="w-6 h-6 bg-rose-500 rounded-full flex gap-1 items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                    <h1 className="text-4xl font-black text-white mb-1 tracking-tight">Warm Zone</h1>
                    <p className="text-neutral-400 mb-5 text-center text-sm">Eat dots, grow big, defeat other snakes!</p>

                    <div className="grid grid-cols-2 gap-3 w-full mb-6">
                      <button 
                         onClick={() => setShowDaily(true)}
                        className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors relative"
                      >
                        <Gift className="w-4 h-4 text-amber-400" /> Daily Rewards
                      </button>
                      <button 
                         onClick={() => setShowHowToPlay(true)}
                        className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <HelpCircle className="w-4 h-4 text-cyan-400" /> How to Play
                      </button>
                    </div>
                    
                    <button 
                      onClick={startGame}
                      className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-[0_0_20px_rgba(225,29,72,0.3)] active:scale-98"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Play Now
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Game Over</h2>
                    <div className="flex flex-col items-center justify-center bg-black/30 rounded-2xl w-full py-6 mb-8 border border-white/5">
                      <span className="text-sm text-neutral-500 font-medium uppercase tracking-widest mb-1">Final Score</span>
                      <span className="text-5xl font-bold font-mono text-rose-400 drop-shadow-md">{score}</span>
                      <span className="text-sm text-amber-400 mt-2 font-bold flex items-center gap-1">+ {Math.floor(score / 10)} Coins</span>
                    </div>
                    
                    <button 
                      onClick={startGame}
                      className="w-full py-4 bg-white hover:bg-neutral-200 text-black rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-colors mb-4"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Play Again
                    </button>

                    <button 
                        onClick={() => { setStatus('idle'); }}
                        className="w-full py-3 bg-transparent hover:bg-white/5 border border-white/10 rounded-xl text-neutral-400 font-bold transition-colors"
                      >
                        Main Menu
                    </button>
                  </>
                )}
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showShop && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <Shop 
              coins={coins} 
              ownedSkins={ownedSkins} 
              selectedSkin={selectedSkin} 
              onClose={() => setShowShop(false)} 
              onBuySkin={handleBuySkin}
              onSelectSkin={setSelectedSkin}
              onWatchAd={handleWatchAd}
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDaily && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
             <DailyReward 
               onClaim={handleClaimDaily} 
               onClose={() => setShowDaily(false)} 
             />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHowToPlay && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
             <HowToPlay onClose={() => setShowHowToPlay(false)} />
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
