'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const WIDTH = 450;
const HEIGHT = 650;
const SCORE_HEIGHT = 54;
const TOTAL_HEIGHT = SCORE_HEIGHT + HEIGHT;
const DROP_COOLDOWN_MS = 420;
const GAME_OVER_LINE_Y = 120;
const GAME_OVER_DWELL_MS = 600;

const THEMES = {
  cozy: {
    background: '#FF6EB4',
    gradient: 'linear-gradient(160deg, #FF6EB4 0%, #FF8BD2 42%, #9B59B6 100%)',
    wall: '#F43F5E',
    wallGlow: '#FFFFFF',
    text: '#FFFFFF',
    overlay: 'rgba(255, 110, 180, 0.9)',
    scoreShadow: '0 3px 0 #B91C1C, 0 8px 18px rgba(124, 58, 237, 0.28)',
  },
  cosmic: {
    background: '#0A0A12',
    gradient: 'linear-gradient(180deg, #0A0A12 0%, #1E1B4B 100%)',
    wall: '#00E5FF',
    wallGlow: '#00E5FF',
    text: '#EAFBFF',
    overlay: 'rgba(10, 10, 18, 0.88)',
    scoreShadow: '0 0 18px rgba(0, 229, 255, 0.55)',
  },
};

const ITEM_META = [
  { label: 'small candy', icon: 'candy', radius: 15, color: '#FF4FA3', accent: '#FFFFFF' },
  { label: 'lollipop', icon: 'lollipop', radius: 24, color: '#7DD3FC', accent: '#FDE047' },
  { label: 'chocolate bar', icon: 'chocolate', radius: 34, color: '#8B4513', accent: '#F8D7A4', capsule: true },
  { label: 'cupcake', icon: 'cupcake', radius: 44, color: '#F472B6', accent: '#FDE68A' },
  { label: 'donut', icon: 'donut', radius: 54, color: '#F97316', accent: '#FDBA74' },
  { label: 'cake slice', icon: 'cake-slice', radius: 65, color: '#F9A8D4', accent: '#FFFFFF', capsule: true },
  { label: 'birthday cake', icon: 'birthday-cake', radius: 76, color: '#A78BFA', accent: '#FDE047' },
  { label: 'ice cream', icon: 'ice-cream', radius: 86, color: '#67E8F9', accent: '#FCA5A5' },
  { label: 'rainbow candy', icon: 'rainbow', radius: 94, color: '#FFFFFF', accent: '#22C55E' },
  { label: 'golden star candy', icon: 'star', radius: 100, color: '#FACC15', accent: '#FFFFFF' },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getItemRadius(tier) {
  return ITEM_META[tier - 1]?.radius ?? 24;
}

/**
 * @param {{
 *   theme?: 'cozy' | 'cosmic',
 *   childId?: string,
 *   onGameOver?: (finalScore: number) => void,
 *   onScoreChange?: (score: number) => void,
 *   gameOverStatus?: string,
 *   highScore?: number,
 *   onGoHome?: () => void,
 * }} props
 */
export default function SensoryMergeGame({
  theme = 'cozy',
  childId,
  onGameOver,
  onScoreChange,
  gameOverStatus = '',
  highScore = 0,
  onGoHome,
} = {}) {
  const scaleRootRef = useRef(null);
  const wrapperRef = useRef(null);
  const gameRef = useRef(null);
  const [score, setScore] = useState(0);
  const [isBasketFull, setIsBasketFull] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [visualScale, setVisualScale] = useState(1);

  const selectedTheme = THEMES[theme] ? theme : 'cozy';
  const themeConfig = THEMES[selectedTheme];

  useEffect(() => {
    if (childId) console.log('SensoryMergeGame child_id:', childId);
  }, [childId]);

  useEffect(() => {
    function updateScale() {
      const viewportWidth = window.innerWidth || WIDTH;
      const parentWidth = scaleRootRef.current?.parentElement?.clientWidth || viewportWidth;
      const availableWidth = Math.min(viewportWidth, parentWidth);
      setVisualScale(Math.min(1, availableWidth / WIDTH));
    }

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (scaleRootRef.current?.parentElement) observer.observe(scaleRootRef.current.parentElement);
    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const PhaserModule = await import('phaser');
      const Phaser = PhaserModule.default || PhaserModule;

      if (!mounted || !wrapperRef.current) return;

      class SensoryMergeScene extends Phaser.Scene {
        constructor() {
          super('SensoryMergeScene');
          this.items = new Set();
          this.preview = null;
          this.nextTier = 1;
          this.canDrop = true;
          this.score = 0;
          this.gameOver = false;
          this.overflowSince = null;
          this.mergeQueue = [];
          this.lastMergeAt = 0;
          this.comboCount = 0;
          this.flash = null;
        }

        create() {
          this.matter.world.setBounds(0, 0, WIDTH, HEIGHT, 48, true, true, false, true);
          this.matter.world.engine.gravity.y = selectedTheme === 'cozy' ? 1.55 : 1.35;
          this.createTextures();
          this.createBackground();
          this.createBasket();
          this.createThresholdLine();
          this.createPreview();
          this.flash = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0xffffff, 0).setDepth(900);
          this.input.on('pointermove', this.handlePointerMove, this);
          this.input.on('pointerdown', this.handleDrop, this);
          this.matter.world.on('collisionstart', this.handleCollisionStart, this);
          this.game.events.on('viada-force-game-over', this.triggerBasketFull, this);
        }

        createBackground() {
          if (selectedTheme !== 'cozy') return;
          const graphics = this.add.graphics();
          graphics.fillStyle(0xffffff, 0.1);
          for (let y = 30; y < HEIGHT; y += 86) {
            for (let x = 28; x < WIDTH; x += 88) {
              graphics.fillCircle(x, y, 5);
              graphics.fillCircle(x + 34, y + 30, 3);
              graphics.fillRoundedRect(x + 50, y + 4, 22, 10, 5);
            }
          }
          graphics.setDepth(-1);
        }

        createTextures() {
          for (let tier = 1; tier <= 10; tier += 1) {
            this.drawItemTexture(tier, selectedTheme === 'cosmic');
          }
        }

        drawItemTexture(tier, cosmic) {
          const meta = ITEM_META[tier - 1];
          const radius = meta.radius;
          const key = this.textureKey(tier);
          const graphics = this.make.graphics({ x: 0, y: 0, add: false });
          const color = Phaser.Display.Color.HexStringToColor(cosmic ? this.cosmicColor(tier) : meta.color).color;
          const accent = Phaser.Display.Color.HexStringToColor(meta.accent).color;
          const stroke = cosmic ? 0xEAFBFF : 0xffffff;

          if (meta.capsule) {
            const w = radius * 2.35;
            const h = radius * 1.25;
            graphics.fillStyle(color, 1);
            graphics.lineStyle(4, stroke, 0.88);
            graphics.fillRoundedRect(6, 8, w, h, h * 0.18);
            graphics.strokeRoundedRect(6, 8, w, h, h * 0.18);
            if (meta.icon === 'chocolate') {
              graphics.lineStyle(2, accent, 0.65);
              for (let i = 1; i < 4; i += 1) graphics.lineBetween(6 + (w / 4) * i, 12, 6 + (w / 4) * i, h + 4);
              graphics.lineBetween(10, 8 + h / 2, w + 2, 8 + h / 2);
            } else {
              graphics.fillStyle(0xffffff, 0.9);
              graphics.fillTriangle(18, h + 8, w * 0.64, 10, w + 4, h + 8);
              graphics.lineStyle(3, 0xF472B6, 0.8);
              graphics.lineBetween(28, h * 0.76, w * 0.9, h * 0.76);
            }
            graphics.generateTexture(key, Math.ceil(w + 14), Math.ceil(h + 16));
            graphics.destroy();
            return;
          }

          const size = radius * 2 + 16;
          const cx = size / 2;
          const cy = size / 2;
          graphics.fillStyle(color, 1);
          graphics.lineStyle(4, stroke, 0.9);

          if (meta.icon === 'lollipop') {
            graphics.lineStyle(7, 0xffffff, 0.85);
            graphics.lineBetween(cx, cy + radius * 0.5, cx, size - 2);
            graphics.fillCircle(cx, cy, radius);
            graphics.strokeCircle(cx, cy, radius);
            graphics.lineStyle(4, accent, 0.9);
            graphics.beginPath();
            graphics.arc(cx, cy, radius * 0.58, 0.4, 5.8);
            graphics.strokePath();
          } else if (meta.icon === 'cupcake') {
            graphics.fillCircle(cx, cy - radius * 0.15, radius * 0.88);
            graphics.fillStyle(accent, 1);
            graphics.fillRoundedRect(cx - radius * 0.68, cy + radius * 0.28, radius * 1.36, radius * 0.68, 8);
            graphics.lineStyle(3, stroke, 0.8);
            graphics.strokeRoundedRect(cx - radius * 0.68, cy + radius * 0.28, radius * 1.36, radius * 0.68, 8);
          } else if (meta.icon === 'donut') {
            graphics.fillCircle(cx, cy, radius);
            graphics.lineStyle(0);
            graphics.fillStyle(0xFFF7ED, 1);
            graphics.fillCircle(cx, cy, radius * 0.34);
            graphics.fillStyle(accent, 1);
            for (let i = 0; i < 8; i += 1) {
              const a = i * Math.PI / 4;
              graphics.fillCircle(cx + Math.cos(a) * radius * 0.58, cy + Math.sin(a) * radius * 0.58, 4);
            }
          } else if (meta.icon === 'birthday-cake') {
            graphics.fillRoundedRect(cx - radius * 0.8, cy - radius * 0.2, radius * 1.6, radius * 0.98, 12);
            graphics.strokeRoundedRect(cx - radius * 0.8, cy - radius * 0.2, radius * 1.6, radius * 0.98, 12);
            graphics.fillStyle(accent, 1);
            graphics.fillRect(cx - 5, cy - radius * 0.72, 10, radius * 0.5);
            graphics.fillStyle(0xF97316, 1);
            graphics.fillCircle(cx, cy - radius * 0.78, 8);
          } else if (meta.icon === 'ice-cream') {
            graphics.fillCircle(cx, cy - radius * 0.22, radius * 0.75);
            graphics.fillStyle(0xD97706, 1);
            graphics.fillTriangle(cx - radius * 0.58, cy + radius * 0.22, cx + radius * 0.58, cy + radius * 0.22, cx, cy + radius * 1.04);
          } else if (meta.icon === 'rainbow') {
            const bands = [0xEF4444, 0xF97316, 0xFACC15, 0x22C55E, 0x3B82F6, 0xA855F7];
            bands.forEach((band, i) => {
              graphics.fillStyle(band, 1);
              graphics.slice(cx, cy, radius - i * (radius / 7), Math.PI, 0, false);
              graphics.fillPath();
            });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(cx, cy, radius * 0.28);
          } else if (meta.icon === 'star') {
            this.drawStar(graphics, cx, cy, radius * 0.95, radius * 0.45, color, stroke);
          } else {
            graphics.fillCircle(cx, cy, radius);
            graphics.strokeCircle(cx, cy, radius);
            graphics.fillStyle(accent, 0.9);
            graphics.fillCircle(cx - radius * 0.36, cy - radius * 0.18, radius * 0.18);
            graphics.fillCircle(cx + radius * 0.34, cy + radius * 0.14, radius * 0.14);
          }

          graphics.generateTexture(key, size, size);
          graphics.destroy();
        }

        drawStar(graphics, cx, cy, outer, inner, fill, stroke) {
          const points = [];
          for (let i = 0; i < 10; i += 1) {
            const angle = -Math.PI / 2 + i * Math.PI / 5;
            const r = i % 2 === 0 ? outer : inner;
            points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
          }
          graphics.fillStyle(fill, 1);
          graphics.lineStyle(4, stroke, 0.95);
          graphics.beginPath();
          graphics.moveTo(points[0].x, points[0].y);
          points.slice(1).forEach(point => graphics.lineTo(point.x, point.y));
          graphics.closePath();
          graphics.fillPath();
          graphics.strokePath();
        }

        cosmicColor(tier) {
          return ['#FF2DAA', '#FF7A00', '#6B3A1E', '#6DFF00', '#B026FF', '#008CFF', '#FF00F5', '#00FFE0', '#7A2CFF', '#FFD700'][tier - 1];
        }

        createBasket() {
          if (selectedTheme === 'cozy') {
            this.createCandyBowl();
            return;
          }

          const wallColor = Phaser.Display.Color.HexStringToColor(themeConfig.wall).color;
          const walls = [
            this.add.rectangle(25, HEIGHT / 2 + 45, 32, HEIGHT - 90, wallColor, 1),
            this.add.rectangle(WIDTH - 25, HEIGHT / 2 + 45, 32, HEIGHT - 90, wallColor, 1),
            this.add.rectangle(WIDTH / 2, HEIGHT - 25, WIDTH - 45, 34, wallColor, 1),
          ];

          walls.forEach((wall) => {
            this.matter.add.gameObject(wall, { isStatic: true });
            wall.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(themeConfig.wallGlow).color, 0.95);
          });
        }

        createCandyBowl() {
          const wallDefs = [
            { x: 22, y: HEIGHT / 2 + 45, w: 34, h: HEIGHT - 90 },
            { x: WIDTH - 22, y: HEIGHT / 2 + 45, w: 34, h: HEIGHT - 90 },
            { x: WIDTH / 2, y: HEIGHT - 24, w: WIDTH - 42, h: 38 },
          ];

          wallDefs.forEach(def => {
            const wall = this.add.rectangle(def.x, def.y, def.w, def.h, 0xffffff, 1);
            wall.setStrokeStyle(3, 0xF43F5E, 1);
            this.matter.add.gameObject(wall, { isStatic: true });
          });

          const stripes = this.add.graphics().setDepth(2);
          const sideWalls = [wallDefs[0], wallDefs[1]];
          stripes.fillStyle(0xF43F5E, 0.3);
          sideWalls.forEach((wall) => {
            const left = wall.x - wall.w / 2 + 4;
            const right = wall.x + wall.w / 2 - 4;
            const top = wall.y - wall.h / 2 + 8;
            const bottom = wall.y + wall.h / 2 - 8;
            for (let y = top; y < bottom; y += 44) {
              stripes.fillTriangle(left, y + 28, left, y + 46, right, y + 12);
              stripes.fillTriangle(right, y + 12, right, y + 30, left, y + 46);
            }
          });

          this.add.rectangle(WIDTH / 2, HEIGHT - 46, WIDTH - 44, 16, 0xffffff, 0.65).setDepth(3);
        }

        createThresholdLine() {
          const lineColor = selectedTheme === 'cosmic'
            ? Phaser.Display.Color.HexStringToColor('#7AF7FF').color
            : Phaser.Display.Color.HexStringToColor('#FFFFFF').color;
          this.add.line(WIDTH / 2, GAME_OVER_LINE_Y, 35, 0, WIDTH - 35, 0, lineColor, 0.45).setLineWidth(3);
        }

        createPreview() {
          this.nextTier = Phaser.Math.Between(1, 3);
          this.previewGlow = this.add.circle(WIDTH / 2, 70, 42, 0xffffff, 0.22).setDepth(20);
          this.preview = this.add.image(WIDTH / 2, 70, this.textureKey(this.nextTier)).setAlpha(0.92).setScale(0.9).setDepth(21);
          this.tweens.add({
            targets: this.previewGlow,
            scale: { from: 0.9, to: 1.22 },
            alpha: { from: 0.18, to: 0.42 },
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }

        textureKey(tier) {
          return `merge-${selectedTheme}-${tier}`;
        }

        handlePointerMove(pointer) {
          if (!this.preview || this.gameOver) return;
          const radius = getItemRadius(this.nextTier);
          const x = clamp(pointer.x, 45 + radius, WIDTH - 45 - radius);
          this.preview.x = x;
          if (this.previewGlow) this.previewGlow.x = x;
        }

        handleDrop(pointer) {
          if (this.gameOver || !this.canDrop) return;
          const radius = getItemRadius(this.nextTier);
          const x = clamp(pointer.x, 45 + radius, WIDTH - 45 - radius);

          this.spawnItem(x, 75, this.nextTier);
          this.flashDrop();
          this.canDrop = false;
          this.nextTier = Phaser.Math.Between(1, 3);
          this.preview?.setTexture(this.textureKey(this.nextTier));
          this.time.delayedCall(DROP_COOLDOWN_MS, () => {
            this.canDrop = true;
          });
        }

        flashDrop() {
          if (!this.flash) return;
          this.flash.setAlpha(0.24);
          this.tweens.add({ targets: this.flash, alpha: 0, duration: 120, ease: 'Sine.easeOut' });
        }

        spawnItem(x, y, tier) {
          if (tier > 10) return null;
          const meta = ITEM_META[tier - 1];
          const radius = meta.radius;
          const item = this.matter.add.image(x, y, this.textureKey(tier), null, {
            restitution: 0.24,
            friction: 0.06,
            frictionAir: 0.008,
            density: 0.0018,
          });

          item.setData('tier', tier);
          item.setData('isMerging', false);

          if (meta.capsule) {
            item.setRectangle(radius * 2.35, radius * 1.25, { chamfer: { radius: radius * 0.18 } });
          } else {
            item.setCircle(radius);
          }

          item.setBounce(0.2);
          item.setFriction(0.06);
          item.setFrictionAir(0.008);
          this.tweens.add({ targets: item, scaleX: 1.06, scaleY: 0.94, duration: 115, yoyo: true, repeat: 1, ease: 'Sine.easeOut' });
          this.items.add(item);
          return item;
        }

        handleCollisionStart(event) {
          if (this.gameOver) return;

          for (const pair of event.pairs) {
            const a = pair.bodyA.gameObject;
            const b = pair.bodyB.gameObject;

            [a, b].forEach(item => {
              if (item && this.items.has(item) && !item.getData('landed')) {
                item.setData('landed', true);
                this.tweens.add({ targets: item, scaleX: 1.08, scaleY: 0.9, duration: 90, yoyo: true, ease: 'Back.easeOut' });
              }
            });

            if (!a || !b || !this.items.has(a) || !this.items.has(b)) continue;
            if (a.getData('isMerging') || b.getData('isMerging')) continue;

            const tier = a.getData('tier');
            if (!tier || tier !== b.getData('tier') || tier >= 10) continue;

            a.setData('isMerging', true);
            b.setData('isMerging', true);
            this.mergeQueue.push({ a, b, tier, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          }
        }

        processMerges() {
          const queue = this.mergeQueue.splice(0);
          for (const merge of queue) {
            const { a, b, tier, x, y } = merge;
            if (!a.active || !b.active) continue;

            this.items.delete(a);
            this.items.delete(b);
            a.destroy();
            b.destroy();
            const created = this.spawnItem(x, y, tier + 1);
            created?.setScale(0.84);
            if (created) this.tweens.add({ targets: created, scale: 1, duration: 160, ease: 'Back.easeOut' });

            const now = this.time.now;
            const isCombo = now - this.lastMergeAt <= 3000;
            this.comboCount = isCombo ? this.comboCount + 1 : 1;
            this.lastMergeAt = now;
            const basePoints = tier * 25;
            const points = isCombo ? basePoints * 2 : basePoints;
            this.score += points;
            this.addMergeBurst(x, y, points, isCombo);
            this.game.events.emit('viada-score-change', this.score);
          }
        }

        addMergeBurst(x, y, points, isCombo) {
          const sparkleColor = selectedTheme === 'cozy' ? 0xFDE047 : 0x00E5FF;
          for (let i = 0; i < 14; i += 1) {
            const angle = (Math.PI * 2 * i) / 14;
            const sparkle = this.add.star(x, y, 5, 4, 11, i % 2 ? 0xffffff : sparkleColor, 1).setDepth(700);
            this.tweens.add({
              targets: sparkle,
              x: x + Math.cos(angle) * Phaser.Math.Between(42, 86),
              y: y + Math.sin(angle) * Phaser.Math.Between(42, 86),
              alpha: 0,
              scale: 0.25,
              duration: 400,
              ease: 'Cubic.easeOut',
              onComplete: () => sparkle.destroy(),
            });
          }

          const popup = this.add.text(x, y - 16, `+${points}!`, {
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontSize: '26px',
            fontStyle: '900',
            color: '#FFFFFF',
            stroke: selectedTheme === 'cozy' ? '#BE123C' : '#111827',
            strokeThickness: 5,
          }).setOrigin(0.5).setDepth(720);
          this.tweens.add({
            targets: popup,
            y: y - 82,
            alpha: 0,
            duration: 650,
            ease: 'Sine.easeOut',
            onComplete: () => popup.destroy(),
          });

          if (isCombo) {
            const combo = this.add.text(WIDTH / 2, 132, 'COMBO!', {
              fontFamily: 'Outfit, system-ui, sans-serif',
              fontSize: '34px',
              fontStyle: '900',
              color: '#FDE047',
              stroke: '#BE123C',
              strokeThickness: 6,
            }).setOrigin(0.5).setDepth(730);
            this.tweens.add({
              targets: combo,
              y: 92,
              alpha: 0,
              scale: 1.12,
              duration: 720,
              ease: 'Back.easeOut',
              onComplete: () => combo.destroy(),
            });
          }
        }

        checkBasketFull(delta) {
          let hasSettledOverflow = false;
          for (const item of this.items) {
            if (!item.active || !item.body) continue;
            const speed = Math.abs(item.body.velocity.x) + Math.abs(item.body.velocity.y);
            if (item.body.bounds.min.y < GAME_OVER_LINE_Y && speed < 1.15) {
              hasSettledOverflow = true;
              break;
            }
          }

          if (!hasSettledOverflow) {
            this.overflowSince = null;
            return;
          }

          this.overflowSince = (this.overflowSince ?? 0) + delta;
          if (this.overflowSince >= GAME_OVER_DWELL_MS) this.triggerBasketFull();
        }

        triggerBasketFull() {
          if (this.gameOver) return;
          this.gameOver = true;
          this.canDrop = false;
          const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0).setDepth(1000);
          this.tweens.add({
            targets: overlay,
            alpha: selectedTheme === 'cosmic' ? 0.42 : 0.18,
            duration: 220,
            ease: 'Sine.easeOut',
          });
          this.game.events.emit('viada-game-over', this.score);
        }

        update(_time, delta) {
          if (this.gameOver) return;
          this.processMerges();
          this.checkBasketFull(delta);
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: WIDTH,
        height: HEIGHT,
        parent: wrapperRef.current,
        backgroundColor: themeConfig.background,
        physics: {
          default: 'matter',
          matter: {
            gravity: { y: selectedTheme === 'cozy' ? 1.55 : 1.35 },
            debug: false,
          },
        },
        scene: SensoryMergeScene,
        scale: {
          mode: Phaser.Scale.NONE,
          width: WIDTH,
          height: HEIGHT,
        },
      });

      gameRef.current = game;
      game.events.on('viada-score-change', (nextScore) => {
        setScore(nextScore);
        onScoreChange?.(nextScore);
      });
      game.events.on('viada-game-over', (finalScore) => {
        setIsBasketFull(true);
        onGameOver?.(finalScore);
      });
    }

    boot();

    return () => {
      mounted = false;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [selectedTheme, restartKey, themeConfig, onGameOver, onScoreChange, childId]);

  const endGameNow = useCallback(() => {
    gameRef.current?.events.emit('viada-force-game-over');
  }, []);

  function clearBasket() {
    setScore(0);
    setIsBasketFull(false);
    setRestartKey((key) => key + 1);
  }

  return (
    <div
      ref={scaleRootRef}
      style={{
        width: 'min(100vw, 450px)',
        maxWidth: '100vw',
        height: TOTAL_HEIGHT * visualScale,
        margin: '0 auto',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        fontFamily: "'Outfit', system-ui, sans-serif",
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: WIDTH,
          height: TOTAL_HEIGHT,
          flex: '0 0 auto',
          position: 'relative',
          transform: `scale(${visualScale})`,
          transformOrigin: 'top center',
        }}
      >
        <div style={{ width: WIDTH, height: SCORE_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: themeConfig.text, fontWeight: 900, padding: '0 10px', boxSizing: 'border-box' }}>
          <span style={{ fontSize: 16, textShadow: themeConfig.scoreShadow }}>SCORE</span>
          <span style={{ fontSize: 32, lineHeight: 1, color: selectedTheme === 'cozy' ? '#FDE047' : themeConfig.text, textShadow: themeConfig.scoreShadow }}>x {score}</span>
        </div>
        <div
          ref={wrapperRef}
          style={{
            width: WIDTH,
            height: HEIGHT,
            overflow: 'hidden',
            borderRadius: 8,
            background: themeConfig.gradient,
            boxShadow: selectedTheme === 'cosmic' ? '0 0 24px rgba(0, 229, 255, 0.28)' : '0 18px 40px rgba(157, 23, 77, 0.24)',
          }}
        />
        {!isBasketFull && (
          <button
            type="button"
            onClick={endGameNow}
            style={{
              position: 'absolute',
              right: 12,
              top: SCORE_HEIGHT + 12,
              zIndex: 20,
              minHeight: 38,
              border: '2px solid rgba(255,255,255,0.72)',
              borderRadius: 8,
              cursor: 'pointer',
              padding: '0 12px',
              fontSize: 13,
              fontWeight: 900,
              color: selectedTheme === 'cozy' ? '#BE123C' : '#071014',
              background: 'rgba(255,255,255,0.92)',
              boxShadow: '0 8px 18px rgba(15,23,42,0.18)',
            }}
          >
            End Game
          </button>
        )}
        {isBasketFull && (
          <div style={{ position: 'absolute', left: 0, top: SCORE_HEIGHT, width: WIDTH, height: HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', background: themeConfig.overlay, color: themeConfig.text, borderRadius: 8, textAlign: 'center', padding: 28, boxSizing: 'border-box' }}>
            <div>
              <div style={{ fontSize: 38, lineHeight: 1.05, fontWeight: 900, marginBottom: 10, textShadow: themeConfig.scoreShadow }}>Basket Full!</div>
              <div style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 900, marginBottom: 8 }}>Final Score: x {score}</div>
              <div style={{ fontSize: 18, lineHeight: 1.3, fontWeight: 900, marginBottom: 10, color: selectedTheme === 'cozy' ? '#FDE047' : '#FFD700', textShadow: '0 2px 8px rgba(0,0,0,0.22)' }}>
                Personal Best: {Math.max(highScore, score)}
              </div>
              {gameOverStatus && (
                <div style={{ fontSize: 18, lineHeight: 1.3, fontWeight: 900, marginBottom: 22 }}>
                  {gameOverStatus}
                </div>
              )}
              <button
                type="button"
                onClick={onGoHome ?? clearBasket}
                style={{
                  minWidth: 190,
                  minHeight: 56,
                  border: 0,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 18,
                  fontWeight: 900,
                  color: selectedTheme === 'cosmic' ? '#071014' : '#BE123C',
                  background: selectedTheme === 'cosmic' ? '#00E5FF' : '#FDE047',
                  boxShadow: '0 8px 18px rgba(15,23,42,0.2)',
                }}
              >
                {onGoHome ? 'Go Home' : 'Clear Basket'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
