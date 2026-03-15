'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { GameState } from './game/types';
import { PRODUCTS, CUSTOMER_TYPES, STAFF_ROLES } from './game/constants';
import {
  gridToScreen, getGridCenter, drawIsometricTile, drawIsometricBox,
  drawCharacter, lerpGridToScreen, TILE_WIDTH, TILE_HEIGHT,
} from './IsometricGrid';

interface StoreCanvasProps {
  stateRef: React.MutableRefObject<GameState>;
}

export default function StoreCanvas({ stateRef }: StoreCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    const w = canvas.width;
    const h = canvas.height;

    const { offsetX, offsetY } = getGridCenter(
      state.layout.gridWidth, state.layout.gridHeight, w, h
    );

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background gradient based on time of day
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    if (state.timeOfDay === 'morning') {
      gradient.addColorStop(0, '#FFF8E1');
      gradient.addColorStop(1, '#FFF3E0');
    } else if (state.timeOfDay === 'noon') {
      gradient.addColorStop(0, '#FFFDE7');
      gradient.addColorStop(1, '#FFF8E1');
    } else {
      gradient.addColorStop(0, '#E8EAF6');
      gradient.addColorStop(1, '#C5CAE9');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw floor tiles
    drawFloor(ctx, state, offsetX, offsetY);

    // Draw walls
    drawWalls(ctx, state, offsetX, offsetY);

    // Collect all drawable entities and sort by Y for proper z-ordering
    const drawables: { y: number; draw: () => void }[] = [];

    // Shelves
    for (const shelf of state.layout.shelves) {
      const screen = gridToScreen(shelf.gridX, shelf.gridY);
      const sx = screen.x + offsetX;
      const sy = screen.y + offsetY;
      const inv = state.inventory[shelf.category];

      drawables.push({
        y: sy,
        draw: () => drawShelf(ctx, sx, sy, shelf.category, inv.stock),
      });
    }

    // Checkouts
    for (const checkout of state.layout.checkouts) {
      const screen = gridToScreen(checkout.gridX, checkout.gridY);
      const sx = screen.x + offsetX;
      const sy = screen.y + offsetY;

      drawables.push({
        y: sy,
        draw: () => drawCheckout(ctx, sx, sy),
      });
    }

    // Play area
    if (state.layout.playArea) {
      const screen = gridToScreen(state.layout.playArea.gridX, state.layout.playArea.gridY);
      drawables.push({
        y: screen.y + offsetY,
        draw: () => drawPlayArea(ctx, screen.x + offsetX, screen.y + offsetY),
      });
    }

    // VIP area
    if (state.layout.vipArea) {
      const screen = gridToScreen(state.layout.vipArea.gridX, state.layout.vipArea.gridY);
      drawables.push({
        y: screen.y + offsetY,
        draw: () => drawVIPArea(ctx, screen.x + offsetX, screen.y + offsetY),
      });
    }

    // Entrance
    const entranceScreen = gridToScreen(state.layout.entrance.gridX, state.layout.entrance.gridY);
    drawables.push({
      y: entranceScreen.y + offsetY,
      draw: () => drawEntrance(ctx, entranceScreen.x + offsetX, entranceScreen.y + offsetY),
    });

    // Staff
    for (const s of state.staff) {
      const pos = lerpGridToScreen(s.gridX, s.gridY, s.targetX, s.targetY, s.moveProgress, offsetX, offsetY);
      const roleDef = STAFF_ROLES[s.role];
      drawables.push({
        y: pos.y,
        draw: () => {
          drawCharacter(ctx, pos.x, pos.y, roleDef?.emoji ?? '\u{1F9D1}');
          // Name tag
          ctx.font = 'bold 9px Arial';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#333';
          ctx.fillText(s.name, pos.x, pos.y + 10);
        },
      });
    }

    // Customers
    for (const c of state.customers) {
      const pos = lerpGridToScreen(c.gridX, c.gridY, c.targetX, c.targetY, c.moveProgress, offsetX, offsetY);
      const typeDef = CUSTOMER_TYPES[c.type];
      const alpha = c.state === 'leavingSad' || c.state === 'leavingHappy'
        ? Math.max(0.3, c.moveProgress < 1 ? 1 - c.moveProgress * 0.5 : 0.3)
        : 1;

      drawables.push({
        y: pos.y,
        draw: () => {
          ctx.globalAlpha = alpha;
          drawCharacter(ctx, pos.x, pos.y, typeDef?.emoji ?? '\u{1F9D1}');

          // Patience bar
          if (c.state !== 'leavingHappy' && c.state !== 'leavingSad') {
            const pct = c.patience / c.maxPatience;
            const barW = 24;
            const barH = 3;
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(pos.x - barW / 2, pos.y - 28, barW, barH);
            ctx.fillStyle = pct > 0.5 ? '#4CAF50' : pct > 0.25 ? '#FF9800' : '#F44336';
            ctx.fillRect(pos.x - barW / 2, pos.y - 28, barW * pct, barH);
          }

          ctx.globalAlpha = 1;
        },
      });
    }

    // Sort by Y and draw
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) {
      d.draw();
    }

    // Draw particles (on top of everything)
    for (const p of state.particles) {
      const screen = gridToScreen(p.x, p.y);
      ctx.globalAlpha = p.alpha;
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = `#${p.color.toString(16).padStart(6, '0')}`;
      ctx.fillText(p.text, screen.x + offsetX, screen.y + offsetY + p.y * 10 - 30);
      ctx.globalAlpha = 1;
    }

    // Store name banner
    drawBanner(ctx, w);

  }, [stateRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      // Store logical size for rendering
      canvas.dataset.logicalWidth = String(rect.width);
      canvas.dataset.logicalHeight = String(rect.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const tick = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      lastTimeRef.current = timestamp;
      render();
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ touchAction: 'none' }}
    />
  );
}

// ===== Drawing Functions =====

function drawFloor(ctx: CanvasRenderingContext2D, state: GameState, ox: number, oy: number) {
  for (let gx = 0; gx < state.layout.gridWidth; gx++) {
    for (let gy = 0; gy < state.layout.gridHeight; gy++) {
      const screen = gridToScreen(gx, gy);
      const isAlt = (gx + gy) % 2 === 0;
      drawIsometricTile(
        ctx,
        screen.x + ox,
        screen.y + oy,
        isAlt ? '#F5F0E8' : '#EDE8D8',
        'rgba(0,0,0,0.06)',
      );
    }
  }
}

function drawWalls(ctx: CanvasRenderingContext2D, state: GameState, ox: number, oy: number) {
  const gw = state.layout.gridWidth;
  const gh = state.layout.gridHeight;
  const wallH = 24;

  ctx.strokeStyle = '#4A4A4A';
  ctx.lineWidth = 2;

  // Back wall (top-left edge)
  for (let gx = 0; gx < gw; gx++) {
    const screen = gridToScreen(gx, 0);
    const sx = screen.x + ox;
    const sy = screen.y + oy;
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;

    // Wall segment
    ctx.beginPath();
    ctx.moveTo(sx - hw, sy);
    ctx.lineTo(sx - hw, sy - wallH);
    ctx.lineTo(sx, sy - hh - wallH);
    ctx.lineTo(sx, sy - hh);
    ctx.closePath();
    ctx.fillStyle = '#78909C';
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(sx, sy - hh);
    ctx.lineTo(sx, sy - hh - wallH);
    ctx.lineTo(sx + hw, sy - wallH);
    ctx.lineTo(sx + hw, sy);
    ctx.closePath();
    ctx.fillStyle = '#90A4AE';
    ctx.fill();
    ctx.stroke();
  }

  // Left wall (top-right edge)
  for (let gy = 0; gy < gh; gy++) {
    const screen = gridToScreen(0, gy);
    const sx = screen.x + ox;
    const sy = screen.y + oy;
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;

    ctx.beginPath();
    ctx.moveTo(sx - hw, sy);
    ctx.lineTo(sx - hw, sy - wallH);
    ctx.lineTo(sx, sy - hh - wallH);
    ctx.lineTo(sx, sy - hh);
    ctx.closePath();
    ctx.fillStyle = '#607D8B';
    ctx.fill();
    ctx.stroke();
  }
}

function drawShelf(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  category: string,
  stock: number,
) {
  const product = PRODUCTS[category as keyof typeof PRODUCTS];
  if (!product) return;

  // Shelf height based on stock
  const maxH = 28;
  const minH = 8;
  const h = stock > 0 ? Math.min(maxH, minH + stock * 2) : minH;

  // Color based on stock level
  let topColor: string, leftColor: string, rightColor: string;
  if (stock <= 0) {
    topColor = '#9E9E9E';
    leftColor = '#757575';
    rightColor = '#BDBDBD';
  } else if (stock <= 3) {
    topColor = '#FFD54F';
    leftColor = '#FFC107';
    rightColor = '#FFEB3B';
  } else {
    const c = `#${product.color.toString(16).padStart(6, '0')}`;
    topColor = c;
    leftColor = darkenColor(c, 0.2);
    rightColor = lightenColor(c, 0.15);
  }

  drawIsometricBox(ctx, sx, sy, h, topColor, leftColor, rightColor);

  // Product emoji on top
  ctx.font = '16px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(product.emoji, sx, sy - h - 8);

  // Stock count
  ctx.font = 'bold 9px Arial';
  ctx.fillStyle = stock <= 3 ? '#F44336' : '#333';
  ctx.fillText(`${stock}`, sx, sy - h + 4);
}

function drawCheckout(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  drawIsometricBox(ctx, sx, sy, 14, '#8D6E63', '#6D4C41', '#A1887F');
  ctx.font = '14px serif';
  ctx.textAlign = 'center';
  ctx.fillText('\u{1F4B0}', sx, sy - 20);
}

function drawEntrance(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  // Green welcome mat
  drawIsometricTile(ctx, sx, sy, 'rgba(139, 195, 74, 0.6)', 'rgba(104, 159, 56, 0.8)', 2);
  ctx.font = '14px serif';
  ctx.textAlign = 'center';
  ctx.fillText('\u{1F6AA}', sx, sy - 4);
}

function drawPlayArea(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  drawIsometricTile(ctx, sx, sy, 'rgba(255, 193, 7, 0.3)', 'rgba(255, 152, 0, 0.5)', 2);
  ctx.font = '14px serif';
  ctx.textAlign = 'center';
  ctx.fillText('\u{1F3A8}', sx, sy - 4);
  ctx.font = '8px Arial';
  ctx.fillStyle = '#E65100';
  ctx.fillText('\u05E4\u05D9\u05E0\u05EA \u05DE\u05E9\u05D7\u05E7', sx, sy + 8);
}

function drawVIPArea(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  drawIsometricTile(ctx, sx, sy, 'rgba(156, 39, 176, 0.2)', 'rgba(156, 39, 176, 0.5)', 2);
  ctx.font = '14px serif';
  ctx.textAlign = 'center';
  ctx.fillText('\u{1F451}', sx, sy - 4);
  ctx.font = '8px Arial';
  ctx.fillStyle = '#6A1B9A';
  ctx.fillText('VIP', sx, sy + 8);
}

function drawBanner(ctx: CanvasRenderingContext2D, canvasWidth: number) {
  // Use logical width
  const w = canvasWidth / (window.devicePixelRatio || 1);
  ctx.save();
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText('\u{1F9F1} \u05D7\u05E0\u05D5\u05EA \u05D4\u05DC\u05D2\u05D5 \u2014 \u05E7\u05E0\u05D9\u05D5\u05DF \u05E2\u05D6\u05E8\u05D9\u05D0\u05DC\u05D9', w / 2, 18);
  ctx.restore();
}

// ===== Color Utils =====

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xFF) * (1 - amount));
  const g = Math.max(0, ((num >> 8) & 0xFF) * (1 - amount));
  const b = Math.max(0, (num & 0xFF) * (1 - amount));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xFF) * (1 + amount));
  const g = Math.min(255, ((num >> 8) & 0xFF) * (1 + amount));
  const b = Math.min(255, (num & 0xFF) * (1 + amount));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}
