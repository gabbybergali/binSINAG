"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, Trophy } from 'lucide-react';

export interface ISegregateGameProps {
  onScorePoints: (pts: number) => void;
}

export type Category = 'biodegradable' | 'non-biodegradable' | 'recyclable';

export interface TrashItemDef {
  id: string;
  name: string;
  category: Category;
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => void;
}

export interface BinDef {
  id: Category;
  label: string;
  color: string;
  darkColor: string;
  lidColor: string;
  accentColor: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
}

// Cross-browser safe rounded rectangle helper
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// Helper to draw clean high-contrast text overlay without awkward background boxes
function drawCanvasLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  textColor: string = '#ffffff',
  strokeColor: string = '#090d16',
  fontSize: number = 11,
  fontWeight: string = 'bold'
) {
  ctx.save();
  ctx.font = `${fontWeight} ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 4;

  // Dark outline stroke for high contrast & legibility without background boxes
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);

  // Main text fill
  ctx.fillStyle = textColor;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export default function ISegregateGame({ onScorePoints }: ISegregateGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [streak, setStreak] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);

  // Ref tracking for canvas loop
  const gameStateRef = useRef({
    score: 0,
    highScore: 0,
    lives: 3,
    streak: 0,
    gameOver: false,
    bins: [
      { id: 'biodegradable' as Category, label: 'BIODEGRADABLE', color: '#16a34a', darkColor: '#052e16', lidColor: '#4ade80', accentColor: '#22c55e', x: 0, y: 60, width: 95, height: 85 },
      { id: 'non-biodegradable' as Category, label: 'NON-BIO', color: '#dc2626', darkColor: '#450a0a', lidColor: '#f87171', accentColor: '#ef4444', x: 0, y: 60, width: 95, height: 85 },
      { id: 'recyclable' as Category, label: 'RECYCLABLE', color: '#ca8a04', darkColor: '#422006', lidColor: '#facc15', accentColor: '#eab308', x: 0, y: 60, width: 95, height: 85 },
    ] as BinDef[],
    // Item physics state
    item: {
      defIndex: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 36,
      isFlicked: false,
      scale: 1,
      rotation: 0,
    },
    // Pointer Drag state
    drag: {
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      startTime: 0,
    },
    floatingTexts: [] as FloatingText[],
    oscillationTime: 0,
    pulseTime: 0,
  });

  // Database of custom procedural drawn trash items (NO EMOJIS OR ICONS)
  const itemDefs: TrashItemDef[] = [
    // --- BIODEGRADABLE ---
    {
      id: 'banana',
      name: 'Banana Peel',
      category: 'biodegradable',
      draw: (ctx, x, y, r) => {
        ctx.save();
        ctx.translate(x, y);

        // Soft Drop Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(2, r * 0.5, r * 0.6, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Yellow Arc Peel Body with Metallic Gradient
        const gradient = ctx.createLinearGradient(-r * 0.7, -r * 0.7, r * 0.7, r * 0.7);
        gradient.addColorStop(0, '#fef08a');
        gradient.addColorStop(0.5, '#facc15');
        gradient.addColorStop(1, '#ca8a04');
        
        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, -r * 0.4);
        ctx.bezierCurveTo(-r * 0.2, -r * 0.95, r * 0.55, -r * 0.65, r * 0.75, r * 0.4);
        ctx.bezierCurveTo(r * 0.2, r * 0.75, -r * 0.4, r * 0.55, -r * 0.7, -r * 0.4);
        ctx.fill();
        ctx.stroke();

        // Inner Pulp Layer
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.bezierCurveTo(-r * 0.3, -r * 0.3, r * 0.2, -r * 0.3, r * 0.4, 0);
        ctx.bezierCurveTo(0, r * 0.3, -r * 0.3, r * 0.2, -r * 0.3, -r * 0.3);
        ctx.fill();

        // Stem Tip
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(-r * 0.7, -r * 0.4, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Clean Decal Label (No background text box!)
        drawCanvasLabel(ctx, 'Banana Peel', 0, 0, '#ffffff', '#451a03', 11, 'bold');

        ctx.restore();
      },
    },
    {
      id: 'apple',
      name: 'Apple Core',
      category: 'biodegradable',
      draw: (ctx, x, y, r) => {
        ctx.save();
        ctx.translate(x, y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(2, r * 0.5, r * 0.5, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Red top and bottom curved skin
        const skinGrad = ctx.createLinearGradient(-r * 0.5, -r * 0.5, r * 0.5, r * 0.5);
        skinGrad.addColorStop(0, '#f87171');
        skinGrad.addColorStop(1, '#dc2626');
        
        ctx.fillStyle = skinGrad;
        ctx.beginPath();
        ctx.arc(0, -r * 0.4, r * 0.5, 0, Math.PI, true);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, r * 0.4, r * 0.5, 0, Math.PI, false);
        ctx.fill();

        // Core center
        const coreGrad = ctx.createLinearGradient(0, -r * 0.4, 0, r * 0.4);
        coreGrad.addColorStop(0, '#fffbeb');
        coreGrad.addColorStop(1, '#fef3c7');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(-r * 0.35, -r * 0.4, r * 0.7, r * 0.8);

        // Seeds
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(-4, -2, 2.5, 0, Math.PI * 2);
        ctx.arc(4, 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Stem
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.4);
        ctx.quadraticCurveTo(4, -r * 0.7, 6, -r * 0.8);
        ctx.stroke();

        // Clean Decal Label (No background text box!)
        drawCanvasLabel(ctx, 'Apple Core', 0, 0, '#ffffff', '#450a0a', 11, 'bold');

        ctx.restore();
      },
    },
    {
      id: 'leaves',
      name: 'Leaves',
      category: 'biodegradable',
      draw: (ctx, x, y, r) => {
        ctx.save();
        ctx.translate(x, y);

        // Leaf Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(2, r * 0.5, r * 0.5, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dual-Tone Emerald Green Polygon Leaf
        const leafGrad = ctx.createLinearGradient(-r * 0.6, -r * 0.8, r * 0.6, r * 0.8);
        leafGrad.addColorStop(0, '#4ade80');
        leafGrad.addColorStop(0.5, '#22c55e');
        leafGrad.addColorStop(1, '#15803d');

        ctx.fillStyle = leafGrad;
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.85);
        ctx.quadraticCurveTo(r * 0.85, -r * 0.2, 0, r * 0.85);
        ctx.quadraticCurveTo(-r * 0.85, -r * 0.2, 0, -r * 0.85);
        ctx.fill();
        ctx.stroke();

        // Leaf Veins
        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.75);
        ctx.lineTo(0, r * 0.75);
        ctx.stroke();

        // Clean Decal Label (No background text box!)
        drawCanvasLabel(ctx, 'Leaves', 0, 0, '#ffffff', '#052e16', 11, 'bold');

        ctx.restore();
      },
    },

    // --- NON-BIODEGRADABLE ---
    {
      id: 'styrofoam',
      name: 'Styrofoam',
      category: 'non-biodegradable',
      draw: (ctx, x, y, r) => {
        ctx.save();
        ctx.translate(x, y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(2, r * 0.5, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3D Polar White Block with Gradient Shading
        const blockGrad = ctx.createLinearGradient(-r * 0.75, -r * 0.5, r * 0.75, r * 0.5);
        blockGrad.addColorStop(0, '#ffffff');
        blockGrad.addColorStop(0.7, '#f1f5f9');
        blockGrad.addColorStop(1, '#cbd5e1');

        ctx.fillStyle = blockGrad;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        drawRoundRect(ctx, -r * 0.75, -r * 0.5, r * 1.5, r, 10);
        ctx.fill();
        ctx.stroke();

        // Bevel top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(-r * 0.65, -r * 0.45, r * 1.3, 3);

        // Clean Decal Label (No background text box!)
        drawCanvasLabel(ctx, 'Styrofoam', 0, 0, '#0f172a', '#ffffff', 11, 'bold');

        ctx.restore();
      },
    },
    {
      id: 'chipbag',
      name: 'Chip Bag',
      category: 'non-biodegradable',
      draw: (ctx, x, y, r) => {
        ctx.save();
        ctx.translate(x, y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(2, r * 0.5, r * 0.6, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Metallic Royal Purple Foil Bag
        const foilGrad = ctx.createLinearGradient(-r * 0.6, -r * 0.7, r * 0.6, r * 0.7);
        foilGrad.addColorStop(0, '#c084fc');
        foilGrad.addColorStop(0.4, '#a855f7');
        foilGrad.addColorStop(1, '#6b21a8');

        ctx.fillStyle = foilGrad;
        ctx.strokeStyle = '#581c87';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, -r * 0.75);
        ctx.lineTo(r * 0.6, -r * 0.75);
        ctx.lineTo(r * 0.7, r * 0.75);
        ctx.lineTo(-r * 0.7, r * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Reflective Chrome Sheen Line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-r * 0.4, -r * 0.6);
        ctx.lineTo(r * 0.2, r * 0.5);
        ctx.stroke();

        // Clean Decal Label (No background text box!)
        drawCanvasLabel(ctx, 'Chip Bag', 0, 0, '#ffffff', '#3b0764', 11, 'bold');

        ctx.restore();
      },
    },
    {
      id: 'cigarette',
      name: 'Cigarette Butt',
      category: 'non-biodegradable',
      draw: (ctx, x, y, r) => {
        ctx.save();
        ctx.translate(x, y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(2, 12, r * 0.6, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Orange Filter Cork End
        const filterGrad = ctx.createLinearGradient(-r * 0.7, 0, -r * 0.2, 0);
        filterGrad.addColorStop(0, '#fb923c');
        filterGrad.addColorStop(1, '#ea580c');
        ctx.fillStyle = filterGrad;
        drawRoundRect(ctx, -r * 0.7, -9, r * 0.5, 18, 3);
        ctx.fill();

        // White Paper Tube Body
        const tubeGrad = ctx.createLinearGradient(-r * 0.2, 0, r * 0.7, 0);
        tubeGrad.addColorStop(0, '#ffffff');
        tubeGrad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = tubeGrad;
        drawRoundRect(ctx, -r * 0.2, -9, r * 0.9, 18, 3);
        ctx.fill();

        // Glowing Ember Tip
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(r * 0.7, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Clean Decal Label (No background text box!)
        drawCanvasLabel(ctx, 'Cigarette Butt', 0, 18, '#ffffff', '#0f172a', 10, 'bold');

        ctx.restore();
      },
    },

    // --- RECYCLABLE ---
    {
      id: 'bottle',
      name: 'Plastic Bottle',
      category: 'recyclable',
      draw: (ctx, x, y, r) => {
        ctx.save();
        ctx.translate(x, y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(2, r * 0.6, r * 0.4, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Translucent Electric Blue Bottle Body
        const bottleGrad = ctx.createLinearGradient(-r * 0.45, -r * 0.5, r * 0.45, r * 0.7);
        bottleGrad.addColorStop(0, '#60a5fa');
        bottleGrad.addColorStop(0.5, '#3b82f6');
        bottleGrad.addColorStop(1, '#1d4ed8');

        ctx.fillStyle = bottleGrad;
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 2.5;
        drawRoundRect(ctx, -r * 0.45, -r * 0.5, r * 0.9, r * 1.2, 8);
        ctx.fill();
        ctx.stroke();

        // Blue Cap
        ctx.fillStyle = '#1e3a8a';
        drawRoundRect(ctx, -r * 0.2, -r * 0.8, r * 0.4, r * 0.3, 3);
        ctx.fill();

        // Reflective Glass Shine Stripe
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(-r * 0.3, -r * 0.4, 4, r * 1);

        // Clean Decal Label (No background text box!)
        drawCanvasLabel(ctx, 'Plastic Bottle', 0, 0, '#ffffff', '#1e3a8a', 10, 'bold');

        ctx.restore();
      },
    },
    {
      id: 'can',
      name: 'Soda Can',
      category: 'recyclable',
      draw: (ctx, x, y, r) => {
        ctx.save();
        ctx.translate(x, y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(2, r * 0.65, r * 0.5, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Brushed Silver Chrome Cylinder
        const canGrad = ctx.createLinearGradient(-r * 0.5, 0, r * 0.5, 0);
        canGrad.addColorStop(0, '#e2e8f0');
        canGrad.addColorStop(0.3, '#ffffff');
        canGrad.addColorStop(0.7, '#94a3b8');
        canGrad.addColorStop(1, '#64748b');

        ctx.fillStyle = canGrad;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.5;
        drawRoundRect(ctx, -r * 0.5, -r * 0.65, r, r * 1.3, 10);
        ctx.fill();
        ctx.stroke();

        // Red Soda Band
        const bandGrad = ctx.createLinearGradient(-r * 0.5, 0, r * 0.5, 0);
        bandGrad.addColorStop(0, '#f87171');
        bandGrad.addColorStop(0.5, '#dc2626');
        bandGrad.addColorStop(1, '#991b1b');
        ctx.fillStyle = bandGrad;
        ctx.fillRect(-r * 0.5, -r * 0.25, r, r * 0.5);

        // Silver Pull-Tab Ring at top
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.6, 6, 3, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Clean Decal Label (No background text box!)
        drawCanvasLabel(ctx, 'Soda Can', 0, 0, '#ffffff', '#991b1b', 11, 'bold');

        ctx.restore();
      },
    },
    {
      id: 'box',
      name: 'Cardboard Box',
      category: 'recyclable',
      draw: (ctx, x, y, r) => {
        ctx.save();
        ctx.translate(x, y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(2, r * 0.65, r * 0.6, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Kraft Brown 3D Box
        const boxGrad = ctx.createLinearGradient(-r * 0.65, -r * 0.65, r * 0.65, r * 0.65);
        boxGrad.addColorStop(0, '#f59e0b');
        boxGrad.addColorStop(0.6, '#d97706');
        boxGrad.addColorStop(1, '#92400e');

        ctx.fillStyle = boxGrad;
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.rect(-r * 0.65, -r * 0.65, r * 1.3, r * 1.3);
        ctx.fill();
        ctx.stroke();

        // Flap Seam Line
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-r * 0.65, 0);
        ctx.lineTo(r * 0.65, 0);
        ctx.stroke();

        // Tape Tape Line across seam
        ctx.fillStyle = 'rgba(254, 243, 199, 0.6)';
        ctx.fillRect(-r * 0.65, -4, r * 1.3, 8);

        // Clean Decal Label (No background text box!)
        drawCanvasLabel(ctx, 'Cardboard Box', 0, 0, '#ffffff', '#451a03', 10, 'bold');

        ctx.restore();
      },
    },
  ];

  // Load High Score on mount
  useEffect(() => {
    try {
      const savedHighScore = localStorage.getItem('isegregate_highscore');
      if (savedHighScore) {
        const parsed = parseInt(savedHighScore, 10);
        if (!isNaN(parsed)) {
          setHighScore(parsed);
          gameStateRef.current.highScore = parsed;
        }
      }
    } catch {
      // Storage access fallback
    }
  }, []);

  // Spawn new item
  const spawnNewItem = useCallback((width: number, height: number) => {
    const state = gameStateRef.current;
    const w = width || 400;
    const h = height || 500;
    state.item.defIndex = Math.floor(Math.random() * itemDefs.length);
    state.item.x = w / 2;
    state.item.y = h - 90;
    state.item.vx = 0;
    state.item.vy = 0;
    state.item.isFlicked = false;
    state.item.scale = 1;
    state.item.rotation = 0;
  }, [itemDefs.length]);

  // Reset Game
  const resetGame = useCallback(() => {
    const state = gameStateRef.current;
    state.score = 0;
    state.lives = 3;
    state.streak = 0;
    state.gameOver = false;
    state.floatingTexts = [];
    state.oscillationTime = 0;
    setScore(0);
    setLives(3);
    setStreak(0);
    setGameOver(false);

    if (canvasRef.current) {
      spawnNewItem(canvasRef.current.width, canvasRef.current.height);
    }
  }, [spawnNewItem]);

  // Main Canvas Render & Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = Math.max(rect.height, 500);
      }
      
      const width = canvas.width;
      const height = canvas.height;
      const state = gameStateRef.current;

      // Position top 3 target bins evenly
      const binWidth = Math.min(width * 0.28, 100);
      const spacing = (width - binWidth * 3) / 4;

      state.bins[0].x = spacing; // Biodegradable
      state.bins[0].width = binWidth;
      state.bins[0].y = 60;

      state.bins[1].x = spacing * 2 + binWidth; // Non-Biodegradable
      state.bins[1].width = binWidth;
      state.bins[1].y = 60;

      state.bins[2].x = spacing * 3 + binWidth * 2; // Recyclable
      state.bins[2].width = binWidth;
      state.bins[2].y = 60;

      if (!state.item.isFlicked) {
        state.item.x = width / 2;
        state.item.y = height - 90;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Initial item spawn
    spawnNewItem(canvas.width, canvas.height);

    // Game loop tick
    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const state = gameStateRef.current;
      state.pulseTime += 0.05;

      ctx.clearRect(0, 0, width, height);

      // --- 1. Cyber-Eco Futuristic Background Arena ---
      const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, height);
      bgGradient.addColorStop(0, '#0f172a');
      bgGradient.addColorStop(0.7, '#020617');
      bgGradient.addColorStop(1, '#000000');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // --- 2. Bins Horizontal Motion ---
      if (state.streak >= 10 && !state.gameOver) {
        state.oscillationTime += 0.03;
        const shiftX = Math.sin(state.oscillationTime) * 35;
        const spacing = (width - state.bins[0].width * 3) / 4;

        state.bins[0].x = spacing + shiftX;
        state.bins[1].x = spacing * 2 + state.bins[0].width + shiftX;
        state.bins[2].x = spacing * 3 + state.bins[0].width * 2 + shiftX;
      }

      // --- 3. Draw 3 Target Bins (Authentic Real-Life Wheelie Bins) ---
      state.bins.forEach(bin => {
        ctx.save();
        
        const topX = bin.x;
        const topY = bin.y + 14;
        const binW = bin.width;
        const binH = bin.height;
        const bottomX = bin.x + binW * 0.09;
        const bottomW = binW * 0.82;
        const bottomY = bin.y + binH;

        // Ground Drop Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(bin.x + binW / 2, bottomY + 6, binW * 0.52, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Heavy-Duty Black Rubber Wheels with Silver Hubcaps
        const wheelY = bottomY + 2;
        const leftWheelX = bottomX + 4;
        const rightWheelX = bottomX + bottomW - 4;

        // Black Rubber Tires
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(leftWheelX, wheelY, 9, 0, Math.PI * 2);
        ctx.arc(rightWheelX, wheelY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Silver Hubcaps
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(leftWheelX, wheelY, 3.5, 0, Math.PI * 2);
        ctx.arc(rightWheelX, wheelY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Wheel Axle Line
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(leftWheelX, wheelY);
        ctx.lineTo(rightWheelX, wheelY);
        ctx.stroke();

        // Tapered 3D Wheelie Bin Body
        const bodyGrad = ctx.createLinearGradient(topX, topY, topX + binW, topY);
        bodyGrad.addColorStop(0, bin.darkColor);
        bodyGrad.addColorStop(0.25, bin.color);
        bodyGrad.addColorStop(0.65, bin.accentColor);
        bodyGrad.addColorStop(0.9, bin.color);
        bodyGrad.addColorStop(1, bin.darkColor);

        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.lineTo(topX + binW, topY);
        ctx.lineTo(bottomX + bottomW, bottomY);
        ctx.lineTo(bottomX, bottomY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Front Recessed Structural Panel Line
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(topX + binW * 0.22, topY + 16);
        ctx.lineTo(bottomX + bottomW * 0.22, bottomY - 12);
        ctx.moveTo(topX + binW * 0.78, topY + 16);
        ctx.lineTo(bottomX + bottomW * 0.78, bottomY - 12);
        ctx.stroke();

        // Inner Mouth Cavity (Dark Funnel Depth)
        const mouthGrad = ctx.createRadialGradient(topX + binW / 2, topY - 2, 2, topX + binW / 2, topY - 2, binW * 0.42);
        mouthGrad.addColorStop(0, '#000000');
        mouthGrad.addColorStop(1, bin.darkColor);
        ctx.fillStyle = mouthGrad;
        ctx.beginPath();
        ctx.ellipse(topX + binW / 2, topY, binW * 0.44, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Heavy Top Lid Rim & Rear Hinge Handle
        // Rear Hinge Handle Block
        ctx.fillStyle = '#0f172a';
        drawRoundRect(ctx, topX + binW * 0.2, topY - 18, binW * 0.6, 6, 3);
        ctx.fill();

        // Hinged Plastic Lid Rim Cap
        const lidGrad = ctx.createLinearGradient(topX - 5, topY - 14, topX + binW + 5, topY + 4);
        lidGrad.addColorStop(0, bin.lidColor);
        lidGrad.addColorStop(0.4, '#ffffff');
        lidGrad.addColorStop(0.8, bin.accentColor);
        lidGrad.addColorStop(1, bin.color);

        ctx.fillStyle = lidGrad;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1.5;
        drawRoundRect(ctx, topX - 5, topY - 14, binW + 10, 18, 7);
        ctx.fill();
        ctx.stroke();

        // Front Lid Lip Grip
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(topX + binW * 0.35, topY + 1, binW * 0.3, 3);

        // Procedural Vector 3-Arrow Recycling Symbol Emblem
        const recycleX = topX + binW / 2;
        const recycleY = topY + binH * 0.65;
        const rSize = 10;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Top Arrow
        ctx.moveTo(recycleX, recycleY - rSize);
        ctx.lineTo(recycleX + rSize * 0.8, recycleY + rSize * 0.5);
        ctx.lineTo(recycleX - rSize * 0.8, recycleY + rSize * 0.5);
        ctx.closePath();
        ctx.stroke();

        // Category Decal Title Label (Crisp Text Outline directly on Bin Body)
        drawCanvasLabel(ctx, bin.label, topX + binW / 2, topY + binH * 0.35, '#ffffff', bin.darkColor, 10, 'bold');

        ctx.restore();
      });

      // --- 4. Draw Pulsing Launch Pad Ring ---
      if (!state.item.isFlicked && !state.gameOver) {
        ctx.save();

        const pulseScale = 1 + Math.sin(state.pulseTime * 2) * 0.08;

        // Outer Glow Ring
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(width / 2, height - 90, 52 * pulseScale, 18 * pulseScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Target Center Ring
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.ellipse(width / 2, height - 90, 36, 12, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // --- 5. Aiming Drag Guide Vector ---
      if (state.drag.isDragging && !state.item.isFlicked && !state.gameOver) {
        const dx = state.drag.currentX - state.drag.startX;
        const dy = state.drag.currentY - state.drag.startY;

        if (dy < 0) {
          ctx.save();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3.5;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(state.item.x, state.item.y);
          ctx.lineTo(state.item.x + dx * 1.6, state.item.y + dy * 1.6);
          ctx.stroke();
          ctx.restore();
        }
      }

      // --- 6. Flick Physics & Item Flight Motion ---
      if (state.item.isFlicked && !state.gameOver) {
        state.item.x += state.item.vx;
        state.item.y += state.item.vy;
        state.item.vy += 0.35; // Gravity acceleration
        state.item.rotation += 0.08;

        // Shrink scale as it travels upwards to simulate 3D depth into bin
        state.item.scale = Math.max(0.42, 1 - ((height - 90 - state.item.y) / (height - 100)) * 0.58);

        // Landing collision check at bin target height (y <= 115)
        if (state.item.y <= 115 || state.item.vy > 12) {
          let landedBin: BinDef | null = null;

          // Find collision bin
          for (const bin of state.bins) {
            if (
              state.item.x >= bin.x - 18 &&
              state.item.x <= bin.x + bin.width + 18
            ) {
              landedBin = bin;
              break;
            }
          }

          const currentDef = itemDefs[state.item.defIndex];

          if (landedBin && landedBin.id === currentDef.category) {
            // --- CORRECT MATCH ---
            state.score += 10;
            state.streak += 1;
            onScorePoints(10);

            if (state.score > state.highScore) {
              state.highScore = state.score;
              try {
                localStorage.setItem('isegregate_highscore', state.score.toString());
              } catch {
                // Ignore storage errors
              }
              setHighScore(state.score);
            }

            setScore(state.score);
            setStreak(state.streak);

            // Floating "+10!" Animation
            state.floatingTexts.push({
              id: Date.now(),
              text: state.streak > 2 ? `+10! (x${state.streak} STREAK)` : '+10!',
              x: landedBin.x + landedBin.width / 2,
              y: landedBin.y,
              color: '#4ade80',
              alpha: 1,
            });
          } else {
            // --- INCORRECT MATCH / MISS ---
            state.lives -= 1;
            state.streak = 0;
            setLives(state.lives);
            setStreak(0);

            state.floatingTexts.push({
              id: Date.now(),
              text: 'MISS! -1 LIFE',
              x: state.item.x,
              y: state.item.y,
              color: '#f87171',
              alpha: 1,
            });

            if (state.lives <= 0) {
              state.gameOver = true;
              setGameOver(true);
            }
          }

          if (!state.gameOver) {
            spawnNewItem(width, height);
          }
        }
      }

      // --- 7. Draw Current Trash Item ---
      if (!state.gameOver) {
        ctx.save();
        ctx.translate(state.item.x, state.item.y);
        ctx.scale(state.item.scale, state.item.scale);
        ctx.rotate(state.item.rotation);
        
        const currentDef = itemDefs[state.item.defIndex];
        if (currentDef && currentDef.draw) {
          currentDef.draw(ctx, 0, 0, state.item.radius);
        }

        ctx.restore();
      }

      // --- 8. Render Floating Feedback Texts ---
      state.floatingTexts.forEach((ft, idx) => {
        ft.y -= 1.3;
        ft.alpha -= 0.02;

        ctx.save();
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();

        if (ft.alpha <= 0) {
          state.floatingTexts.splice(idx, 1);
        }
      });

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameId);
    };
  }, [itemDefs, spawnNewItem, onScorePoints]);

  // Pointer Handlers for Messenger Basketball Flick Controls
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const state = gameStateRef.current;
    if (state.gameOver || state.item.isFlicked) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dist = Math.hypot(x - state.item.x, y - state.item.y);
    if (dist < state.item.radius * 3 || y > canvas.height * 0.65) {
      canvas.setPointerCapture(e.pointerId);
      state.drag.isDragging = true;
      state.drag.startX = x;
      state.drag.startY = y;
      state.drag.currentX = x;
      state.drag.currentY = y;
      state.drag.startTime = performance.now();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const state = gameStateRef.current;
    if (!state.drag.isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    state.drag.currentX = e.clientX - rect.left;
    state.drag.currentY = e.clientY - rect.top;
  };

  const handlePointerUp = () => {
    const state = gameStateRef.current;
    if (!state.drag.isDragging) return;
    state.drag.isDragging = false;

    const dx = state.drag.currentX - state.drag.startX;
    const dy = state.drag.currentY - state.drag.startY;
    const duration = Math.max(1, performance.now() - state.drag.startTime);

    if (dy < -15) {
      state.item.isFlicked = true;
      state.item.vx = (dx / duration) * 16;
      state.item.vy = (dy / duration) * 16;

      state.item.vx = Math.max(-12, Math.min(12, state.item.vx));
      state.item.vy = Math.max(-22, Math.min(-10, state.item.vy));
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-2xl text-white space-y-4 relative overflow-hidden select-none">
      {/* Top Header Controls: Score, High Score & Visual Life Hearts */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5 relative z-10">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-black tracking-tight text-emerald-400 whitespace-nowrap">i-Segregate</h3>
            <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>FLICK TOSS</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Swipe upward to flick trash into the correct bin!</p>
        </div>

        {/* Lives, Score & High Score */}
        <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
          {/* Visual Life Hearts */}
          <div className="flex items-center space-x-1.5 bg-rose-950/60 border border-rose-800/60 px-3 py-1.5 rounded-xl shadow-inner">
            {[1, 2, 3].map(heartIndex => (
              <span 
                key={heartIndex} 
                className={`text-sm transition-opacity ${heartIndex <= lives ? 'opacity-100 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]' : 'opacity-20'}`}
              >
                ❤️
              </span>
            ))}
          </div>

          {/* Current Score */}
          <div className="bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-black text-xs px-3.5 py-1.5 rounded-xl shadow-inner whitespace-nowrap">
            SCORE: {score}
          </div>

          {/* Local High Score */}
          <div className="bg-amber-950/80 border border-amber-700/60 text-amber-300 font-black text-xs px-3.5 py-1.5 rounded-xl shadow-inner whitespace-nowrap">
            BEST: {highScore}
          </div>
        </div>
      </div>

      {/* HTML5 Game Canvas Arena */}
      <div className="relative w-full h-[480px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full touch-none cursor-grab active:cursor-grabbing block"
        />

        {/* Difficulty Streak Indicator Overlay */}
        {streak >= 10 && !gameOver && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
            <div className="bg-amber-500/90 backdrop-blur-sm text-slate-950 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center space-x-1.5 animate-pulse border border-amber-300">
              <span>🔥</span>
              <span>MOVING BINS (STREAK x{streak})</span>
            </div>
          </div>
        )}

        {/* Game Over Screen Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-50 animate-in fade-in duration-300">
            <h2 className="text-4xl font-black text-rose-500 mb-2">GAME OVER</h2>
            <p className="text-slate-300 text-sm mb-8">You ran out of lives!</p>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-64 space-y-3 mb-8 shadow-2xl">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">Final Score:</span>
                <span className="text-emerald-400">{score} PTS</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">High Score:</span>
                <span className="text-amber-400">{highScore} PTS</span>
              </div>
            </div>

            <button
              onClick={resetGame}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-8 py-4 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
