import { soundManager } from '../utils/sound';

export type Point = { x: number; y: number };

export type Segment = Point;

export type PowerupType = 'magnet' | 'doubleFood' | 'speed';

export type Powerup = Point & {
  id: string;
  type: PowerupType;
};

export type Food = Point & {
  id: string;
  value: number;
  color: string;
};

export type Particle = Point & {
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
};

export type Worm = {
  id: string;
  isPlayer: boolean;
  name: string;
  segments: Segment[];
  colorHue: number;
  skinId?: string;
  score: number;
  targetAngle: number;
  currentAngle: number;
  dead: boolean;
  isBoosting?: boolean;
  powerups: {
    magnet: number;
    doubleFood: number;
    speed: number;
  };
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  isPlayer: boolean;
  colorHue: number;
};

export const WORLD_SIZE = 4000;
export const INITIAL_RADIUS = 15;
export const BASE_SPEED = 200;
export const TURN_SPEED = 4;
export const MAX_FOODS = 800;
export const MAX_POWERUPS = 15;
export const BOT_COUNT = 20;
export const POWERUP_DURATION = 10000;

const BOT_NAMES = ['Snek', 'Slither', 'Goliath', 'Titan', 'Nibbler', 'Crusher', 'Python', 'Mamba', 'Viper', 'Cobra', 'Wormy', 'Noodle', 'String', 'LongBoi', 'Glider'];

export class GameEngine {
  worms: Worm[] = [];
  foods: Food[] = [];
  powerups: Powerup[] = [];
  particles: Particle[] = [];
  camera: Point = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
  foodIdCounter = 0;
  leaderboardTimer = 0;

  onGameOver?: (score: number) => void;
  onLeaderboardUpdate?: (lb: LeaderboardEntry[]) => void;

  mouseX: number = 0;
  mouseY: number = 0;
  viewportWidth: number = 1000;
  viewportHeight: number = 1000;

  initAmbient() {
    this.worms = [];
    this.foods = [];
    this.powerups = [];
    this.particles = [];
    this.foodIdCounter = 0;

    const botSkins = ['red', 'blue', 'green', 'purple', 'gold'];
    for (let i = 0; i < BOT_COUNT; i++) {
      const bSkinId = botSkins[Math.floor(Math.random() * botSkins.length)];
      const bHue = bSkinId === 'red' ? 350 : bSkinId === 'blue' ? 210 : bSkinId === 'green' ? 140 : bSkinId === 'purple' ? 280 : 45;
      this.worms.push(this.createWorm(`bot_${i}`, false, BOT_NAMES[i % BOT_NAMES.length], Math.random() * WORLD_SIZE, Math.random() * WORLD_SIZE, bHue, bSkinId));
    }

    this.generateFoods(MAX_FOODS);
    this.generatePowerups(MAX_POWERUPS);
  }

  spawnPlayer(playerName: string, skinHue?: number, skinId?: string) {
    this.worms = this.worms.filter(w => !w.isPlayer);
    const playerWorm = this.createWorm('player', true, playerName || 'Player', WORLD_SIZE / 2, WORLD_SIZE / 2, skinHue, skinId);
    this.worms.push(playerWorm);
    this.camera.x = WORLD_SIZE / 2;
    this.camera.y = WORLD_SIZE / 2;
  }

  init(playerName: string, skinHue?: number, skinId?: string) {
    this.initAmbient();
    this.spawnPlayer(playerName, skinHue, skinId);
  }

  createWorm(id: string, isPlayer: boolean, name: string, x: number, y: number, hue?: number, skinId?: string): Worm {
    const segments = [];
    for (let i = 0; i < 5; i++) {
      segments.push({ x: x - i * 5, y: y });
    }
    return {
      id,
      isPlayer,
      name,
      segments,
      colorHue: hue !== undefined ? hue : Math.floor(Math.random() * 360),
      skinId: skinId || (hue !== undefined ? undefined : 'red'),
      score: 100,
      targetAngle: 0,
      currentAngle: 0,
      dead: false,
      powerups: {
        magnet: 0,
        doubleFood: 0,
        speed: 0,
      },
    };
  }

  generateFoods(count: number) {
    for (let i = 0; i < count; i++) {
      this.foods.push({
        id: `f_${this.foodIdCounter++}`,
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE,
        value: 5 + Math.random() * 10,
        color: `hsl(${Math.random() * 360}, 100%, 65%)`,
      });
    }
  }

  generatePowerups(count: number) {
    const types: PowerupType[] = ['magnet', 'doubleFood', 'speed'];
    for (let i = 0; i < count; i++) {
      this.powerups.push({
        id: `p_${this.foodIdCounter++}`,
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE,
        type: types[Math.floor(Math.random() * types.length)],
      });
    }
  }

  dropFood(worm: Worm) {
    for (let i = 0; i < worm.segments.length; i += 2) {
      const seg = worm.segments[i];
      this.foods.push({
        id: `df_${this.foodIdCounter++}`,
        x: seg.x + (Math.random() * 40 - 20),
        y: seg.y + (Math.random() * 40 - 20),
        value: Math.max(10, (worm.score / worm.segments.length) * 1.5),
        color: `hsl(${worm.colorHue}, 100%, 70%)`,
      });
    }
  }

  getRadius(score: number) {
    return INITIAL_RADIUS + Math.sqrt(score) * 0.45;
  }

  getDesiredLength(score: number) {
    return 22 + Math.floor(score / 8);
  }

  update(dt: number) {
    const player = this.worms.find((w) => w.isPlayer);

    if (player && !player.dead) {
      const dx = this.mouseX - this.viewportWidth / 2;
      const dy = this.mouseY - this.viewportHeight / 2;
      player.targetAngle = Math.atan2(dy, dx);

      const head = player.segments[0];
      this.camera.x += (head.x - this.camera.x) * 5 * dt;
      this.camera.y += (head.y - this.camera.y) * 5 * dt;
      
      // keep camera in bounds
      this.camera.x = Math.max(this.viewportWidth/2, Math.min(WORLD_SIZE - this.viewportWidth/2, this.camera.x));
      this.camera.y = Math.max(this.viewportHeight/2, Math.min(WORLD_SIZE - this.viewportHeight/2, this.camera.y));
    } else {
      // Ambient camera tracking active bot snakes
      const topBot = this.worms.filter(w => !w.dead)[0];
      if (topBot && topBot.segments.length > 0) {
        const head = topBot.segments[0];
        this.camera.x += (head.x - this.camera.x) * 2 * dt;
        this.camera.y += (head.y - this.camera.y) * 2 * dt;
        this.camera.x = Math.max(this.viewportWidth/2, Math.min(WORLD_SIZE - this.viewportWidth/2, this.camera.x));
        this.camera.y = Math.max(this.viewportHeight/2, Math.min(WORLD_SIZE - this.viewportHeight/2, this.camera.y));
      }
    }

    while (this.worms.length < BOT_COUNT + (player && !player.dead ? 1 : 0)) {
      this.worms.push(
        this.createWorm(
          `bot_${Math.random()}`,
          false,
          BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
          Math.random() * WORLD_SIZE,
          Math.random() * WORLD_SIZE
        )
      );
    }

    if (this.foods.length < MAX_FOODS / 2) {
      this.generateFoods(MAX_FOODS - this.foods.length);
    }
    
    if (Math.random() < 0.05 && this.powerups.length < MAX_POWERUPS) {
      this.generatePowerups(1);
    }

    for (let i = 0; i < this.worms.length; i++) {
      const worm = this.worms[i];
      if (worm.dead) continue;

      if (worm.powerups.magnet > 0) worm.powerups.magnet -= dt * 1000;
      if (worm.powerups.doubleFood > 0) worm.powerups.doubleFood -= dt * 1000;
      if (worm.powerups.speed > 0) worm.powerups.speed -= dt * 1000;

      if (!worm.isPlayer) {
        this.updateBotAI(worm, dt);
      }

      let diff = worm.targetAngle - worm.currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const turnAmt = TURN_SPEED * dt;
      if (Math.abs(diff) < turnAmt) {
        worm.currentAngle = worm.targetAngle;
      } else {
        worm.currentAngle += Math.sign(diff) * turnAmt;
      }

      const isBoosting = worm.isBoosting || worm.powerups.speed > 0;
      const speedMultiplier = isBoosting ? 1.8 : 1;
      const currentSpeed = BASE_SPEED * speedMultiplier;

      const head = worm.segments[0];
      const newX = head.x + Math.cos(worm.currentAngle) * currentSpeed * dt;
      const newY = head.y + Math.sin(worm.currentAngle) * currentSpeed * dt;

      if (newX < 0 || newX > WORLD_SIZE || newY < 0 || newY > WORLD_SIZE) {
        worm.dead = true;
        this.dropFood(worm);
        if (worm.isPlayer) this.onGameOver?.(worm.score);
        continue;
      }

      const radius = this.getRadius(worm.score);
      worm.segments.unshift({ x: newX, y: newY });

      const desiredLength = this.getDesiredLength(worm.score);
      while (worm.segments.length > desiredLength) {
        worm.segments.pop();
      }

      for (let j = 1; j < worm.segments.length; j++) {
        const prev = worm.segments[j - 1];
        const curr = worm.segments[j];
        const segDx = prev.x - curr.x;
        const segDy = prev.y - curr.y;
        const dist = Math.hypot(segDx, segDy);
        const desiredDist = radius * 0.22;
        if (dist > desiredDist && dist > 0.001) {
          curr.x = prev.x - (segDx / dist) * desiredDist;
          curr.y = prev.y - (segDy / dist) * desiredDist;
        }
      }
    }

    this.checkCollisions(dt);

    // Replenish foods continuously
    if (this.foods.length < MAX_FOODS) {
      this.generateFoods(MAX_FOODS - this.foods.length);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.worms = this.worms.filter((w) => !w.dead);

    this.leaderboardTimer += dt;
    if (this.leaderboardTimer > 0.5) {
      this.leaderboardTimer = 0;
      this.updateLeaderboard();
    }
  }

  updateBotAI(worm: Worm, dt: number) {
    const head = worm.segments[0];

    if (Math.random() < 0.015) {
      worm.targetAngle += (Math.random() - 0.5) * Math.PI * 0.4;
    }

    const margin = 200;
    if (head.x < margin) worm.targetAngle = 0;
    else if (head.x > WORLD_SIZE - margin) worm.targetAngle = Math.PI;
    else if (head.y < margin) worm.targetAngle = Math.PI / 2;
    else if (head.y > WORLD_SIZE - margin) worm.targetAngle = -Math.PI / 2;

    // Search for nearest food dot in a wider radius
    let nearestFood = null;
    let minFoodDist = 600;
    for (const f of this.foods) {
      const d = Math.hypot(head.x - f.x, head.y - f.y);
      if (d < minFoodDist) {
        minFoodDist = d;
        nearestFood = f;
      }
    }

    if (nearestFood) {
      // Steer towards food
      worm.targetAngle = Math.atan2(nearestFood.y - head.y, nearestFood.x - head.x);
      
      // Bots occasionally boost speed to get food first
      if (worm.score > 150 && Math.random() < 0.004 && worm.powerups.speed <= 0) {
        worm.powerups.speed = 1500;
      }
    }

    // Avoid colliding with other snakes' bodies
    for (const w2 of this.worms) {
      if (w2 === worm || w2.dead) continue;
      
      const r2 = this.getRadius(w2.score);
      const avoidDist = r2 + 80;
      
      for (let k = 0; k < w2.segments.length; k += 3) {
        const seg = w2.segments[k];
        const d = Math.hypot(head.x - seg.x, head.y - seg.y);
        if (d < avoidDist) {
          const awayAngle = Math.atan2(head.y - seg.y, head.x - seg.x);
          worm.targetAngle = awayAngle + (Math.random() - 0.5) * 0.5;
          break;
        }
      }
    }
  }

  checkCollisions(dt: number) {
    // Combat
    for (let i = 0; i < this.worms.length; i++) {
      const w1 = this.worms[i];
      if (w1.dead) continue;
      const h1 = w1.segments[0];
      const r1 = this.getRadius(w1.score);

      for (let j = 0; j < this.worms.length; j++) {
        if (i === j) continue;
        const w2 = this.worms[j];
        if (w2.dead) continue;
        const r2 = this.getRadius(w2.score);

        const hitDist = r1 * 0.8 + r2 * 0.8;
        for (let k = 0; k < w2.segments.length; k += 2) {
          const seg = w2.segments[k];
          if (Math.hypot(h1.x - seg.x, h1.y - seg.y) < hitDist) {
            w1.dead = true;
            this.dropFood(w1);
            if (w1.isPlayer) {
              soundManager.playGameOverSound();
              this.onGameOver?.(w1.score);
            }
            break;
          }
        }
      }
    }

    // Food & Powerups
    for (let i = 0; i < this.worms.length; i++) {
      const w = this.worms[i];
      if (w.dead) continue;
      const head = w.segments[0];
      const radius = this.getRadius(w.score);
      const magnetRange = w.powerups.magnet > 0 ? radius * 6 + 120 : radius * 2.5 + 25;
      const eatRange = radius + 25;

      for (let j = this.foods.length - 1; j >= 0; j--) {
        const f = this.foods[j];
        const dist = Math.hypot(head.x - f.x, head.y - f.y);
        if (dist < eatRange) {
          const multiplier = w.powerups.doubleFood > 0 ? 2 : 1;
          w.score += f.value * 2 * multiplier;
          if (w.isPlayer) {
            soundManager.playEatSound();
          }

          // Create sparkles
          const count = Math.min(5, Math.ceil(f.value / 3));
          for (let pIdx = 0; pIdx < count; pIdx++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 120;
            this.particles.push({
              x: f.x,
              y: f.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: f.color,
              size: 1.5 + Math.random() * 2.5,
              alpha: 1,
              life: 0.3 + Math.random() * 0.4,
              maxLife: 0.7,
            });
          }

          this.foods.splice(j, 1);
        } else if (dist < magnetRange) {
          const angle = Math.atan2(head.y - f.y, head.x - f.x);
          const pullSpeed = w.powerups.magnet > 0 ? 500 : 220;
          f.x += Math.cos(angle) * pullSpeed * dt;
          f.y += Math.sin(angle) * pullSpeed * dt;
        }
      }

      for (let j = this.powerups.length - 1; j >= 0; j--) {
        const p = this.powerups[j];
        if (Math.hypot(head.x - p.x, head.y - p.y) < radius + 30) {
          w.powerups[p.type] = POWERUP_DURATION;
          this.powerups.splice(j, 1);
        }
      }
    }
  }

  updateLeaderboard() {
    const sorted = [...this.worms].sort((a, b) => b.score - a.score).slice(0, 10);
    const lb = sorted.map((w) => ({
      id: w.id,
      name: w.name,
      score: Math.floor(w.score),
      isPlayer: w.isPlayer,
      colorHue: w.colorHue,
    }));
    this.onLeaderboardUpdate?.(lb);
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 - this.camera.x, height / 2 - this.camera.y);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 2;
    const gridS = 100;
    ctx.beginPath();
    const startX = Math.max(0, Math.floor((this.camera.x - width / 2) / gridS) * gridS);
    const endX = Math.min(WORLD_SIZE, this.camera.x + width / 2);
    const startY = Math.max(0, Math.floor((this.camera.y - height / 2) / gridS) * gridS);
    const endY = Math.min(WORLD_SIZE, this.camera.y + height / 2);

    for (let x = startX; x <= endX; x += gridS) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridS) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Map bounds
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // Food (Cartoon treats: Donuts, Cookies, Cherries, Candies, & Glowing Fruits)
    const time = Date.now() / 250;
    for (const f of this.foods) {
      const pulse = Math.sin(time + f.x * 0.05 + f.y * 0.05) * 0.6;
      const baseR = Math.max(5, Math.sqrt(f.value) * 2.2 + pulse);
      const foodType = Math.abs(Math.floor(f.x + f.y)) % 4; // 0: Donut, 1: Cookie, 2: Cherry, 3: Glowing Fruit

      ctx.save();
      ctx.translate(f.x, f.y);

      // Soft glow shadow under food
      ctx.fillStyle = f.color.replace('hsl', 'hsla').replace(')', ', 0.25)');
      ctx.beginPath();
      ctx.arc(0, 0, baseR * 2.0, 0, Math.PI * 2);
      ctx.fill();

      if (foodType === 0) {
        // Pink Frosted Donut with Sprinkles
        const r = baseR * 1.5;
        // Donut Dough Base
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Pink Frosting
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
        ctx.fill();

        // Donut Hole
        ctx.fillStyle = '#1e102a'; // Background color match
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Sprinkles
        const sprinkleColors = ['#22c55e', '#3b82f6', '#facc15', '#ffffff', '#a855f7'];
        for (let s = 0; s < 5; s++) {
          const angle = (s * Math.PI * 2) / 5 + (f.x % 1);
          const sr = r * 0.6;
          const sx = Math.cos(angle) * sr;
          const sy = Math.sin(angle) * sr;
          ctx.strokeStyle = sprinkleColors[s % sprinkleColors.length];
          ctx.lineWidth = Math.max(1.5, r * 0.15);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(sx - 2, sy - 1);
          ctx.lineTo(sx + 2, sy + 1);
          ctx.stroke();
        }
      } else if (foodType === 1) {
        // Chocolate Chip Cookie
        const r = baseR * 1.4;
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Chocolate chips
        ctx.fillStyle = '#451a03';
        const chips = [
          { x: -0.3, y: -0.3 },
          { x: 0.3, y: -0.2 },
          { x: -0.2, y: 0.3 },
          { x: 0.25, y: 0.35 },
          { x: 0, y: 0 }
        ];
        for (const chip of chips) {
          ctx.beginPath();
          ctx.arc(chip.x * r, chip.y * r, r * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (foodType === 2) {
        // Double Cherries
        const r = baseR * 0.9;
        // Green Stem
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, 0);
        ctx.quadraticCurveTo(0, -r * 1.5, r * 0.5, 0);
        ctx.stroke();

        // Cherry 1
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(-r * 0.5, 0, r * 0.8, 0, Math.PI * 2);
        ctx.fill();
        // Cherry 2
        ctx.beginPath();
        ctx.arc(r * 0.5, 0, r * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Gloss highlights
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(-r * 0.7, -r * 0.2, r * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.2, r * 0.22, 0, Math.PI * 2); ctx.fill();
      } else {
        // Glowing Candy Fruit Orb
        const r = baseR;
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Shiny 3D highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.arc(-r * 0.3, -r * 0.3, r * 0.38, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Powerups
    for (const p of this.powerups) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const time = Date.now() / 300;
      ctx.translate(0, Math.sin(time + p.x) * 5);

      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);

      if (p.type === 'magnet') {
        ctx.fillStyle = '#a855f7';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('U', 0, 2);
      } else if (p.type === 'doubleFood') {
        ctx.fillStyle = '#eab308';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('2x', 0, 1);
      } else if (p.type === 'speed') {
        ctx.fillStyle = '#06b6d4';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', 0, 2);
      }

      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fill();
      ctx.restore();
    }

    // Worms (Snakes)
    for (const w of this.worms) {
      if (w.segments.length === 0) continue;

      const radius = this.getRadius(w.score);
      const isBoosting = w.isBoosting || w.powerups.speed > 0;
      const head = w.segments[0];

      // Ambient Body Glow & Magnet Halo
      ctx.beginPath();
      ctx.arc(head.x, head.y, radius * (isBoosting ? 3.8 : 2.5), 0, Math.PI * 2);
      ctx.fillStyle = isBoosting 
        ? `hsla(${(w.colorHue + Date.now() / 20) % 360}, 100%, 65%, 0.35)` 
        : `hsla(${w.colorHue}, 85%, 50%, 0.15)`;
      ctx.fill();

      if (w.powerups.magnet > 0) {
        ctx.beginPath();
        ctx.arc(head.x, head.y, radius * 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
        ctx.fill();
      }

      // Calculate radius taper for each segment
      const segRadii: number[] = new Array(w.segments.length);
      for (let i = 0; i < w.segments.length; i++) {
        let taperRatio = 1.0;
        if (i === 1) taperRatio = 0.92; // Neck
        else if (i === 0) taperRatio = 1.25; // Viper Head
        else {
          const tailProgress = i / (w.segments.length - 1);
          taperRatio = Math.max(0.18, 1.0 - Math.pow(tailProgress, 1.4) * 0.75);
        }
        segRadii[i] = radius * taperRatio;
      }

      // 1. Draw Organic Ground Contact Shadow along entire body spine
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.filter = 'blur(4px)';
      ctx.beginPath();
      for (let i = w.segments.length - 1; i >= 0; i--) {
        const seg = w.segments[i];
        const r = segRadii[i];
        ctx.moveTo(seg.x + r * 0.4 + r, seg.y + r * 0.5);
        ctx.arc(seg.x + r * 0.4, seg.y + r * 0.5, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();

      // 2. Draw Continuous Smooth Solid Body Mesh (Tube) with Gradient Fill
      if (w.segments.length > 1) {
        ctx.save();
        
        // Build left and right offset points along the spine
        const leftPts: { x: number; y: number }[] = [];
        const rightPts: { x: number; y: number }[] = [];

        for (let i = 0; i < w.segments.length; i++) {
          const seg = w.segments[i];
          const r = segRadii[i];
          let angle = 0;

          if (i === 0) {
            angle = w.currentAngle + Math.PI / 2;
          } else if (i === w.segments.length - 1) {
            const prev = w.segments[i - 1];
            angle = Math.atan2(seg.y - prev.y, seg.x - prev.x) + Math.PI / 2;
          } else {
            const prev = w.segments[i - 1];
            const next = w.segments[i + 1];
            angle = Math.atan2(next.y - prev.y, next.x - prev.x) + Math.PI / 2;
          }

          leftPts.push({
            x: seg.x + Math.cos(angle) * r,
            y: seg.y + Math.sin(angle) * r,
          });
          rightPts.push({
            x: seg.x - Math.cos(angle) * r,
            y: seg.y - Math.sin(angle) * r,
          });
        }

        // Create body path combining head to tail left side and tail to head right side
        ctx.beginPath();
        ctx.moveTo(leftPts[0].x, leftPts[0].y);
        for (let i = 1; i < leftPts.length; i++) {
          const xc = (leftPts[i - 1].x + leftPts[i].x) / 2;
          const yc = (leftPts[i - 1].y + leftPts[i].y) / 2;
          ctx.quadraticCurveTo(leftPts[i - 1].x, leftPts[i - 1].y, xc, yc);
        }
        ctx.lineTo(leftPts[leftPts.length - 1].x, leftPts[leftPts.length - 1].y);

        // Tail cap
        const tailSeg = w.segments[w.segments.length - 1];
        ctx.arc(tailSeg.x, tailSeg.y, segRadii[w.segments.length - 1], 0, Math.PI * 2);

        // Right side back to head
        ctx.lineTo(rightPts[rightPts.length - 1].x, rightPts[rightPts.length - 1].y);
        for (let i = rightPts.length - 2; i >= 0; i--) {
          const xc = (rightPts[i + 1].x + rightPts[i].x) / 2;
          const yc = (rightPts[i + 1].y + rightPts[i].y) / 2;
          ctx.quadraticCurveTo(rightPts[i + 1].x, rightPts[i + 1].y, xc, yc);
        }
        ctx.closePath();

        // Multi-color blend linear gradient along spine from head to tail
        const tail = w.segments[w.segments.length - 1];
        const bodyGrad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);

        const isRainbow = w.skinId === 'rainbow';
        const baseHue = w.colorHue;

        if (isRainbow) {
          bodyGrad.addColorStop(0, `hsl(${baseHue % 360}, 100%, 65%)`);
          bodyGrad.addColorStop(0.25, `hsl(${(baseHue + 90) % 360}, 100%, 60%)`);
          bodyGrad.addColorStop(0.5, `hsl(${(baseHue + 180) % 360}, 100%, 60%)`);
          bodyGrad.addColorStop(0.75, `hsl(${(baseHue + 270) % 360}, 100%, 60%)`);
          bodyGrad.addColorStop(1, `hsl(${(baseHue + 360) % 360}, 100%, 65%)`);
        } else if (w.skinId === 'black') {
          bodyGrad.addColorStop(0, '#475569');
          bodyGrad.addColorStop(0.5, '#1e293b');
          bodyGrad.addColorStop(1, '#090d16');
        } else if (w.skinId === 'white') {
          bodyGrad.addColorStop(0, '#ffffff');
          bodyGrad.addColorStop(0.5, '#f1f5f9');
          bodyGrad.addColorStop(1, '#94a3b8');
        } else if (w.skinId === 'yellow') {
          bodyGrad.addColorStop(0, '#fef08a');
          bodyGrad.addColorStop(0.5, '#eab308');
          bodyGrad.addColorStop(1, '#713f12');
        } else if (w.skinId === 'green') {
          bodyGrad.addColorStop(0, '#86efac');
          bodyGrad.addColorStop(0.5, '#22c55e');
          bodyGrad.addColorStop(1, '#052e16');
        } else if (w.skinId === 'red') {
          bodyGrad.addColorStop(0, '#fca5a5');
          bodyGrad.addColorStop(0.5, '#ef4444');
          bodyGrad.addColorStop(1, '#450a0a');
        } else if (w.skinId === 'blue') {
          bodyGrad.addColorStop(0, '#bae6fd');
          bodyGrad.addColorStop(0.5, '#3b82f6');
          bodyGrad.addColorStop(1, '#1e3a8a');
        } else if (w.skinId === 'orange') {
          bodyGrad.addColorStop(0, '#fed7aa');
          bodyGrad.addColorStop(0.5, '#f97316');
          bodyGrad.addColorStop(1, '#7c2d12');
        } else if (w.skinId === 'purple') {
          bodyGrad.addColorStop(0, '#f5d0fe');
          bodyGrad.addColorStop(0.5, '#a855f7');
          bodyGrad.addColorStop(1, '#3b0764');
        } else if (w.skinId === 'gold') {
          bodyGrad.addColorStop(0, '#fef08a');
          bodyGrad.addColorStop(0.5, '#f59e0b');
          bodyGrad.addColorStop(1, '#78350f');
        } else {
          bodyGrad.addColorStop(0, `hsl(${baseHue}, 90%, 65%)`);
          bodyGrad.addColorStop(0.5, `hsl(${(baseHue + 30) % 360}, 85%, 48%)`);
          bodyGrad.addColorStop(1, `hsl(${(baseHue + 60) % 360}, 90%, 30%)`);
        }

        ctx.fillStyle = bodyGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      }

      // 3. Draw Overlapping 3D Cartoon Striped Body Segments & Face Features
      for (let i = w.segments.length - 1; i >= 0; i--) {
        const seg = w.segments[i];
        const segRadius = segRadii[i];

        const isEven = i % 2 === 0;
        let mainColor = `hsl(${w.colorHue}, 85%, 55%)`;
        let stripeColor = `hsl(${(w.colorHue + 30) % 360}, 85%, 40%)`;

        if (w.skinId === 'blue') {
          mainColor = isEven ? '#3b82f6' : '#0284c7';
          stripeColor = isEven ? '#60a5fa' : '#1d4ed8';
        } else if (w.skinId === 'red') {
          mainColor = isEven ? '#ef4444' : '#ffffff'; // Red & White candy stripe
          stripeColor = isEven ? '#f87171' : '#e2e8f0';
        } else if (w.skinId === 'green') {
          mainColor = isEven ? '#22c55e' : '#15803d';
          stripeColor = isEven ? '#4ade80' : '#166534';
        } else if (w.skinId === 'yellow') {
          mainColor = isEven ? '#facc15' : '#eab308';
          stripeColor = isEven ? '#fef08a' : '#ca8a04';
        } else if (w.skinId === 'black') {
          mainColor = isEven ? '#334155' : '#0f172a';
          stripeColor = isEven ? '#475569' : '#020617';
        } else if (w.skinId === 'white') {
          mainColor = isEven ? '#ffffff' : '#cbd5e1';
          stripeColor = isEven ? '#f8fafc' : '#94a3b8';
        } else if (w.skinId === 'purple') {
          mainColor = isEven ? '#a855f7' : '#7e22ce';
          stripeColor = isEven ? '#c084fc' : '#581c87';
        } else if (w.skinId === 'orange') {
          mainColor = isEven ? '#f97316' : '#ea580c';
          stripeColor = isEven ? '#fb923c' : '#c2410c';
        } else if (w.skinId === 'gold') {
          mainColor = isEven ? '#fbbf24' : '#d97706';
          stripeColor = isEven ? '#fef08a' : '#92400e';
        } else if (w.skinId === 'rainbow') {
          const segHue = (w.colorHue + i * 18 + (Date.now() / 25)) % 360;
          mainColor = `hsl(${segHue}, 95%, 60%)`;
          stripeColor = `hsl(${(segHue + 20) % 360}, 95%, 45%)`;
        }

        // 3D Spherical Radial Gradient
        const grad = ctx.createRadialGradient(
          seg.x - segRadius * 0.35,
          seg.y - segRadius * 0.35,
          segRadius * 0.08,
          seg.x,
          seg.y,
          segRadius
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, mainColor);
        grad.addColorStop(1, stripeColor);

        ctx.fillStyle = grad;

        if (i === 0) {
          // Smooth Round Cartoon Head Segment
          ctx.beginPath();
          ctx.arc(seg.x, seg.y, segRadius * 1.08, 0, Math.PI * 2);
          ctx.fill();

          // Smooth specular head highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.beginPath();
          ctx.arc(seg.x - segRadius * 0.35, seg.y - segRadius * 0.35, segRadius * 0.42, 0, Math.PI * 2);
          ctx.fill();

          // Draw Worms Zone Style Cartoon Face
          ctx.save();
          ctx.translate(seg.x, seg.y);
          ctx.rotate(w.currentAngle);

          // 1. Cheerful Open Mouth at Front Snout with Red Inside & White Teeth
          ctx.save();
          ctx.translate(radius * 0.62, 0); // Front of head

          // Mouth Cavity (D-Shape facing forward)
          ctx.fillStyle = '#dc2626'; // Bright Red Mouth Cavity
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.38, -Math.PI * 0.5, Math.PI * 0.5);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = Math.max(2, radius * 0.08);
          ctx.stroke();

          // Top Row White Teeth
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.38, -Math.PI * 0.5, Math.PI * 0.5);
          ctx.lineTo(radius * 0.12, 0);
          ctx.arc(0, 0, radius * 0.22, Math.PI * 0.5, -Math.PI * 0.5, true);
          ctx.closePath();
          ctx.fill();

          ctx.restore();

          // 2. Connected Figure-8 / White Eye Mask (Worms Zone Signature Eyes)
          const eyeX = radius * 0.12;
          const eyeY = radius * 0.36;
          const eyeR = radius * 0.36;

          // White Connected Figure-8 Eye Patch Background
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = Math.max(1.5, radius * 0.07);

          ctx.beginPath();
          ctx.arc(eyeX, -eyeY, eyeR + 2, 0, Math.PI * 2);
          ctx.arc(eyeX, eyeY, eyeR + 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Left & Right Eyeballs
          const eyes = [
            { x: eyeX, y: -eyeY },
            { x: eyeX, y: eyeY }
          ];

          for (const eye of eyes) {
            // White Eyeball Base
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(eye.x, eye.y, eyeR, 0, Math.PI * 2);
            ctx.fill();

            // Large Black Pupil
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(eye.x + eyeR * 0.28, eye.y, eyeR * 0.55, 0, Math.PI * 2);
            ctx.fill();

            // White Specular Reflection Dots
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(eye.x + eyeR * 0.15, eye.y - eyeR * 0.22, eyeR * 0.22, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(eye.x + eyeR * 0.4, eye.y + eyeR * 0.18, eyeR * 0.1, 0, Math.PI * 2);
            ctx.fill();
          }

          // 3. Black Cartoon Eyebrows
          ctx.fillStyle = '#0f172a';

          // Left Eyebrow
          ctx.save();
          ctx.translate(eyeX - eyeR * 0.4, -eyeY - eyeR * 0.9);
          ctx.rotate(-0.2);
          ctx.beginPath();
          ctx.ellipse(0, 0, eyeR * 0.65, eyeR * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Right Eyebrow
          ctx.save();
          ctx.translate(eyeX - eyeR * 0.4, eyeY + eyeR * 0.9);
          ctx.rotate(0.2);
          ctx.beginPath();
          ctx.ellipse(0, 0, eyeR * 0.65, eyeR * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.restore();

          // Name Tag above head
          ctx.fillStyle = 'rgba(255,255,255,0.92)';
          ctx.font = '700 13px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(w.name, seg.x, seg.y - radius - 18);
        } else {
          // Smooth 3D Cartoon Round Body Segment
          ctx.beginPath();
          ctx.arc(seg.x, seg.y, segRadius, 0, Math.PI * 2);
          ctx.fill();

          // Glossy Top-Left Specular Shine
          ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
          ctx.beginPath();
          ctx.arc(seg.x - segRadius * 0.3, seg.y - segRadius * 0.3, segRadius * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }
}
