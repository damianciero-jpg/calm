'use client';

import { useEffect, useRef, useState } from 'react';

const WIDTH = 450;
const HEIGHT = 650;
const DROP_COOLDOWN_MS = 500;
const GAME_OVER_LINE_Y = 150;
const GAME_OVER_DWELL_MS = 2000;

const THEMES = {
  cozy: {
    background: '#FDF6EC',
    wall: '#D7CCC8',
    wallGlow: '#BCAAA4',
    text: '#5D4037',
    overlay: 'rgba(253, 246, 236, 0.88)',
    tiers: ['#F8BBD0', '#A5D6A7', '#FFF59D', '#FFCCBC', '#D1C4E9', '#B3E5FC', '#F48FB1', '#FFF8E1', '#C5E1A5', '#FFD54F'],
  },
  cosmic: {
    background: '#0A0A12',
    wall: '#00E5FF',
    wallGlow: '#00E5FF',
    text: '#EAFBFF',
    overlay: 'rgba(10, 10, 18, 0.88)',
    tiers: ['#FF2DAA', '#FF7A00', '#FFF500', '#6DFF00', '#B026FF', '#008CFF', '#FF00F5', '#00FFE0', '#7A2CFF', '#FFD700'],
  },
};

const TIER_RADII = [15, 24, 34, 44, 54, 65, 76, 86, 94, 100];
const CAPSULE_TIERS = new Set([3, 6]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function SensoryMergeGame({ theme = 'cozy', onGameOver = undefined, onScoreChange = undefined } = {}) {
  const wrapperRef = useRef(null);
  const gameRef = useRef(null);
  const [score, setScore] = useState(0);
  const [isBasketFull, setIsBasketFull] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  const selectedTheme = THEMES[theme] ? theme : 'cozy';
  const themeConfig = THEMES[selectedTheme];

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
        }

        create() {
          this.matter.world.setBounds(0, 0, WIDTH, HEIGHT, 48, true, true, false, true);
          this.matter.world.engine.gravity.y = 1.15;
          this.createTextures();
          this.createBasket();
          this.createThresholdLine();
          this.createPreview();
          this.input.on('pointermove', this.handlePointerMove, this);
          this.input.on('pointerdown', this.handleDrop, this);
          this.matter.world.on('collisionstart', this.handleCollisionStart, this);
        }

        createTextures() {
          for (let tier = 1; tier <= 10; tier += 1) {
            const radius = TIER_RADII[tier - 1];
            const color = themeConfig.tiers[tier - 1];
            const key = this.textureKey(tier);
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });

            graphics.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
            graphics.lineStyle(3, 0xffffff, selectedTheme === 'cosmic' ? 0.75 : 0.5);

            if (CAPSULE_TIERS.has(tier)) {
              const width = radius * 2.35;
              const height = radius * 1.25;
              graphics.fillRoundedRect(4, 4, width, height, height / 2);
              graphics.strokeRoundedRect(4, 4, width, height, height / 2);
              graphics.generateTexture(key, Math.ceil(width + 8), Math.ceil(height + 8));
            } else {
              const size = radius * 2 + 8;
              graphics.fillCircle(size / 2, size / 2, radius);
              graphics.strokeCircle(size / 2, size / 2, radius);
              graphics.generateTexture(key, size, size);
            }

            graphics.destroy();
          }
        }

        createBasket() {
          const wallColor = Phaser.Display.Color.HexStringToColor(themeConfig.wall).color;
          const walls = [
            this.add.rectangle(25, HEIGHT / 2 + 45, 32, HEIGHT - 90, wallColor, 1),
            this.add.rectangle(WIDTH - 25, HEIGHT / 2 + 45, 32, HEIGHT - 90, wallColor, 1),
            this.add.rectangle(WIDTH / 2, HEIGHT - 25, WIDTH - 45, 34, wallColor, 1),
          ];

          walls.forEach((wall) => {
            this.matter.add.gameObject(wall, { isStatic: true });
            if (selectedTheme === 'cosmic') {
              wall.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(themeConfig.wallGlow).color, 0.95);
            }
          });
        }

        createThresholdLine() {
          const lineColor = selectedTheme === 'cosmic'
            ? Phaser.Display.Color.HexStringToColor('#7AF7FF').color
            : Phaser.Display.Color.HexStringToColor('#BCAAA4').color;

          this.add.line(WIDTH / 2, GAME_OVER_LINE_Y, 35, 0, WIDTH - 35, 0, lineColor, 0.38).setLineWidth(2);
        }

        createPreview() {
          this.nextTier = Phaser.Math.Between(1, 3);
          this.preview = this.add.image(WIDTH / 2, 70, this.textureKey(this.nextTier)).setAlpha(0.72).setScale(0.9);
        }

        textureKey(tier) {
          return `merge-${selectedTheme}-${tier}`;
        }

        handlePointerMove(pointer) {
          if (!this.preview || this.gameOver) return;
          const radius = TIER_RADII[this.nextTier - 1];
          this.preview.x = clamp(pointer.x, 45 + radius, WIDTH - 45 - radius);
        }

        handleDrop(pointer) {
          if (this.gameOver || !this.canDrop) return;
          const radius = TIER_RADII[this.nextTier - 1];
          const x = clamp(pointer.x, 45 + radius, WIDTH - 45 - radius);

          this.spawnItem(x, 75, this.nextTier);
          this.canDrop = false;
          this.nextTier = Phaser.Math.Between(1, 3);
          this.preview?.setTexture(this.textureKey(this.nextTier));
          this.time.delayedCall(DROP_COOLDOWN_MS, () => {
            this.canDrop = true;
          });
        }

        spawnItem(x, y, tier) {
          if (tier > 10) return null;
          const radius = TIER_RADII[tier - 1];
          const item = this.matter.add.image(x, y, this.textureKey(tier), null, {
            restitution: 0.18,
            friction: 0.08,
            frictionAir: 0.01,
            density: 0.0018,
          });

          item.setData('tier', tier);
          item.setData('isMerging', false);

          if (CAPSULE_TIERS.has(tier)) {
            item.setRectangle(radius * 2.35, radius * 1.25, { chamfer: { radius: radius * 0.6 } });
          } else {
            item.setCircle(radius);
          }

          item.setBounce(0.12);
          item.setFriction(0.08);
          item.setFrictionAir(0.01);
          this.items.add(item);
          return item;
        }

        handleCollisionStart(event) {
          if (this.gameOver) return;

          for (const pair of event.pairs) {
            const a = pair.bodyA.gameObject;
            const b = pair.bodyB.gameObject;
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
            this.spawnItem(x, y, tier + 1);
            this.score += tier * 25;
            this.game.events.emit('viada-score-change', this.score);
          }
        }

        checkBasketFull(delta) {
          let hasSettledOverflow = false;
          for (const item of this.items) {
            if (!item.active || !item.body) continue;
            const speed = Math.abs(item.body.velocity.x) + Math.abs(item.body.velocity.y);
            if (item.body.bounds.min.y < GAME_OVER_LINE_Y && speed < 0.9) {
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
            alpha: selectedTheme === 'cosmic' ? 0.42 : 0.22,
            duration: 450,
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
            gravity: { y: 1.15 },
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
  }, [selectedTheme, restartKey, themeConfig, onGameOver, onScoreChange]);

  function clearBasket() {
    setScore(0);
    setIsBasketFull(false);
    setRestartKey((key) => key + 1);
  }

  return (
    <div style={{ width: WIDTH, position: 'relative', fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <div style={{ width: WIDTH, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: themeConfig.text, fontWeight: 800 }}>
        <span>Score</span>
        <span>{score}</span>
      </div>
      <div
        ref={wrapperRef}
        style={{
          width: WIDTH,
          height: HEIGHT,
          overflow: 'hidden',
          borderRadius: 8,
          background: themeConfig.background,
          boxShadow: selectedTheme === 'cosmic' ? '0 0 24px rgba(0, 229, 255, 0.28)' : '0 10px 30px rgba(93, 64, 55, 0.14)',
        }}
      />
      {isBasketFull && (
        <div style={{ position: 'absolute', left: 0, top: 44, width: WIDTH, height: HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', background: themeConfig.overlay, color: themeConfig.text, borderRadius: 8, textAlign: 'center', padding: 28, boxSizing: 'border-box' }}>
          <div>
            <div style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 900, marginBottom: 12 }}>Basket Full!</div>
            <div style={{ fontSize: 22, lineHeight: 1.3, fontWeight: 800, marginBottom: 28 }}>Great Job!</div>
            <button
              type="button"
              onClick={clearBasket}
              style={{
                minWidth: 190,
                minHeight: 56,
                border: 0,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 18,
                fontWeight: 900,
                color: selectedTheme === 'cosmic' ? '#071014' : '#4E342E',
                background: selectedTheme === 'cosmic' ? '#00E5FF' : '#FFD54F',
              }}
            >
              Clear Basket
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
