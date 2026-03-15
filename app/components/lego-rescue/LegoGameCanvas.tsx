'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { FallingItem, Particle, StageLevel, ActivePowerup, SpecialEvent } from './game/types';
import {
  STAGES, ALL_GAME_ITEMS, POWERUP_ITEMS, TRAP_ITEMS, LOGICAL_ITEMS, QUOTES,
  MAMA_MAX, MAMA_PER_LOGICAL, MAMA_PER_TRAP,
  SCORE_TECHNIC, SCORE_LOGICAL_PENALTY, SCORE_TRAP_PENALTY, SCORE_MISS_PENALTY,
  COMBO_BONUS_THRESHOLD, COMBO_BONUS, MEGA_COMBO_THRESHOLD, MEGA_COMBO_BONUS,
  POWERUP_DURATIONS, CLOCK_BONUS_SECONDS,
  SPECIAL_EVENT_CHANCE, SPECIAL_EVENT_DURATION,
  ITEM_SIZE, HIT_AREA_PADDING,
  PARTICLE_COLORS, randomFrom,
} from './game/constants';
import {
  playGrab, playCombo, playMegaCombo, playFart, playBigFart,
  playBuzz, playMiss, playGameOver, playSiren, playPowerup,
  playMamaStep, vibrate,
} from './game/audio';

// ─── Canvas Game Engine ─────────────────────────────────────────────────────

interface Props {
  stage: StageLevel;
  onGameOver: (score: number, technicSaved: number, mamaMeter: number, stage: StageLevel) => void;
  onScoreChange: (score: number) => void;
  onTimeChange: (timeLeft: number) => void;
  onMamaChange: (meter: number) => void;
  onComboChange: (combo: number) => void;
  onTechnicChange: (count: number) => void;
  onQuote: (text: string) => void;
  onPowerup: (powerups: ActivePowerup[]) => void;
  onSpecialEvent: (event: SpecialEvent | null) => void;
  onShake: () => void;
  onFlash: (color: string) => void;
}

interface ItemSprite {
  item: FallingItem;
  fadeOut: number;
}

interface GameState {
  items: ItemSprite[];
  particles: Particle[];
  score: number;
  timeLeft: number;
  mamaMeter: number;
  combo: number;
  technicSaved: number;
  playerX: number;
  activePowerups: ActivePowerup[];
  specialEvent: SpecialEvent | null;
  specialEventTimer: number;
  uid: number;
  lastSpawn: number;
  lastTick: number;
  lastMamaStep: number;
  running: boolean;
  width: number;
  height: number;
  touchActive: boolean;
  stageConfig: (typeof STAGES)[1];
  // Batched UI updates — only push to React when values change
  prevScore: number;
  prevTime: number;
  prevMama: number;
  prevCombo: number;
  prevTechnic: number;
}

export default function LegoGameCanvas({
  stage, onGameOver, onScoreChange, onTimeChange, onMamaChange,
  onComboChange, onTechnicChange, onQuote, onPowerup, onSpecialEvent,
  onShake, onFlash,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Store all callbacks in a ref so the game loop never restarts
  const cbRef = useRef({
    onGameOver, onScoreChange, onTimeChange, onMamaChange,
    onComboChange, onTechnicChange, onQuote, onPowerup,
    onSpecialEvent, onShake, onFlash,
  });
  cbRef.current = {
    onGameOver, onScoreChange, onTimeChange, onMamaChange,
    onComboChange, onTechnicChange, onQuote, onPowerup,
    onSpecialEvent, onShake, onFlash,
  };

  // ── Single effect: setup canvas, run game loop, cleanup ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctxOrNull = canvas.getContext('2d', { alpha: false });
    if (!ctxOrNull) return;
    const ctx = ctxOrNull;

    // ── Size canvas for devicePixelRatio ──
    const dpr = window.devicePixelRatio || 1;
    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + 'px';
      canvas!.style.height = h + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.width = w;
      s.height = h;
    }
    window.addEventListener('resize', resize);
    resize();

    // ── Game state (all mutable, no React state) ──
    const cfg = STAGES[stage];
    const s: GameState = {
      items: [],
      particles: [],
      score: 0,
      timeLeft: cfg.duration,
      mamaMeter: 0,
      combo: 0,
      technicSaved: 0,
      playerX: 0.5,
      activePowerups: [],
      specialEvent: null,
      specialEventTimer: 0,
      uid: 0,
      lastSpawn: 0,
      lastTick: 0,
      lastMamaStep: 0,
      running: true,
      width: window.innerWidth,
      height: window.innerHeight,
      touchActive: false,
      stageConfig: cfg,
      prevScore: -1,
      prevTime: -1,
      prevMama: -1,
      prevCombo: -1,
      prevTechnic: -1,
    };

    playSiren();

    // Push UI updates only when values change (batched per second via timer tick)
    function flushUI() {
      const cb = cbRef.current;
      if (s.score !== s.prevScore) { s.prevScore = s.score; cb.onScoreChange(s.score); }
      if (s.timeLeft !== s.prevTime) { s.prevTime = s.timeLeft; cb.onTimeChange(s.timeLeft); }
      if (s.mamaMeter !== s.prevMama) { s.prevMama = s.mamaMeter; cb.onMamaChange(s.mamaMeter); }
      if (s.combo !== s.prevCombo) { s.prevCombo = s.combo; cb.onComboChange(s.combo); }
      if (s.technicSaved !== s.prevTechnic) { s.prevTechnic = s.technicSaved; cb.onTechnicChange(s.technicSaved); }
    }

    // ── Spawn ──
    function spawnItem() {
      const roll = Math.random();
      let item;
      if (roll < cfg.powerupChance) {
        item = randomFrom(POWERUP_ITEMS);
      } else if (roll < cfg.powerupChance + cfg.trapChance) {
        item = Math.random() < 0.5 ? randomFrom(TRAP_ITEMS) : randomFrom(LOGICAL_ITEMS);
      } else {
        item = randomFrom(ALL_GAME_ITEMS);
      }
      const speed = cfg.baseSpeed + Math.random() * (cfg.maxSpeed - cfg.baseSpeed);
      const padding = ITEM_SIZE;
      const x = padding + Math.random() * (s.width - padding * 2);
      s.items.push({
        item: {
          ...item,
          uid: ++s.uid,
          x, y: -ITEM_SIZE,
          speed, baseSpeed: speed,
          rotation: (Math.random() - 0.5) * 0.05,
          rotSpeed: (Math.random() - 0.5) * 0.03,
          scale: 0.8,
          grabbed: false, rejected: false,
          fadeTimer: 0,
          wobble: Math.random() * Math.PI * 2,
        },
        fadeOut: 1,
      });
    }

    // ── Particles ──
    function emitParticles(x: number, y: number, colors: number[], count: number, emoji?: string) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const spd = 2 + Math.random() * 4;
        s.particles.push({
          x, y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 2,
          life: 40 + Math.random() * 20,
          maxLife: 60,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 3 + Math.random() * 4,
          emoji,
        });
      }
    }

    // ── Grab handler ──
    function handleGrab(uid: number) {
      const cb = cbRef.current;
      const spriteIdx = s.items.findIndex(sp => sp.item.uid === uid);
      if (spriteIdx < 0) return;
      const sprite = s.items[spriteIdx];
      const item = sprite.item;
      if (item.grabbed || item.rejected) return;

      const hasShield = s.activePowerups.some(p => p.type === 'shield');
      const mult = s.activePowerups.some(p => p.type === 'double') ? 2 : 1;

      if (item.category === 'technic') {
        const cBonus = s.combo >= MEGA_COMBO_THRESHOLD ? MEGA_COMBO_BONUS :
                       s.combo >= COMBO_BONUS_THRESHOLD ? COMBO_BONUS : 0;
        s.score += (SCORE_TECHNIC + cBonus) * mult;
        s.technicSaved++;
        s.combo++;
        cb.onQuote(randomFrom(QUOTES.grabTechnic));
        cb.onFlash('rgba(34,197,94,0.25)');
        emitParticles(item.x, item.y, PARTICLE_COLORS.technic, 12);
        if (s.combo >= MEGA_COMBO_THRESHOLD) {
          playMegaCombo();
          emitParticles(item.x, item.y, PARTICLE_COLORS.combo, 20, '⭐');
        } else if (s.combo >= COMBO_BONUS_THRESHOLD) {
          playCombo();
        } else {
          playGrab();
        }
        vibrate(30);
        item.grabbed = true;
      } else if (item.category === 'logical') {
        s.score = Math.max(0, s.score + SCORE_LOGICAL_PENALTY);
        s.combo = 0;
        if (!hasShield) s.mamaMeter = Math.min(MAMA_MAX, s.mamaMeter + MAMA_PER_LOGICAL);
        cb.onQuote(randomFrom(QUOTES.grabLogical));
        cb.onFlash('rgba(239,68,68,0.25)');
        cb.onShake();
        emitParticles(item.x, item.y, PARTICLE_COLORS.trap, 8);
        playBigFart();
        vibrate(100);
        item.rejected = true;
      } else if (item.category === 'trap') {
        s.score = Math.max(0, s.score + SCORE_TRAP_PENALTY);
        s.combo = 0;
        if (!hasShield) s.mamaMeter = Math.min(MAMA_MAX, s.mamaMeter + MAMA_PER_TRAP);
        cb.onQuote(randomFrom(QUOTES.grabTrap));
        cb.onFlash('rgba(251,191,36,0.25)');
        cb.onShake();
        emitParticles(item.x, item.y, PARTICLE_COLORS.trap, 8);
        playFart();
        vibrate(80);
        item.rejected = true;
      } else if (item.category === 'powerup' && item.powerupType) {
        if (item.powerupType === 'clock') {
          s.timeLeft += CLOCK_BONUS_SECONDS;
        } else {
          const existing = s.activePowerups.findIndex(p => p.type === item.powerupType);
          if (existing >= 0) {
            s.activePowerups[existing].remaining = POWERUP_DURATIONS[item.powerupType!];
          } else {
            s.activePowerups.push({ type: item.powerupType, remaining: POWERUP_DURATIONS[item.powerupType] });
          }
          cb.onPowerup([...s.activePowerups]);
        }
        cb.onQuote(randomFrom(QUOTES.powerup));
        cb.onFlash('rgba(167,139,250,0.3)');
        emitParticles(item.x, item.y, PARTICLE_COLORS.powerup, 15, '✨');
        playPowerup();
        vibrate(50);
        item.grabbed = true;
      }

      // Immediately flush score/combo/technic after grab so HUD reflects it
      flushUI();
    }

    // ── Pointer handlers (attached to canvas directly for zero overhead) ──
    function onPointerDown(e: PointerEvent) {
      if (!s.running) return;
      const px = e.clientX;
      const py = e.clientY;
      const hitPad = ITEM_SIZE / 2 + HIT_AREA_PADDING;
      for (let i = s.items.length - 1; i >= 0; i--) {
        const it = s.items[i].item;
        if (it.grabbed || it.rejected) continue;
        if (Math.abs(px - it.x) < hitPad && Math.abs(py - it.y) < hitPad) {
          handleGrab(it.uid);
          return;
        }
      }
      s.playerX = Math.max(0.05, Math.min(0.95, px / s.width));
      s.touchActive = true;
    }
    function onPointerMove(e: PointerEvent) {
      if (!s.touchActive || !s.running) return;
      s.playerX = Math.max(0.05, Math.min(0.95, e.clientX / s.width));
    }
    function onPointerUp() { s.touchActive = false; }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    // ── Cached background gradient ──
    let bgGrad: CanvasGradient | null = null;
    let bgGradH = 0;

    function ensureBgGrad(H: number) {
      if (bgGrad && bgGradH === H) return bgGrad;
      bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(0.5, '#334155');
      bgGrad.addColorStop(1, '#0f172a');
      bgGradH = H;
      return bgGrad;
    }

    // ── Pre-compute star positions ──
    const stars: { x: number; y: number; r: number; layer: number }[] = [];
    for (let i = 0; i < 30; i++) {
      stars.push({
        x: (i * 137.5) % 1000,
        y: (i * 91.3) % 1000,
        r: 1 + (i % 3),
        layer: ((i % 3) + 1) * 0.3,
      });
    }

    // ── Main game loop ──
    let lastTime = 0;

    function tick(timestamp: number) {
      if (!s.running) return;
      if (!lastTime) lastTime = timestamp;
      const dt = Math.min(timestamp - lastTime, 33);
      lastTime = timestamp;

      const { width: W, height: H } = s;

      // ── Timer (once per second) ──
      if (timestamp - s.lastTick >= 1000) {
        s.lastTick = timestamp;
        s.timeLeft--;
        // Tick powerup durations
        s.activePowerups = s.activePowerups
          .map(p => ({ ...p, remaining: p.remaining - 1 }))
          .filter(p => p.remaining > 0);
        cbRef.current.onPowerup([...s.activePowerups]);
        // Flush all UI changes once per second
        flushUI();
      }

      // ── Game over ──
      if (s.timeLeft <= 0 || s.mamaMeter >= MAMA_MAX) {
        s.running = false;
        playGameOver();
        flushUI();
        cbRef.current.onGameOver(s.score, s.technicSaved, s.mamaMeter, stage);
        return;
      }

      // ── Mama steps ──
      if (s.mamaMeter >= 60 && timestamp - s.lastMamaStep > (2000 - s.mamaMeter * 15)) {
        s.lastMamaStep = timestamp;
        playMamaStep();
      }
      if (s.mamaMeter >= 70 && Math.random() < 0.008) playBuzz();

      // ── Special events ──
      if (!s.specialEvent && Math.random() < SPECIAL_EVENT_CHANCE) {
        const events: SpecialEvent[] = ['grandma_calls', 'dad_enters', 'cat_jumps'];
        s.specialEvent = randomFrom(events);
        s.specialEventTimer = SPECIAL_EVENT_DURATION * 60;
        cbRef.current.onSpecialEvent(s.specialEvent);
        cbRef.current.onQuote(randomFrom(
          s.specialEvent === 'grandma_calls' ? QUOTES.specialGrandma :
          s.specialEvent === 'dad_enters' ? QUOTES.specialDad : QUOTES.specialCat
        ));
      }
      if (s.specialEvent) {
        s.specialEventTimer--;
        if (s.specialEventTimer <= 0) {
          s.specialEvent = null;
          cbRef.current.onSpecialEvent(null);
        }
      }

      // ── Spawn ──
      const elapsed = cfg.duration - s.timeLeft;
      const spawnInterval = Math.max(cfg.spawnIntervalMin, cfg.spawnIntervalStart - elapsed * 25);
      if (timestamp - s.lastSpawn >= spawnInterval) {
        s.lastSpawn = timestamp;
        if (s.specialEvent !== 'dad_enters') spawnItem();
      }

      // ── Update items ──
      const hasMagnet = s.activePowerups.some(p => p.type === 'magnet');
      const playerPixelX = s.playerX * W;

      for (let i = s.items.length - 1; i >= 0; i--) {
        const sp = s.items[i];
        const it = sp.item;

        if (it.grabbed || it.rejected) {
          sp.fadeOut -= 0.06;
          if (sp.fadeOut <= 0) s.items.splice(i, 1);
          continue;
        }

        it.y += it.speed * (dt / 16);
        it.rotation += it.rotSpeed;
        it.wobble += 0.04;

        if (cfg.zigzag) it.x += Math.sin(it.wobble) * 1.2;
        if (s.specialEvent === 'cat_jumps' && s.specialEventTimer > SPECIAL_EVENT_DURATION * 60 - 10) {
          it.x += (Math.random() - 0.5) * 8;
        }
        if (hasMagnet && it.category === 'technic') it.x += (playerPixelX - it.x) * 0.05;

        it.scale = 0.8 + (it.y / H) * 0.4;
        it.x = Math.max(ITEM_SIZE / 2, Math.min(W - ITEM_SIZE / 2, it.x));

        if (it.y > H + ITEM_SIZE) {
          if (it.category === 'technic') {
            s.score = Math.max(0, s.score + SCORE_MISS_PENALTY);
            s.combo = 0;
            cbRef.current.onQuote(randomFrom(QUOTES.missTechnic));
            playMiss();
            flushUI();
          }
          s.items.splice(i, 1);
        }
      }

      // ── Update particles ──
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life--;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // ═══════════════════════ RENDER ═══════════════════════

      // Background (cached gradient)
      ctx.fillStyle = ensureBgGrad(H);
      ctx.fillRect(0, 0, W, H);

      // Stars (pre-computed positions, cheap modulo animation)
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      const t = timestamp * 0.005;
      for (const star of stars) {
        const sx = star.x % W;
        const sy = (star.y + t * star.layer) % H;
        ctx.fillRect(sx, sy, star.r * 2, star.r * 2); // rect faster than arc
      }

      // Shelf lines
      ctx.strokeStyle = 'rgba(148,163,184,0.1)';
      ctx.lineWidth = 2;
      for (let y = H * 0.3; y < H; y += H * 0.25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Urgency overlay
      if (s.mamaMeter >= 60) {
        const intensity = ((s.mamaMeter - 60) / 40) * 0.15;
        const pulse = Math.sin(t) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(239,68,68,${intensity * pulse})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Timer urgency border
      if (s.timeLeft <= 10) {
        const pulse = Math.sin(t * 2) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(239,68,68,${(0.3 + pulse * 0.4).toFixed(2)})`;
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, W, H);
      }

      // ── Items ──
      for (const sp of s.items) {
        const it = sp.item;
        const alpha = it.grabbed || it.rejected ? sp.fadeOut : 1;
        if (alpha <= 0) continue;

        const size = ITEM_SIZE * it.scale;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(it.x, it.y);
        ctx.rotate(it.rotation);

        // Grabbed/rejected transforms
        if (it.grabbed) {
          const sc = 1 + (1 - sp.fadeOut) * 0.5;
          ctx.scale(sc, sc);
        }
        if (it.rejected) {
          ctx.rotate((1 - sp.fadeOut) * 0.8);
        }

        // Glow for technic
        if (it.category === 'technic') {
          ctx.fillStyle = 'rgba(34,197,94,0.15)';
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }

        // Background rect
        ctx.fillStyle = it.category === 'technic' ? 'rgba(34,197,94,0.2)' :
                        it.category === 'logical' ? 'rgba(239,68,68,0.15)' :
                        it.category === 'trap' ? 'rgba(251,191,36,0.15)' :
                        'rgba(167,139,250,0.25)';
        ctx.strokeStyle = it.category === 'technic' ? 'rgba(34,197,94,0.5)' :
                          it.category === 'logical' ? 'rgba(239,68,68,0.3)' :
                          it.category === 'trap' ? 'rgba(251,191,36,0.3)' :
                          'rgba(167,139,250,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.25);
        ctx.fill();
        ctx.stroke();

        // Emoji
        ctx.font = `${size * 0.55}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(it.emoji, 0, -size * 0.05);

        // Name
        ctx.font = `bold ${Math.max(8, size * 0.17)}px 'Segoe UI',Arial,sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(it.name, 0, size * 0.3, size * 0.9);

        ctx.restore();
      }

      // ── Particles ──
      for (const p of s.particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        if (p.emoji) {
          ctx.font = `${p.size * 3}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.emoji, p.x, p.y);
        } else {
          ctx.fillStyle = `#${p.color.toString(16).padStart(6, '0')}`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // ── Player ──
      const px = s.playerX * W;
      const py = H - 60;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(px, py + 20, 25, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '48px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧑‍🦱', px, py);
      ctx.font = '20px serif';
      ctx.fillText('🙌', px, py - 30);

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);

    return () => {
      s.running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', resize);
    };
  }, [stage]); // Only restart when stage changes

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
}
