import Phaser from 'phaser';
import { TUNING, VIEW } from '../config/tuning';
import { textStyle } from '../render/hud';
import { makeTextures, TEX } from '../render/textures';
import { THEMES } from '../render/themes';
import { drawPlatform, drawWalls } from '../render/world';
import { loadBest, saveBest } from '../storage';

/** Generates procedural textures once, then hands off to the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }
  create(): void {
    makeTextures(this);
    this.scene.start('menu');
  }
}

function backdrop(scene: Phaser.Scene): void {
  const theme = THEMES[0];
  scene.cameras.main.setBackgroundColor(theme.bg);
  const g = scene.add.graphics();
  drawWalls(g, 0, theme);
  const w = TUNING.wallRight - TUNING.wallLeft;
  drawPlatform(g, { floor: 0, y: VIEW.height - 60, x1: TUNING.wallLeft, x2: TUNING.wallRight }, theme);
  drawPlatform(g, { floor: 1, y: VIEW.height - 190, x1: TUNING.wallLeft + w * 0.55, x2: TUNING.wallLeft + w * 0.95 }, theme);
  drawPlatform(g, { floor: 2, y: VIEW.height - 320, x1: TUNING.wallLeft + w * 0.08, x2: TUNING.wallLeft + w * 0.45 }, theme);
}

/** Wait a beat before accepting input, so a held key from the previous run doesn't skip the screen. */
function onFreshPress(scene: Phaser.Scene, key: string, fn: () => void): void {
  scene.time.delayedCall(350, () => scene.input.keyboard!.once(`keydown-${key}`, fn));
}

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }
  create(): void {
    backdrop(this);
    const cx = VIEW.width / 2;
    this.add.text(cx, 120, 'SUMMIT HOP', textStyle(48, '#ffd166')).setOrigin(0.5);
    this.add
      .text(cx, 190, '← → run    SPACE / ↑ jump', textStyle(18))
      .setOrigin(0.5);
    this.add
      .text(cx, 250, 'Run fast before jumping to leap higher.\nBounce off walls to keep your speed.\nSkip 2+ floors per jump to chain combos.', {
        ...textStyle(15, '#cfe3ff'),
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);
    this.add.text(cx, 330, `BEST ${loadBest()}`, textStyle(20)).setOrigin(0.5);

    const hopper = this.add.image(cx, VIEW.height - 80, TEX.hopper);
    this.tweens.add({ targets: hopper, y: hopper.y - 70, yoyo: true, repeat: -1, duration: 420, ease: 'Quad.easeOut' });

    const prompt = this.add.text(cx, 400, 'PRESS SPACE', textStyle(24)).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, yoyo: true, repeat: -1, duration: 600 });
    onFreshPress(this, 'SPACE', () => this.scene.start('game'));
  }
}

export interface GameOverData {
  score: number;
  floor: number;
  bestCombo: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('gameover');
  }
  create(data: GameOverData): void {
    backdrop(this);
    const isBest = saveBest(data.score);
    const cx = VIEW.width / 2;
    this.add.text(cx, 130, 'YOU FELL!', textStyle(44, '#ff6b6b')).setOrigin(0.5);
    this.add
      .text(cx, 230, `SCORE ${data.score}\nFLOOR ${data.floor}\nBEST COMBO ${data.bestCombo} floors`, {
        ...textStyle(22),
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 320, isBest ? 'NEW BEST!' : `BEST ${loadBest()}`, textStyle(22, '#ffd166'))
      .setOrigin(0.5);
    this.add.text(cx, 400, 'SPACE retry    ESC menu', textStyle(18)).setOrigin(0.5);
    onFreshPress(this, 'SPACE', () => this.scene.start('game'));
    onFreshPress(this, 'ESC', () => this.scene.start('menu'));
  }
}
