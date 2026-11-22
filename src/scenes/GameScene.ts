import Phaser from 'phaser';
import { TUNING, VIEW } from '../config/tuning';
import { stepPlayer, type Platform, type PlayerInput, type PlayerState } from '../core/physics';
import { platformForFloor, themeIndexForFloor } from '../core/tower';
import {
  createCombo,
  finishCombo,
  onLand,
  tickCombo,
  type ComboResult,
  type ComboState,
} from '../core/combo';
import { clockFraction, createScroll, updateScroll, type ScrollState } from '../core/scroll';
import { Hud, comboTimeFraction } from '../render/hud';
import { TEX } from '../render/textures';
import { themeFor } from '../render/themes';
import { drawPlatform, drawWalls } from '../render/world';

type Key = Phaser.Input.Keyboard.Key;

/**
 * Glue layer: reads input → advances pure `core/*` logic on a fixed timestep → draws.
 * No gameplay rules live here; they're all in core/ (and unit-tested there).
 */
export class GameScene extends Phaser.Scene {
  private seed = 0;
  private player!: PlayerState;
  private combo!: ComboState;
  private scroll!: ScrollState;
  private cameraTop = 0;
  private highestFloor = 0;
  private comboPoints = 0;
  private bestCombo = 0;
  private accumulator = 0;
  private spin = 0;
  private over = false;
  private platforms = new Map<number, Platform>();
  private labels = new Map<number, Phaser.GameObjects.Text>();
  private worldGfx!: Phaser.GameObjects.Graphics;
  private sprite!: Phaser.GameObjects.Image;
  private hud!: Hud;
  private keys!: Record<'left' | 'right' | 'up' | 'space' | 'a' | 'd' | 'w', Key>;

  constructor() {
    super('game');
  }

  create(): void {
    this.seed = (Math.random() * 2 ** 32) >>> 0;
    this.player = { x: VIEW.width / 2, y: 0, vx: 0, vy: 0, onGround: true, floor: 0 };
    this.combo = createCombo();
    this.scroll = createScroll();
    this.cameraTop = -VIEW.height + 72;
    this.highestFloor = 0;
    this.comboPoints = 0;
    this.bestCombo = 0;
    this.accumulator = 0;
    this.spin = 0;
    this.over = false;
    this.platforms.clear();
    this.labels.clear();

    this.worldGfx = this.add.graphics();
    this.sprite = this.add.image(0, 0, TEX.hopper).setDepth(5);
    this.hud = new Hud(this);

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT),
      right: kb.addKey(K.RIGHT),
      up: kb.addKey(K.UP),
      space: kb.addKey(K.SPACE),
      a: kb.addKey(K.A),
      d: kb.addKey(K.D),
      w: kb.addKey(K.W),
    };
    this.draw();
  }

  update(_time: number, deltaMs: number): void {
    if (this.over) return;
    // Fixed-timestep accumulator: identical physics at 30, 60 or 144 FPS.
    this.accumulator += Math.min(deltaMs, 100) / 1000;
    while (this.accumulator >= TUNING.step && !this.over) {
      this.simulate(TUNING.step);
      this.accumulator -= TUNING.step;
    }
    this.draw();
  }

  private get score(): number {
    return this.highestFloor * 10 + this.comboPoints;
  }

  private readInput(): PlayerInput {
    const k = this.keys;
    return {
      left: k.left.isDown || k.a.isDown,
      right: k.right.isDown || k.d.isDown,
      jump: k.space.isDown || k.up.isDown || k.w.isDown,
    };
  }

  private platformAt(floor: number): Platform {
    let p = this.platforms.get(floor);
    if (!p) {
      p = platformForFloor(floor, this.seed);
      this.platforms.set(floor, p);
    }
    return p;
  }

  private nearbyPlatforms(): Platform[] {
    const here = Math.floor(-this.player.y / TUNING.floorSpacing);
    const out: Platform[] = [];
    for (let f = Math.max(0, here - 2); f <= here + 6; f++) out.push(this.platformAt(f));
    return out;
  }

  private simulate(dt: number): void {
    const ev = stepPlayer(this.player, this.readInput(), this.nearbyPlatforms(), dt);
    if (ev.landedFloor !== null) {
      this.highestFloor = Math.max(this.highestFloor, ev.landedFloor);
      this.applyCombo(onLand(this.combo, ev.landedFloor));
    }
    this.applyCombo(tickCombo(this.combo, dt));

    if (updateScroll(this.scroll, dt, this.highestFloor).levelUp) this.hud.flashHurry();
    this.cameraTop -= this.scroll.speed * dt;
    const followTop = this.player.y - TUNING.playerHeight - VIEW.height * TUNING.followTopFraction;
    if (followTop < this.cameraTop) this.cameraTop = followTop;

    this.spin = this.combo.jumps > 0 && !this.player.onGround ? this.spin + dt * 14 : 0;

    if (this.player.y - TUNING.playerHeight > this.cameraTop + VIEW.height) this.gameOver();
  }

  private applyCombo(r: ComboResult | null): void {
    if (!r) return;
    this.comboPoints += r.bonus;
    this.bestCombo = Math.max(this.bestCombo, r.floors);
    this.hud.popCombo(r);
  }

  private gameOver(): void {
    this.over = true;
    this.applyCombo(finishCombo(this.combo));
    this.cameras.main.shake(250, 0.01);
    const data = { score: this.score, floor: this.highestFloor, bestCombo: this.bestCombo };
    this.time.delayedCall(700, () => this.scene.start('gameover', data));
  }

  private draw(): void {
    const cam = this.cameras.main;
    cam.scrollY = this.cameraTop;
    const theme = themeFor(themeIndexForFloor(this.highestFloor));
    cam.setBackgroundColor(theme.bg);

    const g = this.worldGfx;
    g.clear();
    drawWalls(g, this.cameraTop, theme);

    const bottom = Math.max(0, Math.floor(-(this.cameraTop + VIEW.height) / TUNING.floorSpacing) - 1);
    const top = Math.ceil(-this.cameraTop / TUNING.floorSpacing) + 1;
    for (let f = bottom; f <= top; f++) {
      const p = this.platformAt(f);
      const pTheme = themeFor(themeIndexForFloor(f));
      drawPlatform(g, p, pTheme);
      if (f > 0 && f % 10 === 0 && !this.labels.has(f)) {
        const label = this.add
          .text((p.x1 + p.x2) / 2, p.y + TUNING.platformThickness / 2, String(f), {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: pTheme.label,
          })
          .setOrigin(0.5)
          .setDepth(1);
        this.labels.set(f, label);
      }
    }
    for (const [f, label] of this.labels) {
      if (f < bottom - 1) {
        label.destroy();
        this.labels.delete(f);
      }
    }
    for (const f of this.platforms.keys()) if (f < bottom - 10) this.platforms.delete(f);

    const p = this.player;
    this.sprite.setPosition(p.x, p.y - 20);
    if (p.vx < -1) this.sprite.setFlipX(true);
    else if (p.vx > 1) this.sprite.setFlipX(false);
    this.sprite.setRotation(this.sprite.flipX ? -this.spin : this.spin);

    this.hud.update({
      score: this.score,
      floor: this.highestFloor,
      comboJumps: this.combo.jumps,
      comboFloors: this.combo.floors,
      comboTimeLeft: comboTimeFraction(this.combo.timer),
      clock: clockFraction(this.scroll),
      level: this.scroll.level,
    });
  }
}
