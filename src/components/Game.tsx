import React, { useEffect, useRef, useState } from 'react';
import { Car } from '../game/Car';
import { PoliceAI } from '../game/PoliceAI';
import { GameMap } from '../game/Map';
import { PLAYER_CONFIG, POLICE_CONFIG, COLORS, WORLD_SIZE, INITIAL_LIVES, POLICE_SPAWN_RATE, HEART_SPAWN_RATE, MAX_POLICE } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { Siren, Play, Settings, Heart, Zap } from 'lucide-react';

export const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [speed, setSpeed] = useState(0);
  const [nitro, setNitro] = useState(100);
  const [score, setScore] = useState(0);
  
  const gameRef = useRef<{
    player: Car;
    police: PoliceAI[];
    map: GameMap;
    keys: { [key: string]: boolean };
    hearts: { x: number; y: number }[];
    spikes: { x: number; y: number; angle: number }[];
    lastPoliceSpawn: number;
    lastHeartSpawn: number;
    collisionCooldown: number;
  } | null>(null);

  const initGame = () => {
    const player = new Car(WORLD_SIZE.width / 2, WORLD_SIZE.height / 2, PLAYER_CONFIG, 'player');
    const map = new GameMap();
    const police: PoliceAI[] = [];
    
    for (let i = 0; i < 3; i++) {
      police.push(new PoliceAI(
        WORLD_SIZE.width / 2 - 1500 + Math.random() * 3000,
        WORLD_SIZE.height / 2 - 1500 + Math.random() * 3000,
        POLICE_CONFIG
      ));
    }

    gameRef.current = {
      player,
      police,
      map,
      keys: {},
      hearts: [],
      spikes: [],
      lastPoliceSpawn: Date.now(),
      lastHeartSpawn: Date.now(),
      collisionCooldown: 0
    };
    setLives(INITIAL_LIVES);
    setScore(0);
    setGameState('playing');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameRef.current) gameRef.current.keys[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameRef.current) gameRef.current.keys[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const loop = (time: number) => {
      if (!gameRef.current) return;
      const { player, police, map, keys, hearts, spikes, lastPoliceSpawn, lastHeartSpawn, collisionCooldown } = gameRef.current;

      // Update
      player.update({
        forward: keys['ArrowUp'] || keys['KeyW'],
        backward: keys['ArrowDown'] || keys['KeyS'],
        left: keys['ArrowLeft'] || keys['KeyA'],
        right: keys['ArrowRight'] || keys['KeyD'],
        nitro: keys['Space'],
        drift: keys['ShiftLeft'] || keys['ShiftRight']
      });

      police.forEach(p => p.updateAI(player));

      // Spawn Police
      if (Date.now() - lastPoliceSpawn > POLICE_SPAWN_RATE && police.length < MAX_POLICE) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 1500;
        police.push(new PoliceAI(
          player.pos.x + Math.cos(angle) * dist,
          player.pos.y + Math.sin(angle) * dist,
          POLICE_CONFIG
        ));
        gameRef.current.lastPoliceSpawn = Date.now();
      }

      // Spawn Hearts
      if (Date.now() - lastHeartSpawn > HEART_SPAWN_RATE) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 800 + Math.random() * 1000;
        hearts.push({
          x: player.pos.x + Math.cos(angle) * dist,
          y: player.pos.y + Math.sin(angle) * dist
        });
        gameRef.current.lastHeartSpawn = Date.now();
      }

      // Police Tactics: Drop Spikes
      police.forEach(p => {
        if (Math.random() < 0.001 && Math.hypot(p.pos.x - player.pos.x, p.pos.y - player.pos.y) < 500) {
          spikes.push({ x: p.pos.x, y: p.pos.y, angle: p.angle });
        }
      });

      // Collision detection
      let collisionOccurred = false;
      if (collisionCooldown <= 0) {
        police.forEach(p => {
          const dist = Math.hypot(p.pos.x - player.pos.x, p.pos.y - player.pos.y);
          if (dist < 40) {
            setLives(prev => {
              const next = prev - 1;
              if (next <= 0) setGameState('gameover');
              return next;
            });
            collisionOccurred = true;
            gameRef.current!.collisionCooldown = 60; // 1 second cooldown
            
            // Knockback
            const angle = Math.atan2(player.pos.y - p.pos.y, player.pos.x - p.pos.x);
            player.vel.x += Math.cos(angle) * 10;
            player.vel.y += Math.sin(angle) * 10;
            player.speed *= 0.5;
          }
        });

        // Spike collisions (Carpet/Strip)
        for (let i = spikes.length - 1; i >= 0; i--) {
          const s = spikes[i];
          // Check collision at multiple points along the strip (length 80)
          let hit = false;
          for (let offset = -40; offset <= 40; offset += 20) {
            const px = s.x + Math.cos(s.angle + Math.PI/2) * offset;
            const py = s.y + Math.sin(s.angle + Math.PI/2) * offset;
            if (Math.hypot(px - player.pos.x, py - player.pos.y) < 30) {
              hit = true;
              break;
            }
          }
          
          if (hit) {
            setLives(prev => {
              const next = prev - 1;
              if (next <= 0) setGameState('gameover');
              return next;
            });
            spikes.splice(i, 1);
            gameRef.current!.collisionCooldown = 60;
            player.speed *= 0.2; // Massive slowdown
          }
        }
      } else {
        gameRef.current.collisionCooldown--;
      }

      // Heart collection
      for (let i = hearts.length - 1; i >= 0; i--) {
        const h = hearts[i];
        const dist = Math.hypot(h.x - player.pos.x, h.y - player.pos.y);
        if (dist < 40) {
          setLives(prev => Math.min(INITIAL_LIVES, prev + 1));
          hearts.splice(i, 1);
        }
      }

      // Update UI states
      setSpeed(Math.round(Math.abs(player.speed) * 20));
      setNitro(player.nitro);
      setScore(prev => prev + Math.abs(player.speed) * 0.1);

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const shakeX = collisionOccurred ? (Math.random() - 0.5) * 40 : 0;
      const shakeY = collisionOccurred ? (Math.random() - 0.5) * 40 : 0;

      const viewport = {
        x: player.pos.x - canvas.width / 2 + shakeX,
        y: player.pos.y - canvas.height / 2 + shakeY,
        width: canvas.width,
        height: canvas.height
      };

      // Draw Background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
      ctx.lineWidth = 1;
      for(let x = -viewport.x % 100; x < canvas.width; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for(let y = -viewport.y % 100; y < canvas.height; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      map.draw(ctx, viewport);

      // Draw Spikes (Carpet/Strip)
      spikes.forEach(s => {
        ctx.save();
        ctx.translate(s.x - viewport.x, s.y - viewport.y);
        ctx.rotate(s.angle + Math.PI/2);
        
        // Draw the "carpet" base
        ctx.fillStyle = '#222';
        ctx.fillRect(-40, -5, 80, 10);
        
        // Draw individual spikes along the strip
        ctx.fillStyle = '#666';
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        for (let x = -35; x <= 35; x += 10) {
          ctx.beginPath();
          ctx.moveTo(x, -5);
          ctx.lineTo(x + 5, 5);
          ctx.lineTo(x - 5, 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        
        ctx.restore();
      });

      // Draw Hearts
      hearts.forEach(h => {
        ctx.save();
        ctx.translate(h.x - viewport.x, h.y - viewport.y);
        ctx.fillStyle = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.bezierCurveTo(-20, -10, -10, -20, 0, -5);
        ctx.bezierCurveTo(10, -20, 20, -10, 0, 10);
        ctx.fill();
        ctx.restore();
      });

      // Draw Police
      police.forEach(p => {
        ctx.save();
        ctx.translate(p.pos.x - viewport.x, p.pos.y - viewport.y);
        
        // Siren Halo Effect
        const isRed = Math.floor(time / 100) % 2 === 0;
        const sirenColor = isRed ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 0, 255, 0.2)';
        const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 80);
        gradient.addColorStop(0, sirenColor);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 80, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(p.angle);
        
        // Car Body
        ctx.fillStyle = '#111';
        ctx.fillRect(-20, -10, 40, 20);
        ctx.strokeStyle = COLORS.policeBlue;
        ctx.lineWidth = 2;
        ctx.strokeRect(-20, -10, 40, 20);
        
        // Prominent Sirens
        if (isRed) {
          // Red Flash
          ctx.shadowBlur = 15;
          ctx.shadowColor = COLORS.policeRed;
          ctx.fillStyle = COLORS.policeRed;
          ctx.fillRect(0, -10, 15, 8);
          
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
          ctx.fillRect(-15, -10, 15, 8);
        } else {
          // Blue Flash
          ctx.shadowBlur = 15;
          ctx.shadowColor = COLORS.policeBlue;
          ctx.fillStyle = COLORS.policeBlue;
          ctx.fillRect(-15, -10, 15, 8);
          
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
          ctx.fillRect(0, -10, 15, 8);
        }
        
        ctx.restore();
      });

      // Draw Player
      ctx.save();
      ctx.translate(player.pos.x - viewport.x, player.pos.y - viewport.y);
      ctx.rotate(player.angle);
      
      if (player.isNitroActive) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = COLORS.neonBlue;
        ctx.fillStyle = COLORS.neonBlue;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-40 - Math.random() * 20, 0);
        ctx.stroke();
      }

      ctx.fillStyle = '#000';
      ctx.fillRect(-20, -10, 40, 20);
      ctx.strokeStyle = collisionCooldown > 0 ? '#fff' : COLORS.neonPink;
      ctx.lineWidth = 2;
      ctx.strokeRect(-20, -10, 40, 20);
      ctx.fillStyle = '#fff';
      ctx.fillRect(15, -8, 5, 4);
      ctx.fillRect(15, 4, 5, 4);
      ctx.restore();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans text-white">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="block w-full h-full"
      />

      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-4">
              <div className="bg-black/60 backdrop-blur-md border border-cyan-500/30 p-4 rounded-xl">
                <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 mb-1">Lives</div>
                <div className="flex gap-2">
                  {[...Array(INITIAL_LIVES)].map((_, i) => (
                    <Heart key={i} size={20} className={i < lives ? "text-red-500 fill-red-500" : "text-gray-800"} />
                  ))}
                </div>
              </div>
              <div className="bg-black/60 backdrop-blur-md border border-cyan-500/30 p-4 rounded-xl">
                <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 mb-1">Score</div>
                <div className="text-xl font-mono">{Math.floor(score)}</div>
              </div>
            </div>

            <div className="flex flex-col gap-4 items-end">
              <div className="bg-black/60 backdrop-blur-md border border-red-500/30 p-4 rounded-xl flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-red-400 mb-1">Police Active</div>
                  <div className="text-xl font-mono text-white">{gameRef.current?.police.length || 0}</div>
                </div>
                <Siren className="text-red-500 animate-pulse" size={24} />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div className="w-72">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-400">Nitro Boost</span>
                <span className="text-xs font-mono">{Math.round(nitro)}%</span>
              </div>
              <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                  animate={{ width: `${nitro}%` }}
                />
              </div>
            </div>

            <div className="text-right">
              <div className="text-8xl font-black italic tracking-tighter leading-none">
                {speed}
                <span className="text-xl not-italic font-medium text-gray-500 ml-2 uppercase tracking-widest">KM/H</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menus */}
      <AnimatePresence>
        {gameState === 'menu' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center z-50"
          >
            <div className="absolute inset-0 overflow-hidden opacity-20">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/20 rounded-full blur-[120px]" />
              <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-pink-500/20 rounded-full blur-[100px]" />
            </div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative text-center"
            >
              <h1 className="text-[12vw] font-black italic tracking-tighter leading-none mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
                MISPEED
              </h1>
              <div className="text-cyan-400 uppercase tracking-[0.5em] text-sm mb-16 font-bold">High Speed Pursuit</div>
            </motion.div>

            <div className="flex flex-col gap-4 w-72 relative">
              <MenuButton icon={<Play size={20} />} label="Start Pursuit" onClick={initGame} primary />
            </div>

            <div className="mt-20 flex gap-8 text-gray-500 text-[10px] uppercase tracking-[0.3em]">
              <span>WASD to Drive</span>
              <span>Space for Nitro</span>
              <span>Shift to Drift</span>
            </div>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-red-900/40 backdrop-blur-2xl flex flex-col items-center justify-center z-50"
          >
            <h2 className="text-7xl font-black italic mb-4 text-white">BUSTED</h2>
            <p className="text-xl text-red-200 mb-2 uppercase tracking-widest">Final Score: {Math.floor(score)}</p>
            <p className="text-sm text-red-300/60 mb-12 uppercase tracking-widest">You couldn't handle the heat</p>
            <MenuButton icon={<Play size={20} />} label="Try Again" onClick={initGame} primary />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MenuButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }> = ({ icon, label, onClick, primary }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center justify-center gap-4 px-8 py-5 rounded-2xl transition-all duration-300 group relative overflow-hidden
      ${primary 
        ? 'bg-white text-black hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]' 
        : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}
    `}
  >
    <span className="relative z-10 font-black uppercase tracking-[0.2em] text-xs">{label}</span>
    <span className="relative z-10 opacity-50 group-hover:opacity-100 transition-opacity">{icon}</span>
  </button>
);
