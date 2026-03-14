'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
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
  fadeOut: number; // 0-1, 1=fully visible
}

export default function LegoGameCanvas({
  stage, onGameOver, onScoreChange, onTimeChange, onMamaChange,
  onComboChange, onTechnicChange, onQuote, onPowerup, onSpecialEvent,
  onShake, onFlash,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef({
    items: [] as ItemSprite[],
    particles: [] as Particle[],
    score: 0,
    timeLeft: STAGES[stage].duration,
    mamaMeter: 0,
    combo: 0,
    technicSaved: 0,
    playerX: 0.5,
    activePowerups: [] as ActivePowerup[],
    specialEvent: null as SpecialEvent | null,
    specialEventTimer: 0,
    uid: 0,
    lastSpawn: 0,
    lastTick: 0,
    lastMamaStep: 0,
    running: true,
    width: 0,
    height: 0,
    touchActive: false,
    stageConfig: STAGES[stage],
  });

  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  // ── Resize handler ──
  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setCanvasSize({ w, h });
      stateRef.current.width = w;
      stateRef.current.height = h;
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // ── Spawn item ──
  const spawnItem = useCallback(() => {
    const s = stateRef.current;
    const cfg = s.stageConfig;
    const roll = Math.random();

    let item;
    if (roll < cfg.powerupChance) {
      item = randomFrom(POWERUP_ITEMS);
    } else if (roll < cfg.powerupChance + cfg.trapChance) {
      const isTrap = Math.random() < 0.5;
      if (isTrap) {
        item = randomFrom(TRAP_ITEMS);
      } else {
        item = randomFrom(LOGICAL_ITEMS);
      }
    } else {
      item = randomFrom(ALL_GAME_ITEMS);
    }

    const speed = cfg.baseSpeed + Math.random() * (cfg.maxSpeed - cfg.baseSpeed);
    const padding = ITEM_SIZE;
    const x = padding + Math.random() * (s.width - padding * 2);

    const falling: FallingItem = {
      ...item,
      uid: ++s.uid,
      x,
      y: -ITEM_SIZE,
      speed,
      baseSpeed: speed,
      rotation: (Math.random() - 0.5) * 0.05,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      scale: 0.8,
      grabbed: false,
      rejected: false,
      fadeTimer: 0,
      wobble: Math.random() * Math.PI * 2,
    };

    s.items.push({ item: falling, fadeOut: 1 });
  }, [stage]);

  // ── Emit particles ──
  const emitParticles = useCallback((x: number, y: number, colors: number[], count: number, emoji?: string) => {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      s.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 4,
        emoji: emoji,
      });
    }
  }, []);

  // ── Handle item grab ──
  const handleGrab = useCallback((uid: number) => {
    const s = stateRef.current;
    const spriteIdx = s.items.findIndex(sp => sp.item.uid === uid);
    if (spriteIdx < 0) return;
    const sprite = s.items[spriteIdx];
    const item = sprite.item;
    if (item.grabbed || item.rejected) return;

    const hasPowerup = (type: string) => s.activePowerups.some(p => p.type === type);
    const scoreMultiplier = hasPowerup('double') ? 2 : 1;

    if (item.category === 'technic') {
      const comboBonus = s.combo >= MEGA_COMBO_THRESHOLD ? MEGA_COMBO_BONUS :
                         s.combo >= COMBO_BONUS_THRESHOLD ? COMBO_BONUS : 0;
      s.score += (SCORE_TECHNIC + comboBonus) * scoreMultiplier;
      s.technicSaved++;
      s.combo++;
      onScoreChange(s.score);
      onTechnicChange(s.technicSaved);
      onComboChange(s.combo);
      onQuote(randomFrom(QUOTES.grabTechnic));
      onFlash('rgba(34,197,94,0.25)');
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
      sprite.fadeOut = 1;
    } else if (item.category === 'logical') {
      s.score = Math.max(0, s.score + SCORE_LOGICAL_PENALTY);
      s.combo = 0;
      if (!hasPowerup('shield')) {
        s.mamaMeter = Math.min(MAMA_MAX, s.mamaMeter + MAMA_PER_LOGICAL);
        onMamaChange(s.mamaMeter);
      }
      onScoreChange(s.score);
      onComboChange(0);
      onQuote(randomFrom(QUOTES.grabLogical));
      onFlash('rgba(239,68,68,0.25)');
      onShake();
      emitParticles(item.x, item.y, PARTICLE_COLORS.trap, 8);
      playBigFart();
      vibrate(100);
      item.rejected = true;
      sprite.fadeOut = 1;
    } else if (item.category === 'trap') {
      s.score = Math.max(0, s.score + SCORE_TRAP_PENALTY);
      s.combo = 0;
      if (!hasPowerup('shield')) {
        s.mamaMeter = Math.min(MAMA_MAX, s.mamaMeter + MAMA_PER_TRAP);
        onMamaChange(s.mamaMeter);
      }
      onScoreChange(s.score);
      onComboChange(0);
      onQuote(randomFrom(QUOTES.grabTrap));
      onFlash('rgba(251,191,36,0.25)');
      onShake();
      emitParticles(item.x, item.y, PARTICLE_COLORS.trap, 8);
      playFart();
      vibrate(80);
      item.rejected = true;
      sprite.fadeOut = 1;
    } else if (item.category === 'powerup' && item.powerupType) {
      if (item.powerupType === 'clock') {
        s.timeLeft += CLOCK_BONUS_SECONDS;
        onTimeChange(s.timeLeft);
      } else {
        const existing = s.activePowerups.findIndex(p => p.type === item.powerupType);
        if (existing >= 0) {
          s.activePowerups[existing].remaining = POWERUP_DURATIONS[item.powerupType!];
        } else {
          s.activePowerups.push({
            type: item.powerupType,
            remaining: POWERUP_DURATIONS[item.powerupType],
          });
        }
        onPowerup([...s.activePowerups]);
      }
      onQuote(randomFrom(QUOTES.powerup));
      onFlash('rgba(167,139,250,0.3)');
      emitParticles(item.x, item.y, PARTICLE_COLORS.powerup, 15, '✨');
      playPowerup();
      vibrate(50);
      item.grabbed = true;
      sprite.fadeOut = 1;
    }
  }, [onScoreChange, onTechnicChange, onComboChange, onMamaChange,
      onTimeChange, onQuote, onFlash, onShake, onPowerup, emitParticles]);

  // ── Touch / mouse handlers ──
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current;
    if (!s.running) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Check if tapping an item
    const hitPadding = ITEM_SIZE / 2 + HIT_AREA_PADDING;
    for (let i = s.items.length - 1; i >= 0; i--) {
      const sp = s.items[i];
      const item = sp.item;
      if (item.grabbed || item.rejected) continue;
      if (Math.abs(px - item.x) < hitPadding && Math.abs(py - item.y) < hitPadding) {
        handleGrab(item.uid);
        return;
      }
    }

    // Otherwise move player
    s.playerX = Math.max(0.05, Math.min(0.95, px / s.width));
    s.touchActive = true;
  }, [handleGrab]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current;
    if (!s.touchActive || !s.running) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    s.playerX = Math.max(0.05, Math.min(0.95, px / s.width));
  }, []);

  const handlePointerUp = useCallback(() => {
    stateRef.current.touchActive = false;
  }, []);

  // ── Main game loop ──
  useEffect(() => {
    const s = stateRef.current;
    s.stageConfig = STAGES[stage];
    s.timeLeft = STAGES[stage].duration;
    s.score = 0;
    s.mamaMeter = 0;
    s.combo = 0;
    s.technicSaved = 0;
    s.playerX = 0.5;
    s.items = [];
    s.particles = [];
    s.activePowerups = [];
    s.specialEvent = null;
    s.specialEventTimer = 0;
    s.uid = 0;
    s.lastSpawn = 0;
    s.lastTick = 0;
    s.lastMamaStep = 0;
    s.running = true;

    playSiren();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = 0;

    function tick(timestamp: number) {
      if (!s.running) return;
      if (!lastTime) lastTime = timestamp;
      const dt = Math.min(timestamp - lastTime, 33); // cap at ~30fps worth of dt
      lastTime = timestamp;

      const cfg = s.stageConfig;

      // ── Timer ──
      if (timestamp - s.lastTick >= 1000) {
        s.lastTick = timestamp;
        s.timeLeft--;
        onTimeChange(s.timeLeft);

        // Tick powerup durations
        s.activePowerups = s.activePowerups
          .map(p => ({ ...p, remaining: p.remaining - 1 }))
          .filter(p => p.remaining > 0);
        onPowerup([...s.activePowerups]);
      }

      // ── Game over check ──
      if (s.timeLeft <= 0 || s.mamaMeter >= MAMA_MAX) {
        s.running = false;
        playGameOver();
        onGameOver(s.score, s.technicSaved, s.mamaMeter, stage);
        return;
      }

      // ── Mama steps sound ──
      if (s.mamaMeter >= 60 && timestamp - s.lastMamaStep > (2000 - s.mamaMeter * 15)) {
        s.lastMamaStep = timestamp;
        playMamaStep();
      }

      // ── Warning buzz ──
      if (s.mamaMeter >= 70 && Math.random() < 0.008) {
        playBuzz();
      }

      // ── Special events ──
      if (!s.specialEvent && Math.random() < SPECIAL_EVENT_CHANCE) {
        const events: SpecialEvent[] = ['grandma_calls', 'dad_enters', 'cat_jumps'];
        s.specialEvent = randomFrom(events);
        s.specialEventTimer = SPECIAL_EVENT_DURATION * 60; // frames
        onSpecialEvent(s.specialEvent);
        onQuote(randomFrom(
          s.specialEvent === 'grandma_calls' ? QUOTES.specialGrandma :
          s.specialEvent === 'dad_enters' ? QUOTES.specialDad :
          QUOTES.specialCat
        ));
      }
      if (s.specialEvent) {
        s.specialEventTimer--;
        if (s.specialEventTimer <= 0) {
          s.specialEvent = null;
          onSpecialEvent(null);
        }
      }

      // ── Spawn ──
      const elapsed = cfg.duration - s.timeLeft;
      const spawnInterval = Math.max(
        cfg.spawnIntervalMin,
        cfg.spawnIntervalStart - elapsed * 25
      );
      if (timestamp - s.lastSpawn >= spawnInterval) {
        s.lastSpawn = timestamp;
        if (s.specialEvent !== 'dad_enters') {
          spawnItem();
        }
      }

      // ── Magnet powerup — pull technic items toward player ──
      const hasMagnet = s.activePowerups.some(p => p.type === 'magnet');

      // ── Update items ──
      const playerPixelX = s.playerX * s.width;
      for (let i = s.items.length - 1; i >= 0; i--) {
        const sp = s.items[i];
        const it = sp.item;

        if (it.grabbed || it.rejected) {
          sp.fadeOut -= 0.05;
          if (sp.fadeOut <= 0) {
            s.items.splice(i, 1);
          }
          continue;
        }

        // Gravity
        it.y += it.speed * (dt / 16);
        it.rotation += it.rotSpeed;
        it.wobble += 0.04;

        // Zigzag in stage 3
        if (cfg.zigzag) {
          it.x += Math.sin(it.wobble) * 1.2;
        }

        // Cat event pushes items sideways
        if (s.specialEvent === 'cat_jumps' && s.specialEventTimer > SPECIAL_EVENT_DURATION * 60 - 10) {
          it.x += (Math.random() - 0.5) * 8;
        }

        // Magnet pulls technic items
        if (hasMagnet && it.category === 'technic') {
          const dx = playerPixelX - it.x;
          it.x += dx * 0.05;
        }

        // Scale up as item falls (perspective)
        it.scale = 0.8 + (it.y / s.height) * 0.4;

        // Clamp X
        it.x = Math.max(ITEM_SIZE / 2, Math.min(s.width - ITEM_SIZE / 2, it.x));

        // Miss — fell off bottom
        if (it.y > s.height + ITEM_SIZE) {
          if (it.category === 'technic') {
            s.score = Math.max(0, s.score + SCORE_MISS_PENALTY);
            s.combo = 0;
            onScoreChange(s.score);
            onComboChange(0);
            onQuote(randomFrom(QUOTES.missTechnic));
            playMiss();
          }
          s.items.splice(i, 1);
        }
      }

      // ── Update particles ──
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.life--;
        if (p.life <= 0) {
          s.particles.splice(i, 1);
        }
      }

      // ── Render ──
      render(ctx!, s);

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);

    return () => {
      s.running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [stage, spawnItem, onGameOver, onTimeChange, onScoreChange, onComboChange,
      onMamaChange, onQuote, onPowerup, onSpecialEvent, emitParticles]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.w}
      height={canvasSize.h}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}

// ─── Canvas Renderer ────────────────────────────────────────────────────────

function render(
  ctx: CanvasRenderingContext2D,
  s: { items: ItemSprite[]; particles: Particle[]; playerX: number; width: number; height: number; mamaMeter: number; timeLeft: number; stageConfig: { duration: number } },
) {
  const { width: W, height: H } = s;
  ctx.clearRect(0, 0, W, H);

  // ── Background gradient ──
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#1e293b');
  bgGrad.addColorStop(0.5, '#334155');
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Parallax stars ──
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  for (let i = 0; i < 30; i++) {
    const sx = ((i * 137.5) % W);
    const sy = ((i * 91.3 + Date.now() * 0.005 * ((i % 3) + 1) * 0.3) % H);
    ctx.beginPath();
    ctx.arc(sx, sy, 1 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Shelf lines (decorative) ──
  ctx.strokeStyle = 'rgba(148,163,184,0.1)';
  ctx.lineWidth = 2;
  for (let y = H * 0.3; y < H; y += H * 0.25) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // ── Urgency overlay when mama is angry ──
  if (s.mamaMeter >= 60) {
    const intensity = ((s.mamaMeter - 60) / 40) * 0.15;
    const pulse = Math.sin(Date.now() * 0.005) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(239, 68, 68, ${intensity * pulse})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Timer urgency border ──
  if (s.timeLeft <= 10) {
    const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 + pulse * 0.4})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, W, H);
  }

  // ── Falling items ──
  for (const sp of s.items) {
    const it = sp.item;
    const alpha = it.grabbed || it.rejected ? sp.fadeOut : 1;
    if (alpha <= 0) continue;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rotation);

    const size = ITEM_SIZE * it.scale;

    // Glow behind technic items
    if (it.category === 'technic') {
      const glow = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 0.8);
      glow.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
      glow.addColorStop(1, 'rgba(34, 197, 94, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Item background circle
    const bgColor = it.category === 'technic' ? 'rgba(34,197,94,0.2)' :
                    it.category === 'logical' ? 'rgba(239,68,68,0.15)' :
                    it.category === 'trap' ? 'rgba(251,191,36,0.15)' :
                    'rgba(167,139,250,0.25)';
    const borderColor = it.category === 'technic' ? 'rgba(34,197,94,0.5)' :
                        it.category === 'logical' ? 'rgba(239,68,68,0.3)' :
                        it.category === 'trap' ? 'rgba(251,191,36,0.3)' :
                        'rgba(167,139,250,0.5)';

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
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

    // Name label
    ctx.font = `bold ${Math.max(8, size * 0.17)}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(it.name, 0, size * 0.3, size * 0.9);

    // Grabbed animation — scale up
    if (it.grabbed) {
      const scaleUp = 1 + (1 - sp.fadeOut) * 0.5;
      ctx.scale(scaleUp, scaleUp);
    }
    // Rejected animation — rotate away
    if (it.rejected) {
      ctx.rotate((1 - sp.fadeOut) * 0.8);
    }

    ctx.restore();
  }

  // ── Particles ──
  for (const p of s.particles) {
    ctx.save();
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

    ctx.restore();
  }

  // ── Player (Chaim) ──
  const px = s.playerX * W;
  const py = H - 60;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(px, py + 20, 25, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Character
  ctx.font = '48px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧑‍🦱', px, py);

  // Hands up indicator
  ctx.font = '20px serif';
  ctx.fillText('🙌', px, py - 30);
}
